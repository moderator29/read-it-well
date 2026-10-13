import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HELD_MONEY_NOT_US, NO_PAYMENT_BALANCE, REWARDS_BALANCE_SEPARATE } from "@/lib/money/copy";
import { faqAnswerById } from "@/lib/support/faq";
import { stringLiterals } from "./source-scan";

/**
 * NO BALANCE HOLDS A PAYMENT, AND THAT IS ALL IT SAYS (A9, 6 October).
 *
 * /docs chapter 6 said "Vallo keeps no balance in your name ... There is
 * nothing to top up and nothing to withdraw", the FAQ said the same, and both
 * assistant prompts told the model "There is no Vallo wallet, balance or
 * escrow". Beside the Rewards Balance (D51), a debt Vallo owes a member and
 * pays out, "no balance" and "nothing to withdraw" are untrue, and the prompt
 * put the retired word in the model's mouth (D48). Each now reads the narrower
 * true sentence from `lib/money/copy.ts`.
 */
const src = (p: string) => readFileSync(join(process.cwd(), "src", p), "utf8");

const SURFACES = [
  "app/(site)/docs/chapters.tsx",
  "app/api/assistant/route.ts",
  "app/api/support/route.ts",
  "lib/support/faq.ts",
  "lib/support/tools.ts",
] as const;

const UNTRUE = /keeps no balance|no wallet|nothing to withdraw|no Vallo wallet|wallet, balance or escrow/i;

describe("no Vallo balance holds a payment", () => {
  it("says the narrower true thing, and names the Rewards Balance as separate", () => {
    expect(NO_PAYMENT_BALANCE).toMatch(/^No Vallo balance holds your rent or any other payment/);
    for (const sentence of [NO_PAYMENT_BALANCE, REWARDS_BALANCE_SEPARATE, HELD_MONEY_NOT_US]) {
      expect(sentence).not.toMatch(/\bwallet\b|nothing to withdraw|100 percent/i);
    }
    expect(REWARDS_BALANCE_SEPARATE).toContain("Rewards Balance");
    expect(REWARDS_BALANCE_SEPARATE).toContain("never money held for you");
  });

  it.each(SURFACES)("%s says none of the untrue versions in a string a reader or the model sees", (file) => {
    const found = stringLiterals(src(file))
      .filter(({ text }) => UNTRUE.test(text))
      .map(({ line, text }) => `${line}: ${text.slice(0, 100)}`);
    expect(found).toEqual([]);
  });

  it("reads the sentences from copy.ts on /docs and in both prompts", () => {
    const docs = src("app/(site)/docs/chapters.tsx");
    expect(docs).toContain("{NO_PAYMENT_BALANCE} {REWARDS_BALANCE_SEPARATE} {HELD_MONEY_NOT_US}");
    expect(docs).toContain("{REFUND_ROUTE} {REFUND_NO_BALANCE}");
    for (const file of ["app/api/assistant/route.ts", "app/api/support/route.ts"]) {
      const prompt = src(file);
      expect(prompt, file).toContain("${NO_PAYMENT_BALANCE} ${REWARDS_BALANCE_SEPARATE}");
      expect(prompt, file).toContain("Referral rewards are not running yet");
    }
  });

  it("answers the FAQ's wallet question with the same sentences", () => {
    const answer = faqAnswerById("wallet") ?? "";
    expect(answer).toContain(NO_PAYMENT_BALANCE);
    expect(answer).toContain(REWARDS_BALANCE_SEPARATE);
  });
});
