import {
  heldPaymentDisputed,
  heldPaymentPaidOut,
  heldPaymentPayoutAsked,
  heldPaymentProposed,
  heldPaymentReturned,
  heldPaymentRuling,
  heldPaymentSetAside,
  heldPaymentWithdrawn,
  type EscrowEmailBase,
} from "../email/escrow-messages";
import {
  inspectionScheduled,
  newDeviceSignIn,
  newEnquiry,
  passwordChanged,
  verificationRungPassed,
  withdrawalOutcome,
  type EmailMessage,
  type VerificationRung,
  type WithdrawalOutcome,
} from "../email/messages";
import type { EmailChannel } from "../email/recipients";
import type { EscrowPurpose } from "../escrow/copy";

/**
 * WHAT A ROW IN THE OUTBOX MEANS, AND THE ONLY PLACE THAT DECIDES.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS MODULE IS PURE, WHICH IS THE WHOLE POINT OF IT.
 *
 * Nine builders sat unreachable under a passing suite for weeks. The suite was
 * not weak: it rendered every one of them, asserted their subjects, walked
 * their blocks. What it could not do was tell anybody whether a person would
 * ever receive one, because a test that a builder exists and a test that a
 * builder is reached are different tests and only the first one was being
 * written.
 *
 * So the registry below is a VALUE, not a switch statement inside the drain.
 * Every template is an entry in one object, keyed by exactly the string a
 * database trigger writes into `email_outbox.template`. That makes two things
 * checkable that were not checkable before:
 *
 *   EVERY TEMPLATE A TRIGGER CAN WRITE HAS AN ENTRY. The test walks the keys
 *   against the list of templates the migrations enqueue, and a trigger that
 *   writes a template nobody built fails the suite rather than filling the
 *   dead-letter column in production.
 *
 *   EVERY ENTRY RENDERS A REAL MESSAGE FROM A REAL PAYLOAD. The test drives
 *   `build` with the exact payload shape the trigger writes, and asserts on the
 *   subject and the body that come out, not on the existence of a function.
 *
 * There is no Supabase client in this file and there must never be one. The
 * drain does the reading; this decides what the words are.
 *
 * ---------------------------------------------------------------------------
 * TWO PHASES, AND WHY THE READS ARE DECLARED RATHER THAN PERFORMED.
 *
 * Several of these messages need a fact the queue deliberately does not carry:
 * the counterparty's name, the property's title and address, which bank a
 * withdrawal went to. Those are facts about a person, and the outbox holds ids
 * so that a row read out of it describes an event without describing anybody.
 *
 * A template therefore DECLARES what it needs (`needs`) and the drain gathers
 * all of it for the whole batch in a handful of queries, then hands each
 * template a set of lookups. Fifty rows is four reads, not a hundred. A
 * template that asks for a fact the drain could not find gets null from the
 * lookup and says something true without it, which every builder here already
 * supports: "the other person" rather than a name, no property row rather than
 * an empty one.
 */

/** The reader, as `lib/email/recipients.ts` resolves them. Never an address. */
export type TemplateRecipient = {
  /** Their display name, when we have one worth greeting them by. */
  name: string | null;
};

/** A property, as an email prints it. */
export type ListingFacts = {
  title: string | null;
  address: string | null;
};

/** What somebody wrote, and where the reply goes. */
export type EnquiryFacts = {
  /** Their words, as they wrote them. Truncated by the builder, never edited. */
  body: string | null;
  /** Where in the application the reply is written. */
  conversationPath: string;
};

/** Where a withdrawal went, in the vocabulary rule 16 allows. */
export type WithdrawalFacts = {
  bankName: string | null;
  /** Four digits of a CARD only. A bank account gets none; see below. */
  accountLast4: string | null;
};

/** What the drain must read before a batch of rows can be built. */
export type TemplateNeeds = {
  /** Display names for these accounts. */
  users?: readonly string[];
  /** Title and address for these listings. */
  listings?: readonly string[];
  /** Bank and destination for these wallet entries. */
  entries?: readonly string[];
  /** Which verification rungs these agents have passed. */
  agents?: readonly string[];
  /** The words in these messages. */
  messages?: readonly string[];
};

/** What the drain hands back, once it has read it. */
export type TemplateLookups = {
  userName: (id: string) => string | null;
  listing: (id: string) => ListingFacts | null;
  withdrawal: (id: string) => WithdrawalFacts | null;
  /** The `agent_verification_checks.kind` values at `passed`, mapped to rungs. */
  passedRungs: (agentId: string) => readonly VerificationRung[];
  enquiry: (messageId: string) => EnquiryFacts | null;
};

export type TemplateContext = {
  /**
   * The account this row belongs to.
   *
   * Present so a template can answer "was it you", which three of the escrow
   * messages turn on: `raisedByYou` and `withdrawnByYou` are the difference
   * between "we have your objection" and "the other person has objected", and
   * getting them the wrong way round would tell somebody they did a thing they
   * did not do. Never an address: the address is the drain's business and
   * never reaches this module.
   */
  recipientId: string;
  recipient: TemplateRecipient;
  lookups: TemplateLookups;
};

export type OutboxTemplate = {
  /**
   * The /settings switch this template answers to, when it answers to one.
   *
   * ALMOST NOTHING HERE DOES, and that is the decision rather than an
   * omission. A security notice, a receipt for money that moved and the state
   * of an agreement somebody is a party to are none of the four channels that
   * screen offers, and honouring a mute for them would silence a message the
   * product has promised to send. `listing.new_enquiry` is the exception: an
   * enquiry IS a message, the Messages switch says in as many words that
   * turning it off stops message email, and a promise on a settings card that
   * the code quietly ignores is worse than no switch.
   */
  channel?: EmailChannel;
  /** The ids this template needs looked up, read off its own payload. */
  needs: (payload: Payload) => TemplateNeeds;
  /**
   * The message, or null when this payload cannot make one.
   *
   * Null is not an error and is not a retry. It means the event is real and
   * there is no honest email for it, which the drain records as DROPPED rather
   * than queueing five more attempts at the same impossibility.
   */
  build: (payload: Payload, context: TemplateContext) => EmailMessage | null;
};

export type Payload = Record<string, unknown>;

/* -------------------------------------------------------------- payload reads */

/*
 * A jsonb payload is untyped by the time it reaches here, and it arrived from
 * a trigger rather than from a caller, so these are narrowing rather than
 * validation. Each one answers with null instead of throwing: a malformed
 * payload should cost one email and a line in `last_error`, never a drain.
 */

function str(payload: Payload, key: string): string | null {
  const value = payload[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function num(payload: Payload, key: string): number | null {
  const value = payload[key];
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  /* Postgres sends a bigint over PostgREST as a JSON number, but a jsonb
     round trip through a client that widens it can arrive as a string. Money
     is integer kobo and must not become NaN on the way. */
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

function bool(payload: Payload, key: string): boolean {
  return payload[key] === true;
}

function ids(...values: (string | null)[]): string[] {
  return values.filter((value): value is string => typeof value === "string" && value.length > 0);
}

/* ------------------------------------------------------------------- clock */

/**
 * Africa/Lagos, always, on both halves of a security email.
 *
 * `newDeviceSignIn` and `passwordChanged` both document their `date` and
 * `time` as "already resolved to the reader's own time zone by the caller",
 * and this is the caller. We do not know a reader's time zone and will not
 * guess one from a header; this product has one market and the reader is in
 * it, which is the same ruling `lib/security/when.ts` made for the devices
 * screen and for the same reason. A security email whose clock disagrees with
 * the screen beside it is a security email somebody stops trusting on exactly
 * the day they most need to.
 */
const LAGOS = "Africa/Lagos";

function lagosParts(iso: string | null): { date: string | null; time: string | null } {
  if (!iso) return { date: null, time: null };
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return { date: null, time: null };
  try {
    /* en-CA gives YYYY-MM-DD, which is what every builder's `date` expects. */
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: LAGOS,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(at);
    const time = new Intl.DateTimeFormat("en-GB", {
      timeZone: LAGOS,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(at);
    return { date, time };
  } catch {
    return { date: null, time: null };
  }
}

/* ------------------------------------------------------------------ escrow */

const ESCROW_PURPOSES: readonly EscrowPurpose[] = [
  "rent_deposit",
  "first_rent",
  "purchase_deposit",
  "purchase_balance",
  "agency_fee",
];

function purposeOf(payload: Payload): EscrowPurpose | null {
  const raw = str(payload, "purpose");
  return ESCROW_PURPOSES.find((p) => p === raw) ?? null;
}

/** What every escrow builder shares, assembled once from the payload. */
function escrowBase(payload: Payload, context: TemplateContext): (EscrowEmailBase & {
  viewer: "payer" | "payee";
}) | null {
  const id = str(payload, "escrow_id");
  const amountMinor = num(payload, "amount_minor");
  const purpose = purposeOf(payload);
  const viewer = str(payload, "viewer");
  if (!id || amountMinor === null || !purpose) return null;
  if (viewer !== "payer" && viewer !== "payee") return null;

  const counterpartyId = str(payload, "counterparty_id");
  const listingId = str(payload, "listing_id");
  return {
    id,
    amountMinor,
    purpose,
    viewer,
    name: context.recipient.name,
    counterpartyName: counterpartyId ? context.lookups.userName(counterpartyId) : null,
    listingTitle: listingId ? (context.lookups.listing(listingId)?.title ?? null) : null,
  };
}

/** Every escrow template needs the same two lookups off the same two keys. */
function escrowNeeds(payload: Payload): TemplateNeeds {
  return {
    users: ids(str(payload, "counterparty_id")),
    listings: ids(str(payload, "listing_id")),
  };
}

function escrowTemplate(
  render: (
    base: EscrowEmailBase & { viewer: "payer" | "payee" },
    payload: Payload,
    context: TemplateContext,
  ) => EmailMessage | null,
): OutboxTemplate {
  return {
    needs: escrowNeeds,
    build: (payload, context) => {
      const base = escrowBase(payload, context);
      return base ? render(base, payload, context) : null;
    },
  };
}

/* ------------------------------------------------------------- the registry */

/**
 * Every template a trigger can write, and nothing else.
 *
 * The keys are the exact strings the migrations compose. `escrow.<STATE>` is
 * built from the enum label, so the eight entries here are the eight states
 * `ESCROW_EMAIL_STATES` names, and FUNDED is absent from both for the same
 * reason: it lasts a microsecond and announcing it would be announcing our own
 * plumbing.
 */
export const OUTBOX_TEMPLATES: Readonly<Record<string, OutboxTemplate>> = {
  /* --------------------------------------------------------------- escrow */

  "escrow.INITIATED": escrowTemplate((base) => heldPaymentProposed(base)),

  "escrow.HELD": escrowTemplate((base, payload) =>
    heldPaymentSetAside({ ...base, autoReleaseAt: str(payload, "auto_release_at") }),
  ),

  "escrow.RELEASE_REQUESTED": escrowTemplate((base, payload) =>
    heldPaymentPayoutAsked({ ...base, autoReleaseAt: str(payload, "auto_release_at") }),
  ),

  "escrow.RELEASED": escrowTemplate((base, payload) =>
    heldPaymentPaidOut({
      ...base,
      commissionMinor: num(payload, "commission_minor") ?? 0,
      netMinor: num(payload, "net_minor") ?? base.amountMinor,
      automatic: bool(payload, "automatic"),
    }),
  ),

  "escrow.REFUNDED": escrowTemplate((base, payload) =>
    heldPaymentReturned({ ...base, reason: str(payload, "reason") }),
  ),

  "escrow.DISPUTED": escrowTemplate((base, payload, context) => {
    const reason = str(payload, "reason");
    /* The builder requires the words that were filed, and prints them to both
       sides verbatim. Without them there is no message worth sending. */
    if (!reason) return null;
    const raisedBy = str(payload, "raised_by");
    return heldPaymentDisputed({
      ...base,
      reason,
      raisedByYou: raisedBy !== null && raisedBy === context.recipientId,
    });
  }),

  "escrow.RESOLVED": escrowTemplate((base, payload) => {
    const ruling = str(payload, "ruling");
    if (!ruling) return null;
    const direction = str(payload, "direction") === "refund" ? "refund" : "release";
    return heldPaymentRuling({
      ...base,
      direction,
      ruling,
      commissionMinor: num(payload, "commission_minor") ?? 0,
      netMinor: num(payload, "net_minor") ?? base.amountMinor,
    });
  }),

  "escrow.CANCELLED": escrowTemplate((base, payload, context) => {
    const note = str(payload, "note");
    if (!note) return null;
    const actorId = str(payload, "actor_id");
    return heldPaymentWithdrawn({
      ...base,
      note,
      withdrawnByYou: actorId !== null && actorId === context.recipientId,
    });
  }),

  /* ------------------------------------------------------------- security */

  "security.password_changed": {
    needs: () => ({}),
    build: (payload, context) => {
      const when = lagosParts(str(payload, "at"));
      return passwordChanged({
        name: context.recipient.name,
        date: when.date,
        time: when.time,
      });
    },
  },

  "security.new_device_sign_in": {
    needs: () => ({}),
    build: (payload, context) => {
      const when = lagosParts(str(payload, "at"));
      return newDeviceSignIn({
        name: context.recipient.name,
        date: when.date,
        time: when.time,
        /* Already words from a fixed list by the time it was queued, and
           never the raw header. A device we could not name is absent from
           the rows rather than described as "unknown", which reads to a
           person as a finding rather than as a gap. */
        device: str(payload, "device"),
        /*
         * NO PLACE, DELIBERATELY. The builder takes one and the queue has
         * none, because turning an IP into a city needs a geolocation service
         * this platform does not have, and a guess printed beside "was this
         * you" is worse than a blank: somebody in Abuja told the sign-in was
         * from Lagos will either panic about themselves or ignore a real one.
         */
        place: null,
      });
    },
  },

  /* --------------------------------------------------------------- wallet */

  "wallet.withdrawal_outcome": {
    needs: (payload) => ({ entries: ids(str(payload, "entry_id")) }),
    build: (payload, context) => {
      const amountMinor = num(payload, "amount_minor");
      const raw = str(payload, "outcome");
      const outcome: WithdrawalOutcome | null =
        raw === "paid" || raw === "failed" || raw === "reversed" ? raw : null;
      if (amountMinor === null || !outcome) return null;

      const entryId = str(payload, "entry_id");
      const destination = entryId ? context.lookups.withdrawal(entryId) : null;
      return withdrawalOutcome({
        ownerName: context.recipient.name,
        outcome,
        amountMinor,
        bankName: destination?.bankName ?? null,
        accountLast4: destination?.accountLast4 ?? null,
        reference: str(payload, "reference"),
      });
    },
  },

  /* ----------------------------------------------------------- inspection */

  "inspection.scheduled": {
    needs: (payload) => ({
      users: ids(str(payload, "counterparty_id")),
      listings: ids(str(payload, "listing_id")),
    }),
    build: (payload, context) => {
      const rawAudience = str(payload, "audience");
      const audience = rawAudience === "lister" ? "lister" : rawAudience === "viewer" ? "viewer" : null;
      const when = lagosParts(str(payload, "slot_at"));
      const listingId = str(payload, "listing_id");
      const listing = listingId ? context.lookups.listing(listingId) : null;
      /*
       * THE WHOLE MESSAGE IS WHERE TO BE AND WHEN. Without a time there is
       * nothing to send, and without a property there is nothing to name, so
       * either missing means no email rather than an email with a hole in it.
       * Both sides are about to travel across a Nigerian city to meet somebody
       * they have not met; a half-filled one is worse than none.
       */
      if (!audience || !when.date || !when.time || !listing?.title) return null;

      const counterpartyId = str(payload, "counterparty_id");
      return inspectionScheduled({
        audience,
        name: context.recipient.name,
        listingTitle: listing.title,
        /* The address the listing carries, or the title again rather than an
           empty row. A blank "Address" reads as "there is no address". */
        address: listing.address ?? listing.title,
        date: when.date,
        time: when.time,
        otherPartyName: counterpartyId ? context.lookups.userName(counterpartyId) : null,
        /*
         * NO NUMBER. The builder offers a row for it and this does not fill
         * it. A phone number is a personal datum and nobody on this platform
         * has agreed to have theirs posted to the other party's inbox; the
         * conversation in the app is the channel both sides already consented
         * to and the email's button goes to it.
         */
        otherPartyPhone: null,
      });
    },
  },

  /* --------------------------------------------------------- verification */

  /* ------------------------------------------------------------ enquiries */

  "listing.new_enquiry": {
    /* The one template that answers to a switch; see `channel` above. */
    channel: "messages",
    needs: (payload) => ({
      users: ids(str(payload, "enquirer_id")),
      listings: ids(str(payload, "listing_id")),
      messages: ids(str(payload, "message_id")),
    }),
    build: (payload, context) => {
      const listingId = str(payload, "listing_id");
      const listing = listingId ? context.lookups.listing(listingId) : null;
      const messageId = str(payload, "message_id");
      const enquiry = messageId ? context.lookups.enquiry(messageId) : null;
      /*
       * The preview is the whole reason this email is worth more than the
       * in-app row it accompanies: "you have a new message" makes somebody
       * open an application to find out whether it mattered. Without the words
       * or without the property there is nothing here the bell does not
       * already do, so there is no email.
       */
      if (!listing?.title || !enquiry?.body) return null;
      const enquirerId = str(payload, "enquirer_id");
      return newEnquiry({
        listerName: context.recipient.name,
        enquirerName: enquirerId ? context.lookups.userName(enquirerId) : null,
        listingTitle: listing.title,
        preview: enquiry.body,
        conversationPath: enquiry.conversationPath,
      });
    },
  },

  /* --------------------------------------------------------- verification */

  "verification.rung_passed": {
    needs: (payload) => ({ agents: ids(str(payload, "agent_id")) }),
    build: (payload, context) => {
      const raw = str(payload, "rung");
      const rung = RUNG_LADDER.find((r) => r === raw) ?? null;
      if (!rung) return null;
      const agentId = str(payload, "agent_id");
      const passed = agentId ? context.lookups.passedRungs(agentId) : [];
      return verificationRungPassed({
        name: context.recipient.name,
        rung,
        nextRung: nextRungAfter(rung, passed),
      });
    },
  },
};

/**
 * The ladder, in the order the email climbs it.
 *
 * `phone` is first in the email's vocabulary and has no row in
 * `agent_verification_checks`, so it is never a rung this path can announce as
 * passed and never a rung it can offer as next. That is a gap in the table
 * rather than in the message, and it is named here so the next person finds it
 * stated rather than inferring it from an absence.
 */
const RUNG_LADDER: readonly VerificationRung[] = ["phone", "identity", "address", "inspection"];

/** The next rung this agent has NOT passed, or null at the top. */
export function nextRungAfter(
  rung: VerificationRung,
  passed: readonly VerificationRung[],
): VerificationRung | null {
  const from = RUNG_LADDER.indexOf(rung);
  if (from < 0) return null;
  for (let i = from + 1; i < RUNG_LADDER.length; i += 1) {
    const candidate = RUNG_LADDER[i];
    if (candidate && !passed.includes(candidate)) return candidate;
  }
  return null;
}

/** Every template key the registry answers to, for the coverage test. */
export const OUTBOX_TEMPLATE_KEYS: readonly string[] = Object.keys(OUTBOX_TEMPLATES);

/** Is this a template we can build at all? The drain's first question. */
export function templateFor(name: string): OutboxTemplate | null {
  return OUTBOX_TEMPLATES[name] ?? null;
}
