import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { CONTEST_CRITERIA, averageRating, contestWords, criterionLabel, isContestCriterion } from "./review-contest";

describe("the contest criteria", () => {
  it("are exactly the five the database accepts", () => {
    /* Pending until the lead applies it, then renamed into migrations/. */
    const root = join(__dirname, "..", "..", "..", "..", "..", "supabase", "migrations");
    const find = (dir: string) => readdirSync(dir).find((f) => f.endsWith("host_c4_reviews_reach_a_hotel_and_a_fair_contest.sql"));
    const inPending = find(join(root, "pending"));
    const file = inPending ? join(root, "pending", inPending) : join(root, find(root) ?? "missing.sql");
    const sql = readFileSync(file, "utf8");
    const check = /review_contests_criterion_chk check \(criterion in\s*\(([^)]*)\)/.exec(sql)?.[1] ?? "";
    const inDb = [...check.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
    expect([...CONTEST_CRITERIA].sort()).toEqual(inDb);
  });

  it("names each one and refuses anything else", () => {
    expect(isContestCriterion("threats")).toBe(true);
    expect(isContestCriterion("i_dont_like_it")).toBe(false);
    expect(criterionLabel("personal_data")).toBe("Shares personal information");
    expect(criterionLabel("i_dont_like_it")).toBe("Other");
  });

  it("gives the console and the stored note the label the host reads in English", () => {
    const words = getDictionary("en").experienceHost.reviewCard.criteria;
    for (const value of CONTEST_CRITERIA) {
      expect(words[value].label).toBe(criterionLabel(value));
      expect(words[value].hint.length).toBeGreaterThan(0);
    }
  });

  it("says what happened in words", () => {
    const words = getDictionary("en").experienceHost.reviewCard.contestStatus;
    expect(contestWords("open", null, words)).toBe("With Vallo. The review stays up while we look.");
    expect(contestWords("hidden", "Removed by Vallo: personal information", words)).toBe(
      "Hidden by Vallo: \u201cRemoved by Vallo: personal information\u201d",
    );
    expect(contestWords("hidden", null, words)).toBe("Hidden by Vallo.");
    expect(contestWords("kept", null, words)).toBe("Vallo looked and kept it: it meets the review standards.");
    expect(contestWords("withdrawn", null, words)).toBe("You withdrew the request. The review stays up.");
    expect(contestWords("other", null, words)).toBe("");
  });

  it("averages to one decimal, and says nothing with nothing", () => {
    expect(averageRating([5, 4, 4])).toBe(4.3);
    expect(averageRating([])).toBeNull();
  });
});
