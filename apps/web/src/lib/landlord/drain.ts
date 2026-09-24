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
 * token and a reply code per question and hands each back once, this sends,
 * and `landlord_line_record` writes what the transport said.
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
 * CLAIMS the question (`landlord_line_claim`) immediately before the send, so
 * a STOP that arrived between issue and send is honoured. A refused question
 * is recorded as not delivered, which returns it to unsent, where the next
 * issue deletes it. A delivered message whose log write fails is counted as
 * `unlogged` and raised by the job as critical.
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
  listerName: string | null;
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
    listerName: str(row.lister_name),
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
    return composeVacancyMessage(deps.copy, { place: ask.place, agent: ask.listerName, code: ask.replyCode, link });
  }
  if (ask.totalMinor === null) return null;
  return composeRentMessage(deps.copy, {
    place: ask.place,
    agent: ask.listerName,
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

  /* A question marked sent an hour ago with nothing logged never reached
     anybody (a run that died between issue and record): back to the queue. */
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
      result.refused += 1;
      await callLandlordRpc(deps.db, "landlord_line_record", {
        p_ask: ask.askId,
        p_channel: deps.channel.name,
        p_body: "",
        p_ref: null,
        p_delivered: false,
      });
      continue;
    }

    /* Claim, immediately before the send: the consent, the approval, the
       expiry and the flag, read again now rather than when it was issued. */
    const claim = await callLandlordRpc(deps.db, "landlord_line_claim", { p_ask: ask.askId });
    if (claim.error || claim.data !== true) {
      result.refused += 1;
      await callLandlordRpc(deps.db, "landlord_line_record", {
        p_ask: ask.askId,
        p_channel: deps.channel.name,
        p_body: "",
        p_ref: null,
        p_delivered: false,
      });
      continue;
    }

    let outcome: Awaited<ReturnType<PrincipalChannel["send"]>>;
    try {
      outcome = await deps.channel.send({ askId: ask.askId, to: ask.phone, body });
    } catch {
      outcome = { ok: false, reason: "transport threw" };
    }

    const logged = await callLandlordRpc(deps.db, "landlord_line_record", {
      p_ask: ask.askId,
      p_channel: deps.channel.name,
      p_body: redactToken(body),
      p_ref: outcome.ok ? outcome.ref : null,
      p_delivered: outcome.ok,
    });
    if (outcome.ok) result.sent += 1;
    else result.failed += 1;
    /* A delivered message that is not on the record is the one thing this job
       must shout about: the landlord was messaged and the log does not say so. */
    if (logged.error && outcome.ok) result.unlogged += 1;
  }

  return result;
}
