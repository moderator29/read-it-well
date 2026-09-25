import { getDictionary } from "@vallo/i18n";
import { describe, expect, it } from "vitest";
import { unbackedClaim } from "@/lib/trust/claims";
import {
  GUARANTEE_SCOPE,
  GUARANTEE_SENTENCE,
  NO_CUSTODY_SENTENCE,
  NO_INSPECTION_FEE,
  PAYMENT_GATE_SENTENCE,
  PAYOUT_ANSWER,
  PRIVATE_FEE_NOTE,
  REFUND_ROUTE,
} from "@/lib/money/copy";
import { occurrencesIn } from "@/lib/price-check/regulated-words";
import { faqItems } from "./faq-items";

/*
 * The landing's new rooms (Track M) live in a sidecar locale file,
 * `landing-rooms.en.ts`, which the product-wide claims sweep does not read
 * (it reads the four main locale files). So the same rule is applied here,
 * to every string in the namespace, and the FAQ's money answers are held to
 * the constants word for word.
 */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

const t = getDictionary("en");

describe("the landing rooms' copy", () => {
  it("makes no claim it cannot back", () => {
    const found = strings(t.landingRooms)
      .map((s) => ({ s, word: unbackedClaim(s) }))
      .filter((hit) => hit.word !== null);
    expect(found).toEqual([]);
  });

  it("uses none of the regulated words", () => {
    const found = strings(t.landingRooms).filter(
      (text) => occurrencesIn({ path: "landing-rooms.en.ts", text: JSON.stringify(text) }).length > 0,
    );
    expect(found).toEqual([]);
  });

  it("answers every money question with the constants, verbatim", () => {
    const answer = (key: string) => faqItems(t).find((item) => item.key === key)?.a;
    expect(answer("pay")).toBe(`${PAYMENT_GATE_SENTENCE} ${NO_CUSTODY_SENTENCE}`);
    expect(answer("inspection")).toBe(`${NO_INSPECTION_FEE} ${PRIVATE_FEE_NOTE}`);
    expect(answer("guarantee")).toBe(`${GUARANTEE_SENTENCE} ${GUARANTEE_SCOPE}`);
    expect(answer("payout")).toBe(PAYOUT_ANSWER);
    expect(answer("refund")).toBe(REFUND_ROUTE);
  });

  it("asks between ten and fourteen questions, each with an answer", () => {
    const items = faqItems(t);
    expect(items.length).toBeGreaterThanOrEqual(10);
    expect(items.length).toBeLessThanOrEqual(14);
    for (const item of items) expect(item.a.length).toBeGreaterThan(20);
  });
});
