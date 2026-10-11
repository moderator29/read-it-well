import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { withoutComments } from "@/lib/copy/source-scan";

/**
 * THE INVITE HUB DRAWS ONLY WHAT IS TRUE (auditor A2, 6 October 2026).
 *
 * The account copy for the hub stays free of reward and scheme wording: every
 * sentence about what a member earns is a money sentence (`lib/money/copy.ts`)
 * filled from the live campaign (D85), never a dictionary line. The two
 * referral routes (declared, so kept) hand on to the one list at
 * `/rewards/referrals`, which reads `my_referral_progress` (the reads
 * R-W6-1 and R-W6-2 asked for).
 */
const copy = getDictionary("en").experienceAccount.invite;

describe("the invite hub", () => {
  it("carries no reward, stage or earnings wording in its copy", () => {
    const text = JSON.stringify(copy).toLowerCase();
    for (const word of [
      "qualified",
      "reward added",
      "reward taken back",
      "earned so far",
      "towards your next reward",
      "downline",
      "passive",
      "earn money",
      "returns",
      "commission",
      "guaranteed",
    ]) {
      expect(text, word).not.toContain(word);
    }
    /* "investment" appears once, in the sentence that says there is none. */
    expect(text.match(/invest/g)?.length).toBe(1);
    expect(text).toContain("nothing here is an investment");
  });

  it("does not promise that joins will appear on a list members cannot read", () => {
    expect(copy.referrals.emptyBody.toLowerCase()).not.toContain("will appear");
  });

  /*
   * The hub links the referrals list (7 October 2026: the founder could not
   * find it). Since D85 the member can read it, so the hub's address hands on
   * to the one list at /rewards/referrals rather than keeping a second copy.
   * The hub draws no figure of its own: its earnings card is the read's.
   */
  it("links the hub to the one referrals list and the earnings dashboard", () => {
    const page = withoutComments(readFileSync(join(__dirname, "page.tsx"), "utf8"));
    expect(page).toContain('href="/settings/invite/referrals"');
    expect(page).toContain('href="/rewards"');
    expect(page).not.toContain("ReferralFigures");
    for (const route of [["referrals", "page.tsx"], ["referrals", "[id]", "page.tsx"]]) {
      const file = join(__dirname, ...route);
      expect(existsSync(file)).toBe(true);
      expect(withoutComments(readFileSync(file, "utf8"))).toContain('redirect("/rewards/referrals")');
    }
  });
});
