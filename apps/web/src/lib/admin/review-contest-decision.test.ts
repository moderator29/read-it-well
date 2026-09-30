import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CONTEST_PUBLIC_NOTE_MAX,
  CONTEST_SERVICE_DOWN,
  checkContestDecision,
  contestRefusal,
  suggestedPublicNote,
} from "./review-contest-decision";

const ID = "00000000-0000-4000-8000-0000000000c1";

describe("checkContestDecision", () => {
  it("keeps without a note and drops any note it was sent", () => {
    expect(checkContestDecision({ contestId: ID, outcome: "keep", publicNote: "ignored" })).toEqual({
      ok: true,
      data: { contestId: ID, outcome: "keep", publicNote: null },
    });
  });

  it("hides only with a trimmed public note of 1 to 200 characters", () => {
    expect(checkContestDecision({ contestId: ID, outcome: "hide", publicNote: "  Removed by Vallo: threats  " })).toEqual({
      ok: true,
      data: { contestId: ID, outcome: "hide", publicNote: "Removed by Vallo: threats" },
    });
    const empty = checkContestDecision({ contestId: ID, outcome: "hide", publicNote: "   " });
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.fieldErrors?.publicNote).toBeTruthy();
    expect(checkContestDecision({ contestId: ID, outcome: "hide", publicNote: "x".repeat(CONTEST_PUBLIC_NOTE_MAX) }).ok).toBe(true);
    expect(checkContestDecision({ contestId: ID, outcome: "hide", publicNote: "x".repeat(CONTEST_PUBLIC_NOTE_MAX + 1) }).ok).toBe(false);
  });

  it("refuses an unknown outcome or a malformed id", () => {
    expect(checkContestDecision({ contestId: ID, outcome: "delete" as never }).ok).toBe(false);
    expect(checkContestDecision({ contestId: "not-a-uuid", outcome: "keep" }).ok).toBe(false);
  });
});

describe("contestRefusal", () => {
  it("is null on ok and a sentence for every status the function returns", () => {
    expect(contestRefusal("ok")).toBeNull();
    const sql = readFileSync(
      join(__dirname, "../../../../../supabase/migrations/20260930084402_host_c4_reviews_reach_a_hotel_and_a_fair_contest.sql"),
      "utf8",
    );
    const body = sql.slice(sql.indexOf("function public.decide_review_contest"));
    const statuses = [...body.slice(0, body.indexOf("$function$;")).matchAll(/'status', '([a-z_]+)'/g)].map((m) => m[1]);
    expect(statuses.length).toBeGreaterThan(3);
    for (const status of statuses) {
      if (status === "ok") continue;
      const words = contestRefusal(status);
      expect(words, status).not.toBe(CONTEST_SERVICE_DOWN);
      expect(words, status).not.toMatch(/—/);
    }
  });

  it("falls back to the service sentence for anything unexpected", () => {
    expect(contestRefusal(undefined)).toBe(CONTEST_SERVICE_DOWN);
    expect(contestRefusal("something_new")).toBe(CONTEST_SERVICE_DOWN);
  });
});

describe("suggestedPublicNote", () => {
  it("names the published reason and fits the database's limit", () => {
    expect(suggestedPublicNote("threats")).toBe("Removed by Vallo: threats or abuse");
    expect(suggestedPublicNote("personal_data").length).toBeLessThanOrEqual(CONTEST_PUBLIC_NOTE_MAX);
  });
});

describe("the wiring", () => {
  const read = (...p: string[]) => readFileSync(join(__dirname, ...p), "utf8");
  it("decides through the database function behind the moderation scope", () => {
    const action = read("review-contest-actions.ts");
    expect(action).toMatch(/requireAdmin\("moderation"\)/);
    expect(action).toMatch(/rpc\("decide_review_contest"/);
    expect(action).not.toMatch(/\.from\("reviews"\)[\s\S]*\.(update|delete)\(/);
  });
  it("offers the decision on the Reports lane in a confirm panel", () => {
    expect(read("..", "..", "app", "admin", "_lanes", "ReportsLane.tsx")).toMatch(/<ContestDecision /);
    expect(read("..", "..", "app", "admin", "_lanes", "ContestDecision.tsx")).toMatch(/<ConfirmPanel/);
  });
});
