import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import type { RewardsPolicy } from "@/lib/referral/rewards";
import { qualifySentence, runningInviteLines } from "./invite-rewards";

const policy = { rewardPerReferralMinor: 8000, monthlyCap: 1500, reviewDays: 7, steps: ["phone_verified", "onboarding_completed"] } as unknown as RewardsPolicy;
const PLAIN = "Your invite counts once they verify their phone number.";

describe("the referral surfaces say an invite counts once the phone is verified (13 October 2026)", () => {
  it("states the rule in plain words, in English", () => {
    expect(getDictionary("en").fixesV2.referral.countsOnPhone).toBe(PLAIN);
  });

  it("is a real translation in Yoruba, Igbo and Hausa, not a copy of the English", () => {
    for (const locale of ["yo", "ig", "ha"] as const) {
      const line = getDictionary(locale).fixesV2.referral.countsOnPhone;
      expect(line, locale).not.toBe("");
      expect(line, locale).not.toBe(PLAIN);
    }
  });

  it("is appended to the qualify sentence only when the caller passes it", () => {
    expect(qualifySentence(policy, "en", PLAIN).endsWith(PLAIN)).toBe(true);
    expect(qualifySentence(policy, "en")).not.toContain(PLAIN);
  });

  it("is on the invite hub and How invites work, through the one list of lines", () => {
    for (const locale of ["en", "yo", "ig", "ha"] as const) {
      const t = getDictionary(locale);
      const earn = runningInviteLines(policy, t, locale).find((line) => line.key === "earn");
      expect(earn?.body, locale).toContain(t.fixesV2.referral.countsOnPhone);
    }
  });
});
