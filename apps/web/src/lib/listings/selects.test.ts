import { describe, expect, it } from "vitest";

import { LISTING_SELECTS } from "./supabase-repository";

/**
 * The two catalogue selects, held to each other.
 *
 * `supabase-repository.ts` writes its column list twice: once for the card read
 * and once for the detail read, which adds the walkthrough join. That
 * duplication is deliberate and the file says why. The Supabase client parses
 * the select string at the TYPE level to work out the row shape it returns, and
 * it can only parse a literal, so a composed or conditional select collapses to
 * `string` and takes the typing of all fifty columns down with it. Two literals
 * cost a repeated list; one composed literal costs the type safety.
 *
 * The price of that choice is drift: somebody adds a column to one and not the
 * other, and the detail page quietly starts missing a field that the card has.
 * This spec is what makes the duplication safe to live with.
 */

/** Column and join names, in order, from a PostgREST select string. */
function entries(select: string): string[] {
  return select
    .split("\n")
    .map((line) => line.trim().replace(/,$/, ""))
    .filter((line) => line.length > 0);
}

/** Just the embedded joins, by their table name. */
function joins(select: string): string[] {
  return entries(select)
    .filter((entry) => entry.includes("("))
    .map((entry) => entry.slice(0, entry.indexOf("(")).trim());
}

describe("catalogue selects", () => {
  const card = entries(LISTING_SELECTS.card);
  const detail = entries(LISTING_SELECTS.detail);

  it("differ by exactly the walkthrough join and nothing else", () => {
    const extra = detail.filter((entry) => !card.includes(entry));
    expect(extra).toHaveLength(1);
    expect(extra[0]).toMatch(/^listing_videos\s*\(/);
  });

  it("never lets the card read drift ahead of the detail read", () => {
    const missing = card.filter((entry) => !detail.includes(entry));
    expect(missing).toEqual([]);
  });

  it("keeps the columns in the same order in both", () => {
    const detailWithoutVideos = detail.filter((entry) => !entry.startsWith("listing_videos"));
    expect(detailWithoutVideos).toEqual(card);
  });

  /**
   * The property the whole split exists for. A walkthrough path is private and
   * has to be signed, and signing is a storage round trip for the whole page.
   * A list surface has no player on it, so the card read must not ask.
   */
  it("keeps walkthroughs off the card read", () => {
    expect(joins(LISTING_SELECTS.card)).toEqual(["listing_photos", "listing_amenities"]);
    expect(joins(LISTING_SELECTS.detail)).toContain("listing_videos");
  });

  it("asks for no duplicate columns in either", () => {
    expect(new Set(card).size).toBe(card.length);
    expect(new Set(detail).size).toBe(detail.length);
  });
});
