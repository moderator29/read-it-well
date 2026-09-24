import { describe, expect, it } from "vitest";
import { dueClock, isAboveThreshold, laneOrder, readThresholdRow, THRESHOLD_MINOR, type ThresholdRow } from "./threshold-model";

describe("SCUML item 7 thresholds", () => {
  it("reports strictly above N5m for an individual and N10m for a corporate", () => {
    expect(THRESHOLD_MINOR).toEqual({ individual: 500_000_000, corporate: 1_000_000_000 });
    expect(isAboveThreshold(500_000_000, "individual")).toBe(false);
    expect(isAboveThreshold(500_000_001, "individual")).toBe(true);
    expect(isAboveThreshold(700_000_000, "corporate")).toBe(false);
    expect(isAboveThreshold(1_000_000_001, "corporate")).toBe(true);
  });
});

describe("dueClock", () => {
  const now = new Date("2026-09-24T12:00:00Z");
  it("has no clock once closed", () => {
    expect(dueClock("2026-09-20T12:00:00Z", "closed", now)).toEqual({ stage: "done" });
  });
  it("counts whole days overdue", () => {
    expect(dueClock("2026-09-24T11:00:00Z", "open", now)).toEqual({ stage: "overdue", days: 1 });
    expect(dueClock("2026-09-21T12:00:00Z", "awaiting_approval", now)).toEqual({ stage: "overdue", days: 3 });
  });
  it("names the reminder stage", () => {
    expect(dueClock("2026-09-25T06:00:00Z", "open", now)).toMatchObject({ stage: "1d", hours: 18 });
    expect(dueClock("2026-09-26T12:00:00Z", "open", now)).toMatchObject({ stage: "3d", days: 2 });
    expect(dueClock("2026-10-01T12:00:00Z", "open", now)).toMatchObject({ stage: "later", days: 7 });
  });
});

describe("readThresholdRow", () => {
  const base = {
    id: "e1",
    kind: "single",
    source: "booking",
    source_id: "t1",
    amount_minor: 600_000_000,
    threshold_minor: 500_000_000,
    party_id: "p1",
    party_class: "individual",
    occurred_at: "2026-09-20T10:00:00Z",
    due_at: "2026-09-27T10:00:00Z",
    state: "awaiting_approval",
    movements: 1,
    decision_id: "d1",
    decision: "reported",
    external_reference: "NFIU-1",
    reported_on: "2026-09-22",
    decided_by: "s1",
    decided_at: "2026-09-22T09:00:00Z",
  };
  it("reads a row with its pending decision", () => {
    const row = readThresholdRow(base);
    expect(row?.decision).toMatchObject({ id: "d1", kind: "reported", reference: "NFIU-1", verdict: null });
  });
  it("refuses a row missing what the clock needs, and a fractional amount", () => {
    expect(readThresholdRow({ ...base, due_at: null })).toBeNull();
    expect(readThresholdRow({ ...base, amount_minor: 1.5 })).toBeNull();
    expect(readThresholdRow({ ...base, party_class: "firm" })).toBeNull();
  });
  it("orders open, then awaiting, then closed, each by due date", () => {
    const rows = [
      { ...(readThresholdRow({ ...base, id: "c", state: "closed", due_at: "2026-09-01T00:00:00Z" }) as ThresholdRow) },
      { ...(readThresholdRow({ ...base, id: "b", state: "open", due_at: "2026-09-30T00:00:00Z" }) as ThresholdRow) },
      { ...(readThresholdRow({ ...base, id: "a", state: "open", due_at: "2026-09-25T00:00:00Z" }) as ThresholdRow) },
      { ...(readThresholdRow({ ...base, id: "w", state: "awaiting_approval" }) as ThresholdRow) },
    ];
    expect(laneOrder(rows).map((row) => row.id)).toEqual(["a", "b", "w", "c"]);
  });
});

describe("the database twin", () => {
  it("holds the same thresholds and seven days as the migration", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const sql = readFileSync(
      resolve(__dirname, "../../../../../supabase/migrations/20260924174000_scuml_item_7_threshold_reports.sql"),
      "utf8",
    );
    expect(sql).toContain(`then ${THRESHOLD_MINOR.corporate}::bigint else ${THRESHOLD_MINOR.individual}::bigint`);
    expect(sql).toContain("p_occurred_at + interval '7 days'");
    expect(sql).toContain("SCUML item 7");
  });
});
