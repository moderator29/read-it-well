import { mayMessagePrincipal, type ConsentState } from "./consent";
import type { PrincipalChannel } from "./channel";
import { composeRentMessage, composeVacancyMessage, redactToken, replyPath, type RentTemplates, type VacancyTemplates } from "./message";
import { callLandlordRpc } from "./rpc";

/**
 * THE LANDLORD LINE'S DRAIN: QUEUE WHAT IS DUE, ISSUE IT, SEND IT, RECORD IT.
 *
 * The shape of `lib/notify/outbox.ts`, for a recipient who is not a user.
 * `landlord_line_enqueue` decides what is due inside the database (the
 * fortnightly question, the question on the day an inspection is confirmed,
 * the rent figures the day a charge is paid), `landlord_line_issue` mints a
 * token and a reply code per question and hands each back once,
 * `landlord_line_begin` writes the log row as "sending" BEFORE the transport is
 * called, and `landlord_line_finish` records what the transport said.
 *
 * ---------------------------------------------------------------------------
 * THE RENT QUESTION IS FOUND, NOT PUSHED. A paid rent charge is picked up by
 * the enqueue reading `rent_payments` beside a SUCCESSFUL transaction, so the
 * settlement path (`settleBookingCharge`, `pay_booking_from_wallet`, both the
 * audit session's under V-33) is not touched at all. The cost is up to fifteen
 * minutes between the payment and the landlord's message, which is well inside
 * "the day a tenant pays".
 *
 * ---------------------------------------------------------------------------
 * THREE CONSENT GATES. The database refuses to create or issue a question for
 * a principal who may not be messaged. The drain checks again, from the
 * consent state `landlord_line_issue` returns beside each question, and then
 * re-checks it inside `landlord_line_begin` immediately before the send, so a
 * STOP that arrived between issue and send is honoured. A question refused
 * before any attempt is released back to unsent, where the next issue deletes
 * it. A question is resent NEVER: a send begun and not finished is marked
 * unknown an hour later and raised, because the landlord may already hold the
 * link. A finish the log refused is counted as `unlogged` and raised by the
 * job as critical.
 *
 * ---------------------------------------------------------------------------
 * NOTHING IDENTIFYING IS LOGGED. The number and the token exist in this
 * function for one send each. The body is stored only through `redactToken`,
 * and the database refuses one that still carries a token.
 */

export type IssuedAsk = {
  askId: string;
  token: string;
  replyCode: string;
  phone: string;
  purpose: "vacancy" | "rent";
  place: string;
  totalMinor: number | null;
  consent: ConsentState;
};

export type DrainCopy = VacancyTemplates & RentTemplates;

export type DrainDeps = {
  db: unknown;
  channel: PrincipalChannel;
  copy: DrainCopy;
  /** The site's origin, no trailing slash. */
  origin: string;
  /** Today in Lagos, YYYY-MM-DD. */
  today: string;
  formatTotal: (minor: number) => string;
  limit?: number;
};

export type DrainResult = {
  open: boolean;
  queued: { fortnightly: number; inspectionConfirmed: number; rentPaid: number };
  issued: number;
  sent: number;
  failed: number;
  refused: number;
  /** Sends whose log write failed: delivered, but not on the record. */
  unlogged: number;
  transport: PrincipalChannel["name"];
  error: string | null;
};

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Read one `landlord_line_issue` row, or null when it is not one. */
export function readIssuedAsk(raw: unknown): IssuedAsk | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const askId = str(row.ask_id);
  const token = str(row.token);
  const replyCode = str(row.reply_code);
  const phone = str(row.principal_phone);
  const purpose = row.purpose === "vacancy" || row.purpose === "rent" ? row.purpose : null;
  const place = str(row.place);
  if (!askId || !token || !replyCode || !phone || !purpose || !place) return null;
  const status = row.review_status;
  return {
    askId,
    token,
    replyCode,
    phone,
    purpose,
    place,
    totalMinor: typeof row.total_minor === "number" ? row.total_minor : null,
    consent: {
      reviewStatus: status === "approved" || status === "rejected" ? status : "pending",
      hasNumber: true,
      consentedAt: str(row.consented_at),
      withdrawnAt: str(row.withdrawn_at),
      expiresOn: str(row.expires_on),
      isDemo: row.is_demo === true,
    },
  };
}

/** The message body for one issued question. */
export function bodyFor(ask: IssuedAsk, deps: Pick<DrainDeps, "copy" | "origin" | "formatTotal">): string | null {
  const link = `${deps.origin}${replyPath(ask.token)}`;
  if (ask.purpose === "vacancy") {
    return composeVacancyMessage(deps.copy, { place: ask.place, code: ask.replyCode, link });
  }
  if (ask.totalMinor === null) return null;
  return composeRentMessage(deps.copy, {
    place: ask.place,
    total: deps.formatTotal(ask.totalMinor),
    code: ask.replyCode,
    link,
  });
}

export async function drainLandlordLine(deps: DrainDeps): Promise<DrainResult> {
  const result: DrainResult = {
    open: false,
    queued: { fortnightly: 0, inspectionConfirmed: 0, rentPaid: 0 },
    issued: 0,
    sent: 0,
    failed: 0,
    refused: 0,
    unlogged: 0,
    transport: deps.channel.name,
    error: null,
  };

  /* A question issued an hour ago with no attempt logged never reached anybody
     (a run that died between issue and begin): back to the queue. A send that
     was begun and never finished is marked unknown and raised, never resent. */
  await callLandlordRpc(deps.db, "landlord_line_requeue", {});

  const queued = await callLandlordRpc(deps.db, "landlord_line_enqueue", {});
  if (queued.error) {
    result.error = `enqueue: ${queued.error.message ?? queued.error.code ?? "failed"}`;
    return result;
  }
  const q = (queued.data ?? {}) as Record<string, unknown>;
  if (q.open !== true) return result;
  result.open = true;
  result.queued = {
    fortnightly: num(q.fortnightly),
    inspectionConfirmed: num(q.inspection_confirmed),
    rentPaid: num(q.rent_paid),
  };

  const issued = await callLandlordRpc(deps.db, "landlord_line_issue", { p_limit: deps.limit ?? 50 });
  if (issued.error) {
    result.error = `issue: ${issued.error.message ?? issued.error.code ?? "failed"}`;
    return result;
  }

  for (const raw of Array.isArray(issued.data) ? issued.data : []) {
    const ask = readIssuedAsk(raw);
    if (!ask) continue;
    result.issued += 1;

    const body = mayMessagePrincipal(ask.consent, deps.today) ? bodyFor(ask, deps) : null;
    if (body === null) {
      /* Never attempted, so it may safely go back to the queue; the next issue
         drops it if the principal still may not be messaged. */
      result.refused += 1;
      await callLandlordRpc(deps.db, "landlord_line_release", { p_ask: ask.askId });
      continue;
    }

    /* LOGGED BEFORE IT IS SENT. `begin` re-reads the consent, the approval,
       the expiry and the flag now, and writes the log row as "sending" in the
       same statement; a null answer means do not send. */
    const begun = await callLandlordRpc(deps.db, "landlord_line_begin", {
      p_ask: ask.askId,
      p_channel: deps.channel.name,
      p_body: redactToken(body),
    });
    const messageId = typeof begun.data === "string" ? begun.data : null;
    if (begun.error || !messageId) {
      result.refused += 1;
      if (!begun.error) await callLandlordRpc(deps.db, "landlord_line_release", { p_ask: ask.askId });
      continue;
    }

    let outcome: Awaited<ReturnType<PrincipalChannel["send"]>>;
    try {
      outcome = await deps.channel.send({ askId: ask.askId, to: ask.phone, body });
    } catch {
      outcome = { ok: false, reason: "transport threw" };
    }

    const finished = await callLandlordRpc(deps.db, "landlord_line_finish", {
      p_message: messageId,
      p_delivered: outcome.ok,
      p_ref: outcome.ok ? outcome.ref : null,
    });
    if (outcome.ok) result.sent += 1;
    else result.failed += 1;
    /* A message the log could not finish stays "sending"; an hour later the
       database marks it unknown and raises it. It is never resent. */
    if (finished.error) result.unlogged += 1;
  }

  return result;
}
