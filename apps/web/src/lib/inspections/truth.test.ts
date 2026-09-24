import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { TRUTH_COLUMN, TRUTH_QUESTIONS, isTruthAnswer, truthComplete, truthOpen, truthRow } from "./truth";

const NOW = Date.parse("2026-09-24T18:00:00Z");
const PAST = "2026-09-24T10:00:00Z";
const FUTURE = "2026-09-25T10:00:00Z";

describe("when the truth questions open", () => {
  it("opens for the requester on an accepted or closed inspection once the time has passed", () => {
    expect(truthOpen("requester", "CONFIRMED", PAST, PAST, NOW)).toBe(true);
    expect(truthOpen("requester", "COMPLETED", PAST, PAST, NOW)).toBe(true);
  });

  it("stays shut before the agreed time, for the lister, and in every other state", () => {
    expect(truthOpen("requester", "CONFIRMED", FUTURE, PAST, NOW)).toBe(false);
    expect(truthOpen("lister", "COMPLETED", PAST, PAST, NOW)).toBe(false);
    for (const state of ["REQUESTED", "PROPOSED", "DECLINED", "WITHDRAWN"] as const) {
      expect(truthOpen("requester", state, PAST, PAST, NOW)).toBe(false);
    }
  });

  it("falls back to the requested time when no slot was set", () => {
    expect(truthOpen("requester", "CONFIRMED", null, PAST, NOW)).toBe(true);
  });
});

describe("the answers", () => {
  it("accepts exactly the values the table accepts", () => {
    expect(isTruthAnswer("yes")).toBe(true);
    expect(isTruthAnswer("no")).toBe(true);
    expect(isTruthAnswer("not_sure")).toBe(true);
    expect(isTruthAnswer("maybe")).toBe(false);
    expect(isTruthAnswer(undefined)).toBe(false);
  });

  it("is complete only with all four", () => {
    expect(truthComplete({ agentMatched: "yes", propertyMatched: "yes", available: "no" })).toBe(false);
    expect(truthComplete({ agentMatched: "yes", propertyMatched: "yes", available: "no", offPlatformAsk: "not_sure" })).toBe(true);
  });

  it("builds the row with the four columns and the two ids, and nothing else", () => {
    const row = truthRow("i1", "u1", { agentMatched: "yes", propertyMatched: "no", available: "not_sure", offPlatformAsk: "yes" });
    expect(row).toEqual({
      inspection_id: "i1",
      respondent_id: "u1",
      agent_matched: "yes",
      property_matched: "no",
      available: "not_sure",
      off_platform_ask: "yes",
    });
    expect("listing_id" in row).toBe(false);
  });

  it("names every column the migration creates", () => {
    const sql = readFileSync(
      join(__dirname, "../../../../../supabase/migrations/20260924130200_v05_four_truth_questions_close_every_inspection.sql"),
      "utf8",
    );
    for (const q of TRUTH_QUESTIONS) {
      expect(sql).toMatch(new RegExp(`${TRUTH_COLUMN[q]}\\s+text not null check \\(${TRUTH_COLUMN[q]} in \\('yes', 'no', 'not_sure'\\)\\)`));
    }
  });
});

describe("the wiring", () => {
  const root = join(__dirname, "..", "..");
  it("the inspections page hands the truth questions to both lists", () => {
    const page = readFileSync(join(root, "app/(app)/inspections/page.tsx"), "utf8");
    expect(page.match(/truth=\{truthFor\(row\)\}/g)?.length).toBe(2);
  });
  it("the card draws the questions above the room checklist", () => {
    const sheet = readFileSync(join(root, "components/app/inspections/InspectionSheet.tsx"), "utf8");
    expect(sheet.indexOf("<TruthQuestions")).toBeGreaterThan(0);
    expect(sheet.indexOf("<TruthQuestions")).toBeLessThan(sheet.indexOf('aria-label="Inspection checklist"'));
  });
});
