import { describe, expect, it } from "vitest";

import {
  OUTBOX_TEMPLATES,
  OUTBOX_TEMPLATE_KEYS,
  nextRungAfter,
  templateFor,
  type Payload,
  type TemplateContext,
  type TemplateLookups,
} from "./templates";

/**
 * THE TEST THAT THE OLD SUITE COULD NOT WRITE.
 *
 * Nine builders sat unreachable for weeks under a green suite, because every
 * test asked whether a builder EXISTS and rendered it with a hand-made object.
 * None of them could ask whether anything would ever call it, or whether the
 * thing that called it would hand it the shape a database actually writes.
 *
 * So every case below starts from THE EXACT PAYLOAD A TRIGGER COMPOSES, copied
 * key for key out of the migration that composes it, and asserts on the words
 * that come out the other end. A payload key renamed in SQL without its
 * template being changed fails here, which is the failure the old shape could
 * not see.
 */

const PAYER = "11111111-1111-4111-8111-111111111111";
const PAYEE = "22222222-2222-4222-8222-222222222222";
const ESCROW = "33333333-3333-4333-8333-333333333333";
const LISTING = "44444444-4444-4444-8444-444444444444";
const ENTRY = "55555555-5555-4555-8555-555555555555";
const AGENT = "66666666-6666-4666-8666-666666666666";
const MESSAGE = "99999999-9999-4999-8999-999999999999";

const lookups: TemplateLookups = {
  userName: (id) => (id === PAYEE ? "Chidi Okonkwo" : id === PAYER ? "Ada Balogun" : null),
  listing: (id) =>
    id === LISTING ? { title: "2 bedroom flat, Yaba", address: "14 Herbert Macaulay Way" } : null,
  withdrawal: (id) => (id === ENTRY ? { bankName: "GTBank", accountLast4: null } : null),
  passedRungs: (id) => (id === AGENT ? ["identity"] : []),
  enquiry: (id) =>
    id === MESSAGE
      ? {
          body: "Good afternoon. Is this flat still available, and is the service charge separate?",
          conversationPath: "/messages/88888888-8888-4888-8888-888888888888",
        }
      : null,
};

function contextFor(recipientId: string, name: string | null): TemplateContext {
  return { recipientId, recipient: { name }, lookups };
}

/** The keys every escrow payload carries, whatever the state. */
function escrowPayload(state: string, viewer: "payer" | "payee", extra: Payload = {}): Payload {
  return {
    escrow_id: ESCROW,
    state,
    viewer,
    counterparty_id: viewer === "payer" ? PAYEE : PAYER,
    listing_id: LISTING,
    purpose: "agency_fee",
    amount_minor: 250_000_00,
    ...extra,
  };
}

/**
 * Exactly the templates the four migrations enqueue, written out here rather
 * than derived, so that adding a trigger without a builder is a failing test
 * and not a row that quietly lands in the dead-letter column at three in the
 * morning.
 */
const TEMPLATES_THE_TRIGGERS_WRITE = [
  "escrow.INITIATED",
  "escrow.HELD",
  "escrow.RELEASE_REQUESTED",
  "escrow.RELEASED",
  "escrow.REFUNDED",
  "escrow.DISPUTED",
  "escrow.RESOLVED",
  "escrow.CANCELLED",
  "security.password_changed",
  "security.new_device_sign_in",
  "wallet.withdrawal_outcome",
  "inspection.scheduled",
  "verification.rung_passed",
  "listing.new_enquiry",
] as const;

/** One real payload per template, of the shape its own trigger composes. */
const PAYLOADS: Record<(typeof TEMPLATES_THE_TRIGGERS_WRITE)[number], Payload> = {
  "escrow.INITIATED": escrowPayload("INITIATED", "payer"),
  "escrow.HELD": escrowPayload("HELD", "payer", {
    auto_release_at: "2026-10-01T09:00:00.000Z",
  }),
  "escrow.RELEASE_REQUESTED": escrowPayload("RELEASE_REQUESTED", "payer", {
    auto_release_at: "2026-10-01T09:00:00.000Z",
    requested_by: PAYEE,
  }),
  "escrow.RELEASED": escrowPayload("RELEASED", "payee", {
    commission_minor: 0,
    net_minor: 250_000_00,
    automatic: true,
  }),
  "escrow.REFUNDED": escrowPayload("REFUNDED", "payer", {
    reason: "The property was not available on the day.",
  }),
  "escrow.DISPUTED": escrowPayload("DISPUTED", "payer", {
    raised_by: PAYER,
    reason: "The keys were never handed over.",
  }),
  "escrow.RESOLVED": escrowPayload("RESOLVED", "payer", {
    direction: "refund",
    ruling: "Both sides filed. The property was not handed over, so the money goes back.",
    commission_minor: 0,
    net_minor: 250_000_00,
  }),
  "escrow.CANCELLED": escrowPayload("CANCELLED", "payee", {
    actor_id: PAYER,
    note: "Withdrawn by the person who proposed it, before any money moved.",
  }),
  "security.password_changed": { at: "2026-09-23T13:05:00.000Z" },
  "security.new_device_sign_in": {
    at: "2026-09-23T13:05:00.000Z",
    device: "Chrome on Android",
  },
  "wallet.withdrawal_outcome": {
    entry_id: ENTRY,
    outcome: "failed",
    amount_minor: 50_000_00,
    reference: "rm-wd-c0426a",
  },
  "inspection.scheduled": {
    inspection_id: "77777777-7777-4777-8777-777777777777",
    listing_id: LISTING,
    audience: "viewer",
    counterparty_id: PAYEE,
    slot_at: "2026-10-02T10:30:00.000Z",
  },
  "verification.rung_passed": { agent_id: AGENT, rung: "identity" },
  "listing.new_enquiry": {
    conversation_id: "88888888-8888-4888-8888-888888888888",
    message_id: MESSAGE,
    listing_id: LISTING,
    enquirer_id: PAYEE,
  },
};

describe("the registry covers every template a trigger writes", () => {
  it("has an entry for each one, and no entry nobody writes", () => {
    expect([...OUTBOX_TEMPLATE_KEYS].sort()).toEqual([...TEMPLATES_THE_TRIGGERS_WRITE].sort());
  });

  it("builds a real message for every one of them, from the trigger's own payload", () => {
    for (const name of TEMPLATES_THE_TRIGGERS_WRITE) {
      const template = templateFor(name);
      expect(template, name).not.toBeNull();
      const message = template?.build(PAYLOADS[name], contextFor(PAYER, "Ada"));
      expect(message, name).not.toBeNull();
      /* A subject, a document and a text alternative, all non-empty. A message
         with no text part is a bulk-mail signature to every major filter. */
      expect(message?.subject.length, name).toBeGreaterThan(0);
      expect(message?.html.length, name).toBeGreaterThan(200);
      expect(message?.text.length, name).toBeGreaterThan(50);
      expect(message?.html, name).toContain("<html");
    }
  });

  it("asks only for the ids its own payload carries", () => {
    const escrow = OUTBOX_TEMPLATES["escrow.HELD"]?.needs(PAYLOADS["escrow.HELD"]);
    expect(escrow?.users).toEqual([PAYEE]);
    expect(escrow?.listings).toEqual([LISTING]);

    /* The two security templates need nothing looked up at all, which is what
       lets them send when everything else is unreachable. */
    expect(
      OUTBOX_TEMPLATES["security.password_changed"]?.needs(PAYLOADS["security.password_changed"]),
    ).toEqual({});
    expect(
      OUTBOX_TEMPLATES["security.new_device_sign_in"]?.needs(
        PAYLOADS["security.new_device_sign_in"],
      ),
    ).toEqual({});
  });
});

describe("the escrow messages say the right thing to the right side", () => {
  it("names the counterparty the drain resolved, not an id", () => {
    const message = templateFor("escrow.INITIATED")?.build(
      PAYLOADS["escrow.INITIATED"],
      contextFor(PAYER, "Ada"),
    );
    /* `greetingName` shortens to the first name on both sides. */
    expect(message?.subject).toContain("Chidi");
    expect(message?.html).toContain("Hello Ada.");
    expect(message?.html).toContain("2 bedroom flat, Yaba");
    /* And nowhere does a uuid reach a person. */
    expect(message?.html).not.toContain(PAYEE);
  });

  it("tells the payee a different true thing from the payer", () => {
    const toPayer = templateFor("escrow.HELD")?.build(
      escrowPayload("HELD", "payer", { auto_release_at: null }),
      contextFor(PAYER, "Ada"),
    );
    const toPayee = templateFor("escrow.HELD")?.build(
      escrowPayload("HELD", "payee", { auto_release_at: null }),
      contextFor(PAYEE, "Chidi"),
    );
    expect(toPayer?.subject).not.toEqual(toPayee?.subject);
    /* Asserted on the document rather than the text alternative: the plain
       text renderer wraps at the reading width, so a sentence long enough to
       be distinctive is also long enough to be split by a newline. */
    expect(toPayer?.html).toContain("has left your spendable balance");
    expect(toPayee?.html).toContain("It reaches your Vallo balance");
  });

  it("knows whether the reader is the one who objected", () => {
    const toRaiser = templateFor("escrow.DISPUTED")?.build(
      PAYLOADS["escrow.DISPUTED"],
      contextFor(PAYER, "Ada"),
    );
    const toOther = templateFor("escrow.DISPUTED")?.build(
      escrowPayload("DISPUTED", "payee", {
        raised_by: PAYER,
        reason: "The keys were never handed over.",
      }),
      contextFor(PAYEE, "Chidi"),
    );
    expect(toRaiser?.subject).toBe("We have your objection");
    expect(toOther?.subject).toContain("has objected");
  });

  it("carries the operator's ruling to both sides word for word", () => {
    const ruling = "Both sides filed. The property was not handed over, so the money goes back.";
    for (const viewer of ["payer", "payee"] as const) {
      const message = templateFor("escrow.RESOLVED")?.build(
        escrowPayload("RESOLVED", viewer, {
          direction: "refund",
          ruling,
          commission_minor: 0,
          net_minor: 250_000_00,
        }),
        contextFor(viewer === "payer" ? PAYER : PAYEE, "Ada"),
      );
      expect(message?.html).toContain(ruling);
    }
  });

  it("refuses to send a dispute or a ruling with no words in it", () => {
    expect(
      templateFor("escrow.DISPUTED")?.build(
        escrowPayload("DISPUTED", "payer", { raised_by: PAYER, reason: null }),
        contextFor(PAYER, "Ada"),
      ),
    ).toBeNull();
    expect(
      templateFor("escrow.RESOLVED")?.build(
        escrowPayload("RESOLVED", "payer", { direction: "release", ruling: "" }),
        contextFor(PAYER, "Ada"),
      ),
    ).toBeNull();
  });

  it("builds nothing from a payload missing the amount or the purpose", () => {
    expect(
      templateFor("escrow.HELD")?.build(
        { escrow_id: ESCROW, viewer: "payer", purpose: "agency_fee" },
        contextFor(PAYER, "Ada"),
      ),
    ).toBeNull();
    expect(
      templateFor("escrow.HELD")?.build(
        { escrow_id: ESCROW, viewer: "payer", amount_minor: 100 },
        contextFor(PAYER, "Ada"),
      ),
    ).toBeNull();
  });

  it("reads an amount that arrived as a string, because money is integer kobo", () => {
    const message = templateFor("escrow.HELD")?.build(
      escrowPayload("HELD", "payer", { amount_minor: "25000000", auto_release_at: null }),
      contextFor(PAYER, "Ada"),
    );
    expect(message?.text).toContain("250,000");
    expect(message?.text).not.toContain("NaN");
  });
});

describe("the security messages", () => {
  it("puts the clock in Lagos on both of them", () => {
    /* 13:05 UTC is 14:05 in Lagos, which is UTC+1 all year. */
    const changed = templateFor("security.password_changed")?.build(
      PAYLOADS["security.password_changed"],
      contextFor(PAYER, "Ada"),
    );
    expect(changed?.text).toContain("14:05");
    const device = templateFor("security.new_device_sign_in")?.build(
      PAYLOADS["security.new_device_sign_in"],
      contextFor(PAYER, "Ada"),
    );
    expect(device?.text).toContain("14:05");
    expect(device?.text).toContain("Chrome on Android");
  });

  it("still sends when the device could not be named", () => {
    const message = templateFor("security.new_device_sign_in")?.build(
      { at: "2026-09-23T13:05:00.000Z", device: null },
      contextFor(PAYER, "Ada"),
    );
    expect(message).not.toBeNull();
    expect(message?.subject).toContain("new sign-in");
  });

  it("still sends when the timestamp is unusable, because the warning matters more", () => {
    const message = templateFor("security.password_changed")?.build(
      { at: "not a date" },
      contextFor(PAYER, "Ada"),
    );
    expect(message).not.toBeNull();
    expect(message?.subject).toContain("password was changed");
  });
});

describe("the withdrawal, the inspection and the rung", () => {
  it("names the bank but never a bank account number", () => {
    const message = templateFor("wallet.withdrawal_outcome")?.build(
      PAYLOADS["wallet.withdrawal_outcome"],
      contextFor(PAYER, "Ada"),
    );
    expect(message?.text).toContain("GTBank");
    /* `withdrawal` resolves `accountLast4` to null for a bank destination, so
       no NUBAN fragment can reach the page. */
    expect(message?.text).not.toContain("****");
  });

  it("tells failed and reversed apart", () => {
    const failed = templateFor("wallet.withdrawal_outcome")?.build(
      { ...PAYLOADS["wallet.withdrawal_outcome"], outcome: "failed" },
      contextFor(PAYER, "Ada"),
    );
    const reversed = templateFor("wallet.withdrawal_outcome")?.build(
      { ...PAYLOADS["wallet.withdrawal_outcome"], outcome: "reversed" },
      contextFor(PAYER, "Ada"),
    );
    expect(failed?.text).toContain("Not sent, money still in your wallet");
    expect(reversed?.text).toContain("Returned to your wallet by the bank");
  });

  it("refuses an inspection with no property or no time", () => {
    expect(
      templateFor("inspection.scheduled")?.build(
        { ...PAYLOADS["inspection.scheduled"], slot_at: null },
        contextFor(PAYER, "Ada"),
      ),
    ).toBeNull();
    expect(
      templateFor("inspection.scheduled")?.build(
        { ...PAYLOADS["inspection.scheduled"], listing_id: "nope" },
        contextFor(PAYER, "Ada"),
      ),
    ).toBeNull();
  });

  it("never puts a phone number in an inspection email", () => {
    const message = templateFor("inspection.scheduled")?.build(
      PAYLOADS["inspection.scheduled"],
      contextFor(PAYER, "Ada"),
    );
    expect(message?.text).toContain("2 bedroom flat, Yaba");
    expect(message?.html).toContain("Chidi");
    expect(message?.text).not.toContain("Their number");
  });

  it("puts the enquirer's own words in the enquiry, and answers to the Messages switch", () => {
    const template = templateFor("listing.new_enquiry");
    /* The ONE template that honours a mute. Everything else here is a
       security obligation, a receipt, or an agreement the reader is party to,
       and none of those is switchable. */
    expect(template?.channel).toBe("messages");
    const message = template?.build(PAYLOADS["listing.new_enquiry"], contextFor(PAYER, "Ada"));
    expect(message?.subject).toContain("2 bedroom flat, Yaba");
    expect(message?.html).toContain("Is this flat still available");
    expect(message?.html).toContain("/messages/88888888-8888-4888-8888-888888888888");
  });

  it("sends no enquiry when the words could not be read", () => {
    expect(
      templateFor("listing.new_enquiry")?.build(
        { ...PAYLOADS["listing.new_enquiry"], message_id: "gone" },
        contextFor(PAYER, "Ada"),
      ),
    ).toBeNull();
  });

  it("offers the next rung the agent has not already passed", () => {
    expect(nextRungAfter("identity", ["identity"])).toBe("address");
    expect(nextRungAfter("identity", ["identity", "address"])).toBe("inspection");
    expect(nextRungAfter("inspection", ["identity", "address", "inspection"])).toBeNull();
    const message = templateFor("verification.rung_passed")?.build(
      PAYLOADS["verification.rung_passed"],
      contextFor(PAYER, "Ada"),
    );
    expect(message?.text).toContain("address");
  });
});
