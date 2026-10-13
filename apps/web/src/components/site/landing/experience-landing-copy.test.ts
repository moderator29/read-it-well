import { getDictionary } from "@vallo/i18n";
import { describe, expect, it } from "vitest";
import { unbackedClaim } from "@/lib/trust/claims";
import { occurrencesIn } from "@/lib/price-check/regulated-words";
import { EXAMPLE_MOVE_IN, MOVE_IN_PARTS, partMinor } from "./example-move-in";

/*
 * Session 3's landing copy (`experience-landing.en.ts`, W1) is a sidecar
 * module like `landing-rooms.en.ts`, so the same three rules are held here
 * that `landing-rooms.test.ts` holds for that one: no claim the code cannot
 * back, none of the regulated words, and none of the banned product words.
 * And the landing's one example flat must add up, because the hero card, the
 * move-in band and the platform band all print it and say it is the whole
 * cost.
 */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

const t = getDictionary("en");
const copy = strings(t.experienceLanding);

describe("the landing's Session 3 copy", () => {
  it("has strings to check", () => {
    expect(copy.length).toBeGreaterThan(10);
  });

  it("makes no claim it cannot back", () => {
    const found = copy.map((s) => ({ s, word: unbackedClaim(s) })).filter((hit) => hit.word !== null);
    expect(found).toEqual([]);
  });

  it("uses none of the regulated words", () => {
    const found = copy.filter(
      (text) => occurrencesIn({ path: "experience-landing.en.ts", text: JSON.stringify(text) }).length > 0,
    );
    expect(found).toEqual([]);
  });

  it("uses none of the banned product words", () => {
    const banned = /\b(demo|sample|preview|coming soon|not live|lorem)\b/i;
    expect(copy.filter((s) => banned.test(s))).toEqual([]);
  });
});

describe("the landing's example flat", () => {
  it("adds up to the move-in total it prints", () => {
    const sum = MOVE_IN_PARTS.reduce((acc, part) => acc + partMinor(part), 0);
    expect(sum).toBe(EXAMPLE_MOVE_IN.total);
    expect(MOVE_IN_PARTS[0]).toBe("rent");
  });
});
