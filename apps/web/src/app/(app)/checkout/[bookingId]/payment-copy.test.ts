import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { failureConsequence as consequenceWith, vettedFailureSentence as vetWith } from "./payment-copy";
import { RENT_PAID_PAGE_CONSEQUENCE, RENT_PAID_SHEET_CONSEQUENCE, STAY_PAID_SHEET_CONSEQUENCE } from "./paid-copy";

/* The rewrite answers in the caller's checkout words (W13 moved the dictionary
   out of the client module); the tests hand it the English ones, so every
   assertion below reads exactly as it did. */
const words = getDictionary("en").checkout;
const vettedFailureSentence = (raw: string | undefined | null) => vetWith(raw, words);
const failureConsequence = (raw: string | undefined | null, money: string) => consequenceWith(raw, money, words);

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
      "duplicate key value violates unique constraint 23505",
      "23P01",
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

/*
 * V-33. A success screen said "the agent has been paid" while the charge
 * credited nobody and no payout existed. The sentence is a claim about a
 * payout, so both the shipped sentences and the whole source tree are held
 * to never making it again.
 */
const PAYOUT_CLAIM =
  /\b(agent|host|lister|landlord|owner)\s+(has|have|was|were|is|got)\s+(been\s+)?(paid|credited|settled)\b|\b(paid|sent|gone|settled)\s+(out\s+)?to\s+the\s+(agent|host|lister|landlord)\b/i;

describe("the paid screens (V-33)", () => {
  it.each([
    ["rent page", RENT_PAID_PAGE_CONSEQUENCE],
    ["rent sheet", RENT_PAID_SHEET_CONSEQUENCE],
    ["stay sheet", STAY_PAID_SHEET_CONSEQUENCE],
  ])("the %s says the charge is recorded and claims no payout", (_name, sentence) => {
    expect(sentence).toMatch(/recorded to the kobo/);
    expect(sentence).not.toMatch(PAYOUT_CLAIM);
  });

  it("catches the sentence that used to ship", () => {
    expect("The agent has been paid and these dates are yours.").toMatch(PAYOUT_CLAIM);
    expect("the agent has been paid. Arrange the keys").toMatch(PAYOUT_CLAIM);
  });

  it("no screen or dictionary anywhere tells a payer the agent has been paid", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const webSrc = resolve(here, "../../../..");
    const i18n = resolve(webSrc, "../../../packages/i18n/src");
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (name === "node_modules" || name.startsWith(".")) continue;
        const full = join(dir, name);
        if (statSync(full).isDirectory()) {
          walk(full);
        } else if (/\.(tsx?|json)$/.test(name) && !/\.test\.tsx?$/.test(name)) {
          if (/\b(agent|host|lister|landlord)\s+has\s+been\s+paid\b/i.test(readFileSync(full, "utf8"))) {
            offenders.push(full);
          }
        }
      }
    };
    walk(webSrc);
    walk(i18n);
    expect(offenders).toEqual([]);
  });
});
