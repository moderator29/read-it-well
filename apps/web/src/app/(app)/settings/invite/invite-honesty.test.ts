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

  it("no longer links the hub to the referrals list or draws figures", () => {
    const page = withoutComments(readFileSync(join(__dirname, "page.tsx"), "utf8"));
    expect(page).not.toContain("/settings/invite/referrals");
    expect(page).not.toContain("ReferralFigures");
    expect(existsSync(join(__dirname, "referrals", "page.tsx"))).toBe(true);
    expect(existsSync(join(__dirname, "referrals", "[id]", "page.tsx"))).toBe(true);
  });
});
