import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { withoutComments } from "@/lib/copy/source-scan";

/**
 * THE INVITE HUB DRAWS ONLY WHAT IS TRUE (auditor A2, 6 October 2026).
 *
 * Vallo records a sign-up that comes from a code, but a member cannot read that
 * list, and the founder has not decided on any reward. So nothing here may be
 * reward shaped, and the two referral routes (declared, so kept) draw the
 * honest unavailable state. When Session 2 lands the reads (R-W6-1, R-W6-2) and
 * the founder decides on rewards, these are the tests to change, deliberately.
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
   * The hub links the referrals list again (7 October 2026: the founder could
   * not find it), and that is honest only because the list page draws the
   * unavailable state rather than a list or a count. It still draws no figure.
   */
  it("links the hub to the referrals list, which says it is not shown, and draws no figures", () => {
    const page = withoutComments(readFileSync(join(__dirname, "page.tsx"), "utf8"));
    expect(page).toContain('href="/settings/invite/referrals"');
    expect(page).toContain('href="/rewards"');
    expect(page).not.toContain("ReferralFigures");
    const list = withoutComments(readFileSync(join(__dirname, "referrals", "page.tsx"), "utf8"));
    expect(list).toContain("copy.referrals.emptyTitle");
    expect(list).not.toMatch(/ReferralList|ReferralFigures|readMyRewards/);
    expect(existsSync(join(__dirname, "referrals", "page.tsx"))).toBe(true);
    expect(existsSync(join(__dirname, "referrals", "[id]", "page.tsx"))).toBe(true);
  });
});
