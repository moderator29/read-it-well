import { describe, expect, it } from "vitest";

import { __testing } from "./notices";

const { brandWord, cardPhrase } = __testing;

/**
 * WHAT A PAYMENTS NOTICE IS ALLOWED TO SAY.
 *
 * These notices are read by the recipient, by anybody standing behind them,
 * and by any operator who can select from `notifications`. Rule 16 is the
 * whole of this file: no card number, no bank account number, no name the bank
 * confirmed. The vocabulary is a brand word, which is a public fact about an
 * institution, and the last four digits of a card, which the card networks
 * themselves treat as non-sensitive and which is the only handle somebody has
 * for telling two of their own cards apart.
 *
 * A bank account gets NO digits, not even four, and there is no helper here
 * that could give it any: `bankAccountAddedNotice` and its two siblings take
 * `{ bankName }` and the type is what enforces it.
 */

describe("a card is named by its brand, never by its number", () => {
  it("prints the brand Paystack sends, in the spelling a person recognises", () => {
    expect(brandWord("visa")).toBe("Visa");
    expect(brandWord("mastercard")).toBe("Mastercard");
    expect(brandWord("verve")).toBe("Verve");
  });

  it("reads Paystack's compound types, which carry the class after the brand", () => {
    /* Real values off the processor: "verve DEBIT", "visa CREDIT". Splitting
       on whitespace is what stops the desk printing "your verve DEBIT card". */
    expect(brandWord("verve DEBIT")).toBe("Verve");
    expect(brandWord("visa CREDIT")).toBe("Visa");
  });

  it("says 'card' rather than nothing for a brand it does not know", () => {
    /* American Express, a new domestic scheme, a null column on an old row.
       None of them may produce "your  ending 4081" with a hole in it. */
    for (const unknown of ["amex", "", null, undefined, "   "]) {
      expect(brandWord(unknown)).toBe("card");
      expect(cardPhrase(unknown, "4081")).toBe("your card ending 4081");
    }
  });
});

describe("the last four, and only when they really are four digits", () => {
  it("names the card a person can pick out of their own wallet", () => {
    expect(cardPhrase("visa", "4081")).toBe("your Visa card ending 4081");
  });

  it("drops the digits entirely rather than printing a partial or a wrong one", () => {
    /* The failure this guards against is a notice reading "your Visa card
       ending 408" or "ending null". Saying less is always available; saying
       something untrue about somebody's card is not. */
    for (const bad of ["408", "40811", "", null, undefined, "40a1"]) {
      expect(cardPhrase("visa", bad)).toBe("your Visa card");
    }
  });

  it("never prints more than four digits, whatever it is handed", () => {
    /* A full PAN in the last4 column would be a data defect upstream, and it
       must not become a data leak downstream. */
    const phrase = cardPhrase("visa", "4111111111111111");
    expect(phrase).toBe("your Visa card");
    expect(phrase).not.toContain("4111");
  });
});
