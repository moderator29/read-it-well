import { describe, expect, it } from "vitest";

import {
  cardPhrase,
  paymentInstrumentChanged,
  __testing,
  type PaymentInstrumentEvent,
} from "./payment-instrument-messages";

/**
 * The six payment-instrument emails, and the one rule that decides their
 * vocabulary: a card may be named by its brand and its last four digits, and a
 * bank account gets the institution's name and not one digit of the number.
 */

const EVENTS: readonly PaymentInstrumentEvent[] = [
  "card_saved",
  "card_default_changed",
  "card_removed",
  "bank_added",
  "bank_default_changed",
  "bank_removed",
];

describe("all six render", () => {
  it("produces a subject, a document and a text alternative for each", () => {
    for (const event of EVENTS) {
      const message = paymentInstrumentChanged({
        event,
        name: "Ada Balogun",
        cardType: "visa",
        last4: "4081",
        bankName: "GTBank",
      });
      expect(message.subject.length, event).toBeGreaterThan(0);
      expect(message.html, event).toContain("<html");
      expect(message.text.length, event).toBeGreaterThan(50);
      /* The way back is on every one of them, because a person who did not
         make the change needs somewhere to go from the email itself. */
      expect(message.html, event).toContain("/settings/payments");
    }
  });

  it("gives each event its own subject, so six of them in an inbox are six events", () => {
    const subjects = EVENTS.map((event) => paymentInstrumentChanged({ event }).subject);
    expect(new Set(subjects).size).toBe(EVENTS.length);
  });

  it("says on every one that it cannot be switched off", () => {
    for (const event of EVENTS) {
      /* Asserted on the document: the text alternative wraps at the reading
         width, so a phrase can be split across a newline. */
      expect(paymentInstrumentChanged({ event }).html, event).toContain(
        "cannot be switched off",
      );
    }
  });
});

describe("rule 16: what may be printed", () => {
  it("names a card by brand and last four", () => {
    const message = paymentInstrumentChanged({
      event: "card_default_changed",
      cardType: "visa",
      last4: "4081",
    });
    expect(message.text).toContain("Visa");
    expect(message.text).toContain("4081");
  });

  it("prints no digits at all for a bank account, ever", () => {
    for (const event of ["bank_added", "bank_default_changed", "bank_removed"] as const) {
      const message = paymentInstrumentChanged({
        event,
        bankName: "GTBank",
        /* Handed a NUBAN fragment on purpose: it must not survive. */
        last4: "9013",
      });
      expect(message.text, event).toContain("GTBank");
      expect(message.text, event).not.toContain("9013");
      expect(message.html, event).not.toContain("9013");
    }
  });

  it("degrades to a noun rather than an empty phrase when the brand is unknown", () => {
    expect(cardPhrase(null, null)).toBe("your card");
    expect(cardPhrase("some new network", "4081")).toBe("your card ending 4081");
    expect(cardPhrase("verve DEBIT", "4081")).toBe("your Verve card ending 4081");
    /* Anything that is not four digits is not printed as digits at all. */
    expect(cardPhrase("visa", "081")).toBe("your Visa card");
    expect(cardPhrase("visa", "40812")).toBe("your Visa card");
  });

  it("keeps the brand vocabulary identical to the in-app notice's", () => {
    /*
     * `lib/payments/notices.ts` keeps its own copy of this mapping, because an
     * email builder has to stay pure enough for a fixture to render with no
     * environment while that module is a server module. Two copies is the
     * right price, and this is what holds them equal.
     */
    for (const [input, expected] of [
      ["visa", "Visa"],
      ["mastercard", "Mastercard"],
      ["master", "Mastercard"],
      ["verve DEBIT", "Verve"],
      ["", "card"],
      [null, "card"],
    ] as const) {
      expect(__testing.brandWord(input), String(input)).toBe(expected);
    }
  });
});

describe("the sentence a person acts on", () => {
  it("puts the password first on the change that redirects money", () => {
    const message = paymentInstrumentChanged({
      event: "bank_default_changed",
      bankName: "GTBank",
    });
    expect(message.html).toMatch(/money you withdraw/i);
    /* The password, before setting it back: an attacker who still holds the
       session simply changes it again. */
    const passwordAt = message.html.indexOf("change your password");
    const revertAt = message.html.indexOf("set your payout account back");
    expect(passwordAt).toBeGreaterThan(-1);
    expect(revertAt).toBeGreaterThan(passwordAt);
  });

  it("never tells somebody we would ask them for a code", () => {
    for (const event of EVENTS) {
      expect(paymentInstrumentChanged({ event }).html, event).toContain("will never ask you");
    }
  });

  it("greets by first name, or not at all", () => {
    expect(paymentInstrumentChanged({ event: "card_saved", name: "Ada Balogun" }).html).toContain(
      "Hello Ada.",
    );
    const anonymous = paymentInstrumentChanged({ event: "card_saved", name: null });
    expect(anonymous.html).toContain("Hello");
    expect(anonymous.html).not.toContain("Hello .");
  });
});
