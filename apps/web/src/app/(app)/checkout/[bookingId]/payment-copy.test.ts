import { describe, expect, it } from "vitest";
import { failureConsequence, vettedFailureSentence } from "./payment-copy";

/**
 * The boundary between whatever the server put in `result.error` and the person
 * who has just tried to pay rent.
 *
 * This is a unit test rather than a browser spec because the whole subject is a
 * pure string decision, and because the inputs that matter are the ones a
 * running server will not produce on demand: a stack, a dumped payload, a raw
 * enum, a Postgres code. A spec can only ever prove the happy sentence.
 */
describe("vettedFailureSentence", () => {
  it("lets a sentence somebody wrote for a reader through unchanged", () => {
    const written = "This booking is already paid, so there is nothing to pay again.";
    expect(vettedFailureSentence(written)).toBe(written);
  });

  it("keeps the money in a balance refusal, separators and all", () => {
    const written =
      "Your available wallet balance is ₦95,000.00, and this stay comes to ₦1,250,000.00. Add money to your wallet or pay by card.";
    expect(vettedFailureSentence(written)).toBe(written);
  });

  it("rewrites the two jargon refusals rather than dropping them", () => {
    expect(
      vettedFailureSentence(
        "Card payment switches on the moment payment keys land. Your booking is untouched and your dates are still held.",
      ),
    ).toBe("We cannot take this payment right now.");
    expect(
      vettedFailureSentence(
        "This feature switches on the moment the platform keys land. Nothing you entered was lost.",
      ),
    ).toBe("We cannot take this payment right now.");
  });

  it("says nothing rather than showing a raw enum, a code, a stack or an id", () => {
    for (const raw of [
      "not_pending",
      "insufficient",
      "PGRST204",
      "TypeError: cannot read properties of undefined",
      "line one\nline two",
      '{"message":"refused"}',
      "Failed to fetch https://api.paystack.co/transaction/verify",
      "booking 0f2c9ae1-4b77-4c1a-9a3b-6f2f5a0d1e88 refused",
    ]) {
      expect(vettedFailureSentence(raw)).toBeNull();
    }
  });

  it("says nothing for an empty, blank or absurdly long string", () => {
    expect(vettedFailureSentence(undefined)).toBeNull();
    expect(vettedFailureSentence(null)).toBeNull();
    expect(vettedFailureSentence("   ")).toBeNull();
    expect(vettedFailureSentence(`${"a ".repeat(300)}`)).toBeNull();
  });
});

describe("failureConsequence", () => {
  const money = "Nothing has been taken from your card or your wallet.";

  it("always states what happened to the money, reason or no reason", () => {
    expect(failureConsequence(null, money)).toBe(money);
    expect(failureConsequence("not_pending", money)).toBe(money);
    expect(failureConsequence("The payment did not go through.", money)).toBe(
      `The payment did not go through. ${money}`,
    );
  });

  it("never returns the sentence the brief bans", () => {
    expect(failureConsequence("Something went wrong", money)).not.toMatch(/something went wrong/i);
  });
});
