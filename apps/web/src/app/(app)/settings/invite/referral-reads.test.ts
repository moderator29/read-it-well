import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { withoutComments } from "@/lib/copy/source-scan";
import { readReferral, readReferralSummary } from "./referral-reads";

/**
 * THE REFERRAL HUB DRAWS ONLY WHAT IS TRUE. Today no function lets a member
 * read who joined with their code and no reward exists, so the reads answer
 * null, and the hub's page may not put a number, a reward or a referral on the
 * screen from anywhere else. When Session 2 lands the reads (R-W6-1, R-W6-2)
 * the first two tests are the ones to change, deliberately.
 */
describe("the referral hub's reads", () => {
  it("answer null while the data does not exist, never an empty list standing in for it", async () => {
    expect(await readReferralSummary()).toBeNull();
    expect(await readReferral("00000000-0000-4000-8000-000000000000")).toBeNull();
  });

  it("are the only source of figures on the hub: no literal amount or count in the page", () => {
    const page = withoutComments(readFileSync(join(__dirname, "page.tsx"), "utf8"));
    expect(page).not.toMatch(/earnedMinor=\{\s*\d/);
    expect(page).not.toMatch(/progress=\{\s*\{/);
    expect(page).toContain("readReferralSummary");
  });

  it("promises no reward and uses no scheme language, in any line it adds", () => {
    const copy = JSON.stringify(getDictionary("en").experienceAccount.invite).toLowerCase();
    for (const word of ["downline", "passive", "earn money", "invest", "returns", "commission", "guaranteed", "tier 2", "level 2"]) {
      /* "investment" appears once, in the sentence that says there is none. */
      if (word === "invest") {
        expect(copy.match(/invest/g)?.length).toBe(1);
        expect(copy).toContain("nothing here is an investment");
        continue;
      }
      expect(copy).not.toContain(word);
    }
  });
});
