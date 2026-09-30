import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getDictionary, LOCALES } from "@vallo/i18n";

/**
 * V-21: THE 0 TO 100 TRUST SCORE IS GONE AND STAYS GONE.
 *
 * A number out of 100 collapses the separate trust signals into one, which
 * PRODUCT.md section 6 forbids, and the one this product printed counted
 * "completed deals" only from stays. These assertions hold the deletion at
 * every layer it lived in: the function's return, the reader, the component
 * and the dictionary.
 */
const root = join(__dirname, "..", "..");
const repo = join(root, "..", "..", "..");

describe("no trust score", () => {
  it("the migration re-creates agent_trust without a score column", () => {
    const sql = readFileSync(join(repo, "supabase/migrations/20260924110708_v21_delete_the_trust_score.sql"), "utf8");
    const returns = sql.slice(sql.indexOf("create function public.agent_trust"), sql.indexOf("language sql"));
    expect(returns).toContain("completed_deals integer, response_minutes integer, review_count integer, average_rating numeric");
    expect(returns).not.toMatch(/score/);
  });

  it("the reader and the component carry no score", () => {
    const extras = readFileSync(join(root, "lib/social/profile-extras.ts"), "utf8");
    expect(extras).not.toMatch(/trust_score|\bscore:/);
    const header = readFileSync(join(root, "components/social/profile/ProfileHeader.tsx"), "utf8");
    expect(header).not.toMatch(/trust\.score|trustScore/);
  });

  it("no locale has a trust score label", () => {
    for (const locale of LOCALES) {
      const profile = getDictionary(locale).socialProfile as Record<string, unknown>;
      expect("trustScore" in profile).toBe(false);
    }
  });

  it("a zero stays count is never printed", () => {
    const header = readFileSync(join(root, "components/social/profile/ProfileHeader.tsx"), "utf8");
    expect(header).toMatch(/trust\.completedDeals > 0\s*\?/);
  });
});
