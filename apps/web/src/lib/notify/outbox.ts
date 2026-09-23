import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isEmailConfigured, sendMessage, type SendFailureReason } from "@/lib/email/client";
import { contactForUser } from "@/lib/email/recipients";
import type { Database } from "@/lib/supabase/database.types";
import {
  templateFor,
  type EnquiryFacts,
  type ListingFacts,
  type Payload,
  type TemplateLookups,
  type TemplateNeeds,
  type WithdrawalFacts,
} from "./templates";
import type { SignupRole, VerificationRung } from "@/lib/email/messages";

/**
 * THE DRAIN. The half of the junction that runs outside the database.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS IS FOR, IN ONE PARAGRAPH.
 *
 * `announce()` next door joins the two channels for an event a server action
 * can see. This joins them for an event only the DATABASE can see, which is
 * most of them: an escrow state moved by a pg_cron sweep, a withdrawal settled
 * by the reconciliation, a password changed inside GoTrue, a session minted by
 * an OAuth callback. A trigger writes a row into `public.email_outbox` in the
 * same transaction as the change, and this reads those rows and sends them.
 *
 * ---------------------------------------------------------------------------
 * THE FOUR PROMISES, AND WHICH LINE KEEPS EACH ONE.
 *
 * IDEMPOTENT. The enqueue side is `on conflict (dedupe_key) do nothing`, so an
 * event is one row however many times a trigger fires for it.
 *
 * NEVER TWICE ON THE WIRE. `email_outbox_claim` moves a row from PENDING to
 * SENDING in one UPDATE with `for update skip locked`, so a row is handed to
 * exactly one worker, once. Two drains overlapping, which Vercel Cron and a
 * hand-run both make possible, cannot both hold the same row. Nothing here
 * ever returns a SENDING row to the queue on a timer, because that is the one
 * mechanism that could put a second copy of an email in somebody's inbox: a
 * worker that sent and then died would have its row handed to the next one. A
 * row stuck in SENDING is reported to the desk and left for a person.
 *
 * NEVER LOST. A send that comes back refused is settled as `retry`: the row
 * returns to PENDING with a backoff and one more attempt on the clock. Resend
 * unreachable for an hour costs an hour, not an email. Only after
 * `MAX_ATTEMPTS` does a row go terminal, as FAILED, which raises.
 *
 * OBSERVABLE. Every run reports counts through `lib/cron/report.ts`, and the
 * job verdict turns a queue that is filling, stuck or dead into an alert on
 * the desk. A queue nobody is draining is the failure this shape invites, and
 * it is exactly the shape of the reconciliation that was dead for three weeks
 * while its scheduler reported success every hour.
 *
 * ---------------------------------------------------------------------------
 * THE ADDRESS IS RESOLVED HERE AND NOWHERE ELSE.
 *
 * `junction.ts` promise 4 is that an address is never supplied by a caller,
 * because a function that accepts one will eventually be handed one from a
 * form. A queue is a caller too, and a queue row is a caller that persists. So
 * the outbox carries `user_id` and this module resolves the address through
 * `lib/email/recipients.ts` with the service role, at send time, exactly as
 * `announce` does. A row leaked out of the table gives up no address.
 *
 * ---------------------------------------------------------------------------
 * THE CHANNEL MUTE IS THE TEMPLATE'S OWN DECISION, NOT THIS MODULE'S.
 *
 * `contactForUser` takes an optional channel and honours the switches on
 * `/settings`. This passes whatever the template declares, which for almost
 * every one of them is nothing: a security obligation, a receipt for money
 * that moved and the state of an agreement somebody is a party to are none of
 * the four channels that screen offers, and muting them would silence a
 * message the product has promised to send. `listing.new_enquiry` declares
 * `messages`, because an enquiry is a message and that card says in as many
 * words that the switch stops message email.
 */

type AdminClient = SupabaseClient<Database>;

/** How many rows one run takes. Comfortably under Resend's rate limit. */
export const DRAIN_BATCH = 50;

/**
 * How many times one email is attempted before it is somebody's problem.
 *
 * Five, spread over the backoff below, is a little under two hours of trying.
 * Longer than any Resend incident this project has seen and short enough that
 * a genuinely undeliverable row is on the desk the same working day rather
 * than retrying quietly for a week.
 */
export const MAX_ATTEMPTS = 5;

/**
 * The wait before the next attempt, by how many have already failed.
 *
 * Deliberately not exponential past ten minutes. The failures this actually
 * meets are a rate limit, a brief outage and a bad key, and the first two
 * clear in minutes while the third never clears at all. An hour-long backoff
 * would only delay the moment a person is told about the third.
 */
export function backoffSeconds(attempts: number): number {
  const table = [60, 300, 900, 1800];
  return table[Math.min(Math.max(attempts, 1), table.length) - 1] ?? 1800;
}

/** A row as the claim hands it back. */
export type OutboxRow = {
  id: string;
  template: string;
  user_id: string;
  payload: Payload;
  attempts: number;
};

/** What one run did. Every number here lands in the audit row. */
export type DrainCounts = {
  /** Rows taken out of PENDING by this run. */
  claimed: number;
  /** Rows Resend accepted. */
  sent: number;
  /** Rows refused and put back for another go. */
  retried: number;
  /** Rows that ran out of attempts and are now terminal. */
  failed: number;
  /** Rows that can never be sent: no template, no address, no message. */
  dropped: number;
};

/** What the queue looks like after the run, as `email_outbox_health` reports. */
export type OutboxHealth = {
  pending: number;
  due: number;
  inFlight: number;
  /** Claimed and never settled. Never retried automatically; see the head. */
  stuck: number;
  failed: number;
  oldestDueSeconds: number;
};

export type DrainResult = {
  counts: DrainCounts;
  health: OutboxHealth;
  /**
   * True when nothing was attempted because this deployment has no Resend key.
   *
   * Not an error and not a failure: a preview deployment with no key should
   * leave the queue alone rather than claim rows it cannot send and burn their
   * attempts. It IS reported, because a PRODUCTION deployment in this state is
   * a platform that has quietly stopped emailing anybody.
   */
  unconfigured: boolean;
};

const EMPTY_COUNTS: DrainCounts = { claimed: 0, sent: 0, retried: 0, failed: 0, dropped: 0 };

const EMPTY_HEALTH: OutboxHealth = {
  pending: 0,
  due: 0,
  inFlight: 0,
  stuck: 0,
  failed: 0,
  oldestDueSeconds: 0,
};

/*
 * The four functions are newer than the generated database types, exactly as
 * `lib/cron/rpc.ts` and `lib/security/service-rpc.ts` describe for their own.
 * The call shape is fixed here and nowhere else, and every answer is narrowed
 * below rather than trusted.
 */
type RpcCaller = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message?: string | null } | null }>;
};
const loose = (client: AdminClient) => client as unknown as RpcCaller;

/* ------------------------------------------------------------------ claim */

/** Take up to `limit` due rows. Throws, so a run that cannot claim fails. */
export async function claimOutboxRows(admin: AdminClient, limit: number): Promise<OutboxRow[]> {
  const { data, error } = await loose(admin).rpc("email_outbox_claim", { p_limit: limit });
  if (error) throw new Error(`email_outbox_claim: ${error.message ?? "rpc error"}`);
  if (!Array.isArray(data)) return [];
  return data.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const row = raw as Record<string, unknown>;
    const id = typeof row["id"] === "string" ? row["id"] : null;
    const template = typeof row["template"] === "string" ? row["template"] : null;
    const userId = typeof row["user_id"] === "string" ? row["user_id"] : null;
    if (!id || !template || !userId) return [];
    const payload =
      row["payload"] && typeof row["payload"] === "object" && !Array.isArray(row["payload"])
        ? (row["payload"] as Payload)
        : {};
    const attempts = typeof row["attempts"] === "number" ? row["attempts"] : 1;
    return [{ id, template, user_id: userId, payload, attempts }];
  });
}

/* ----------------------------------------------------------------- settle */

export type Settlement = "sent" | "retry" | "drop";

/**
 * Close one claimed row.
 *
 * Never throws. A settle that cannot reach the database leaves the row in
 * SENDING, which the health read then reports as stuck, which is the correct
 * and visible outcome: the alternative is guessing, and a guess here is a
 * second email.
 */
export async function settleOutboxRow(
  admin: AdminClient,
  row: OutboxRow,
  result: Settlement,
  error: string | null,
): Promise<string | null> {
  try {
    const { data } = await loose(admin).rpc("email_outbox_settle", {
      p_id: row.id,
      p_result: result,
      p_error: error,
      p_retry_seconds: backoffSeconds(row.attempts),
      p_max_attempts: MAX_ATTEMPTS,
    });
    return typeof data === "string" ? data : null;
  } catch {
    return null;
  }
}

/* ----------------------------------------------------------------- health */

export async function readOutboxHealth(admin: AdminClient): Promise<OutboxHealth> {
  try {
    const { data, error } = await loose(admin).rpc("email_outbox_health", {});
    if (error || !data || typeof data !== "object") return EMPTY_HEALTH;
    const row = data as Record<string, unknown>;
    const count = (key: string): number => {
      const value = row[key];
      if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
      if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
      return 0;
    };
    return {
      pending: count("pending"),
      due: count("due"),
      inFlight: count("in_flight"),
      stuck: count("stuck"),
      failed: count("failed"),
      oldestDueSeconds: count("oldest_due_seconds"),
    };
  } catch {
    return EMPTY_HEALTH;
  }
}

/* ---------------------------------------------------------------- lookups */

/** Everything a batch of rows asked for, gathered before any of them is built. */
export type BatchFacts = {
  names: Map<string, string>;
  /** What an account declared it came here for. Absent is an ordinary state. */
  roles: Map<string, SignupRole>;
  listings: Map<string, ListingFacts>;
  withdrawals: Map<string, WithdrawalFacts>;
  rungs: Map<string, VerificationRung[]>;
  enquiries: Map<string, EnquiryFacts>;
};

/** `public.signup_role`, in SQL's own order. A DECLARATION, never a permission. */
const SIGNUP_ROLES: readonly SignupRole[] = ["renter", "buyer", "landlord", "seller", "agent"];

const EMPTY_FACTS = (): BatchFacts => ({
  names: new Map(),
  roles: new Map(),
  listings: new Map(),
  withdrawals: new Map(),
  rungs: new Map(),
  enquiries: new Map(),
});

function mergeNeeds(rows: readonly OutboxRow[]): Required<TemplateNeeds> {
  const users = new Set<string>();
  const listings = new Set<string>();
  const entries = new Set<string>();
  const agents = new Set<string>();
  const messages = new Set<string>();
  for (const row of rows) {
    const template = templateFor(row.template);
    if (!template) continue;
    let needs: TemplateNeeds;
    try {
      needs = template.needs(row.payload, row.user_id);
    } catch {
      continue;
    }
    for (const id of needs.users ?? []) users.add(id);
    for (const id of needs.listings ?? []) listings.add(id);
    for (const id of needs.entries ?? []) entries.add(id);
    for (const id of needs.agents ?? []) agents.add(id);
    for (const id of needs.messages ?? []) messages.add(id);
  }
  return {
    users: [...users],
    listings: [...listings],
    entries: [...entries],
    agents: [...agents],
    messages: [...messages],
  };
}

/**
 * The facts a whole batch needs, in at most four reads.
 *
 * Every one of them is best effort. A name we could not read becomes "the
 * other person", which every escrow builder already handles; a listing we
 * could not read drops the property row. A read that fails must never turn
 * into a retry of an email that is otherwise perfectly sendable, because the
 * retry would fail on the same read and burn the row's five attempts on a
 * missing display name.
 */
export async function gatherFacts(
  admin: AdminClient,
  rows: readonly OutboxRow[],
): Promise<BatchFacts> {
  const needs = mergeNeeds(rows);
  const facts = EMPTY_FACTS();

  if (needs.users.length > 0) {
    try {
      const { data } = await admin
        .from("profiles")
        .select("id, display_name, signup_role")
        .in("id", needs.users);
      for (const row of data ?? []) {
        const name = (row.display_name ?? "").trim();
        if (name.length > 0) facts.names.set(row.id, name);
        /* Narrowed against the five labels rather than trusted, because the
           generated types follow the enum and the welcome picks a document
           from it. A sixth label added in SQL and not here picks the general
           version, which is true of everybody, rather than throwing. */
        const role = row.signup_role;
        if (role && SIGNUP_ROLES.includes(role as SignupRole)) {
          facts.roles.set(row.id, role as SignupRole);
        }
      }
    } catch {
      /* Nameless is a sentence every builder can say. */
    }
  }

  if (needs.listings.length > 0) {
    try {
      const { data } = await admin
        .from("listings")
        .select("id, title, address, area, city")
        .in("id", needs.listings);
      for (const row of data ?? []) {
        const title = (row.title ?? "").trim();
        /* The street line when the listing carries one, otherwise the area
           and city, which is what the listing itself shows a stranger. Never
           an empty row: a blank "Address" reads as "there is no address". */
        const street = (row.address ?? "").trim();
        const locality = [row.area, row.city]
          .map((part) => (part ?? "").trim())
          .filter((part) => part.length > 0)
          .join(", ");
        facts.listings.set(row.id, {
          title: title.length > 0 ? title : null,
          address: street.length > 0 ? street : locality.length > 0 ? locality : null,
        });
      }
    } catch {
      /* No property row rather than an empty one. */
    }
  }

  if (needs.entries.length > 0) {
    try {
      const { data } = await admin
        .from("wallet_entries")
        .select("id, metadata")
        .in("id", needs.entries);
      for (const row of data ?? []) {
        const metadata =
          row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
            ? (row.metadata as Record<string, unknown>)
            : {};
        const bank = typeof metadata["bank_name"] === "string" ? metadata["bank_name"].trim() : "";
        const last4 =
          typeof metadata["account_last4"] === "string" ? metadata["account_last4"].trim() : "";
        /* THERE IS ONE DOOR NOW. The send desk's bank mode was removed on 23
           September and nothing writes `third_party` any more, so every row is
           the withdraw door. `metadata.destination` is deliberately NOT read
           back here: an unrecognised or stale value must never be allowed to
           turn a person's own withdrawal into "you sent money to somebody",
           and the only way to guarantee that is to not consult it. Checked
           against the live table before this was written: both wallet_entries
           rows carry a null destination, so nothing historical is
           mis-described. */
        facts.withdrawals.set(row.id, {
          bankName: bank.length > 0 ? bank : null,
          accountLast4: /^\d{4}$/.test(last4) ? last4 : null,
          destination: "own_account",
        });
      }
    } catch {
      /* The outcome is the message; the destination is a detail on it. */
    }
  }

  if (needs.agents.length > 0) {
    try {
      const { data } = await admin
        .from("agent_verification_checks")
        .select("agent_id, kind, status")
        .in("agent_id", needs.agents)
        .eq("status", "passed");
      for (const row of data ?? []) {
        /* The table's four kinds are not the email's four rungs: `in_person`
           is what the ladder calls an inspection and `payout` climbs nothing.
           The same mapping the trigger makes, restated on the read. */
        const rung: VerificationRung | null =
          row.kind === "identity"
            ? "identity"
            : row.kind === "address"
              ? "address"
              : row.kind === "in_person"
                ? "inspection"
                : null;
        if (!rung) continue;
        const list = facts.rungs.get(row.agent_id) ?? [];
        list.push(rung);
        facts.rungs.set(row.agent_id, list);
      }
    } catch {
      /* Without the ladder we simply do not name the next rung. */
    }
  }

  if (needs.messages.length > 0) {
    try {
      const { data } = await admin
        .from("messages")
        .select("id, conversation_id, body")
        .in("id", needs.messages);
      for (const row of data ?? []) {
        const body = (row.body ?? "").trim();
        if (body.length === 0) continue;
        facts.enquiries.set(row.id, {
          body,
          conversationPath: `/messages/${row.conversation_id}`,
        });
      }
    } catch {
      /* Without the words there is no enquiry email; the bell already said
         that something arrived. */
    }
  }

  return facts;
}

function lookupsFor(facts: BatchFacts): TemplateLookups {
  return {
    userName: (id) => facts.names.get(id) ?? null,
    signupRole: (id) => facts.roles.get(id) ?? null,
    listing: (id) => facts.listings.get(id) ?? null,
    withdrawal: (id) => facts.withdrawals.get(id) ?? null,
    passedRungs: (id) => facts.rungs.get(id) ?? [],
    enquiry: (id) => facts.enquiries.get(id) ?? null,
  };
}

/* ------------------------------------------------------------------ drain */

/**
 * A send, as the drain is allowed to see it.
 *
 * Injected so a test can drive the whole path, including the settle, without a
 * Resend key. The default is the real client and nothing else ever is in
 * production.
 */
export type SendPort = (
  to: string,
  message: { subject: string; html: string; text: string },
) => Promise<{ sent: boolean; reason?: SendFailureReason; status?: number }>;

const realSend: SendPort = async (to, message) => {
  const result = await sendMessage(to, message);
  return result.sent
    ? { sent: true }
    : { sent: false, reason: result.reason, ...(result.status ? { status: result.status } : {}) };
};

export type DrainOptions = {
  limit?: number;
  send?: SendPort;
  /** Overridden only by a test that needs the unconfigured branch either way. */
  configured?: boolean;
};

/**
 * Take the due rows and send them. Never throws except when the CLAIM fails,
 * because a claim that fails means the run did not happen and the scheduler's
 * dashboard must say so rather than reporting a clean run over nothing.
 */
export async function drainEmailOutbox(
  admin: AdminClient,
  options: DrainOptions = {},
): Promise<DrainResult> {
  const configured = options.configured ?? isEmailConfigured();
  if (!configured) {
    /* Claim nothing. A row claimed here would burn an attempt on a send that
       was never going to leave the process, and five preview deploys would
       exhaust a real person's email before production ever saw it. */
    return { counts: { ...EMPTY_COUNTS }, health: await readOutboxHealth(admin), unconfigured: true };
  }

  const send = options.send ?? realSend;
  const rows = await claimOutboxRows(admin, options.limit ?? DRAIN_BATCH);
  const counts: DrainCounts = { ...EMPTY_COUNTS, claimed: rows.length };

  if (rows.length === 0) {
    return { counts, health: await readOutboxHealth(admin), unconfigured: false };
  }

  const facts = await gatherFacts(admin, rows);
  const lookups = lookupsFor(facts);

  for (const row of rows) {
    const outcome = await deliverOne(admin, row, lookups, send);
    if (outcome === "sent") counts.sent += 1;
    else if (outcome === "dropped") counts.dropped += 1;
    else if (outcome === "failed") counts.failed += 1;
    else counts.retried += 1;
  }

  return { counts, health: await readOutboxHealth(admin), unconfigured: false };
}

type DeliveryOutcome = "sent" | "retried" | "failed" | "dropped";

/**
 * One row: build it, resolve the address, send it, settle it.
 *
 * The order matters and it is the opposite of the obvious one. THE MESSAGE IS
 * BUILT BEFORE THE ADDRESS IS LOOKED UP, because a template that cannot build
 * is a permanent condition and a `getUserById` that fails is a transient one.
 * Building first means a malformed payload is dropped on its first attempt
 * instead of retried five times, and a GoTrue blip is retried instead of
 * dropped. Getting this round the wrong way is how a queue fills with rows
 * that will never send and hides the one row that would have.
 */
async function deliverOne(
  admin: AdminClient,
  row: OutboxRow,
  lookups: TemplateLookups,
  send: SendPort,
): Promise<DeliveryOutcome> {
  const template = templateFor(row.template);
  if (!template) {
    /* A trigger wrote a template this build does not have. Dropping rather
       than retrying is right: five more attempts will not grow the registry.
       `templates.test.ts` holds the two lists equal so this is a deploy skew
       rather than a permanent hole. */
    await settleOutboxRow(admin, row, "drop", `no template: ${row.template}`.slice(0, 200));
    return "dropped";
  }

  /* The template decides whether a /settings switch applies; see the head. */
  const contact = await contactForUser(admin, row.user_id, template.channel);
  if (!contact) {
    /*
     * Nobody to send to. The account was deleted, the address is gone, or
     * this template answers to a switch and the person turned it off.
     * Terminal rather than transient in all three: `contactForUser` swallows
     * its own errors and answers null for every one of them, so this cannot
     * tell them apart, and the honest reading of "no address" for a queue is
     * that there is nobody at the other end who wants it. The row is kept,
     * with the reason on it.
     */
    await settleOutboxRow(admin, row, "drop", "no contact for recipient");
    return "dropped";
  }

  let message: { subject: string; html: string; text: string } | null;
  try {
    message = template.build(row.payload, {
      recipientId: row.user_id,
      recipient: { name: contact.name },
      lookups,
    });
  } catch (error) {
    /* A builder that threw on this payload will throw on it again. */
    const reason = error instanceof Error ? error.message : "builder threw";
    await settleOutboxRow(admin, row, "drop", `build failed: ${reason}`.slice(0, 200));
    return "dropped";
  }

  if (!message) {
    await settleOutboxRow(admin, row, "drop", "payload does not make a message");
    return "dropped";
  }

  let result: Awaited<ReturnType<SendPort>>;
  try {
    result = await send(contact.email, message);
  } catch {
    /* The client is documented never to throw. If it ever does, that is a
       transient condition by definition and the row goes back. */
    result = { sent: false, reason: "unreachable" };
  }

  if (result.sent) {
    await settleOutboxRow(admin, row, "sent", null);
    return "sent";
  }

  if (result.reason === "invalid-recipient") {
    /* The address in the auth record is not an address. Retrying it five
       times changes nothing about it. */
    await settleOutboxRow(admin, row, "drop", "invalid recipient address");
    return "dropped";
  }

  /* NEVER THE ADDRESS AND NEVER THE SUBJECT, HERE OR IN THE COLUMN. A reason
     code from Resend and an HTTP status, which carry no personal datum. */
  const note = `${result.reason ?? "unknown"}${result.status ? ` ${result.status}` : ""}`;
  const settled = await settleOutboxRow(admin, row, "retry", note);
  return settled === "FAILED" ? "failed" : "retried";
}
