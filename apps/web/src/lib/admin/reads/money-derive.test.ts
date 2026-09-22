import { describe, expect, it } from "vitest";
import {
  cleanShare,
  countdown,
  flowFromWhole,
  ledgerFromWhole,
  pagerItems,
  percentChange,
  pipelineFromWhole,
  pulseFromWhole,
  readPage,
  reconciliationFromAudit,
  reconciliationVerdict,
  wholeDays,
  type EntryLike,
} from "./money-derive";

const NOW = Date.parse("2026-09-22T12:00:00Z");
const DAY = 86_400_000;

function entry(partial: Partial<EntryLike> & { daysAgo: number }): EntryLike & {
  reference: string;
  note: string | null;
  ownerName: string | null;
} {
  return {
    id: `e${partial.daysAgo}-${partial.amountMinor ?? 0}-${partial.direction ?? "credit"}`,
    direction: partial.direction ?? "credit",
    amountMinor: partial.amountMinor ?? 100_000,
    status: partial.status ?? "COMPLETED",
    kind: partial.kind ?? "deposit",
    createdAt: new Date(NOW - partial.daysAgo * DAY).toISOString(),
    reference: "ref",
    note: null,
    ownerName: null,
  };
}

describe("pulseFromWhole", () => {
  const entries = [
    entry({ daysAgo: 1, amountMinor: 50_000 }),
    entry({ daysAgo: 2, amountMinor: 20_000, direction: "debit" }),
    entry({ daysAgo: 3, amountMinor: 999_999, status: "FAILED" }),
    entry({ daysAgo: 10, amountMinor: 100_000 }),
  ];
  const pulse = pulseFromWhole(entries, NOW);

  it("counts only settled money in the float", () => {
    expect(pulse.floatMinor).toBe(130_000);
    expect(pulse.floatWeekAgoMinor).toBe(100_000);
  });
  it("splits settlement into this week and the week before", () => {
    expect(pulse.settledMinor.thisWeek).toBe(70_000);
    expect(pulse.settledMinor.lastWeek).toBe(100_000);
    expect(pulse.hasLastWeek).toBe(true);
  });
});

describe("percentChange", () => {
  it("draws nothing against an empty or absent period", () => {
    expect(percentChange(10, 0)).toBeNull();
    expect(percentChange(10, null)).toBeNull();
  });
  it("rounds a real change", () => {
    expect(percentChange(112, 100)).toBe(12);
    expect(percentChange(92, 100)).toBe(-8);
  });
});

describe("flowFromWhole", () => {
  it("starts at the first month with money, not twelve months back", () => {
    const flow = flowFromWhole([entry({ daysAgo: 40 }), entry({ daysAgo: 1, direction: "debit", amountMinor: 30_000 })], NOW);
    expect(flow.months.map((m) => m.month)).toEqual(["2026-08", "2026-09"]);
    expect(flow.months[0]).toMatchObject({ inMinor: 100_000, outMinor: 0 });
    expect(flow.months[1]).toMatchObject({ inMinor: 0, outMinor: 30_000 });
    expect(flow.last30Days).toEqual({ inMinor: 0, outMinor: 30_000 });
  });
  it("draws no months at all when nothing has settled", () => {
    expect(flowFromWhole([entry({ daysAgo: 1, status: "FAILED" })], NOW).months).toEqual([]);
  });
});

describe("ledgerFromWhole", () => {
  const newestFirst = [
    entry({ daysAgo: 1, amountMinor: 20_000, direction: "debit" }),
    entry({ daysAgo: 2, amountMinor: 5_000, status: "PENDING", direction: "debit" }),
    entry({ daysAgo: 3, amountMinor: 100_000 }),
  ];
  it("walks the float back entry by entry, holding still on unsettled rows", () => {
    const page = ledgerFromWhole(newestFirst, 1, 10);
    expect(page.rows.map((r) => r.balanceAfterMinor)).toEqual([80_000, 100_000, 100_000]);
    expect(page.total).toBe(3);
  });
  it("pages the whole list and clamps a page past the end", () => {
    const second = ledgerFromWhole(newestFirst, 9, 2);
    expect(second.page).toBe(2);
    expect(second.rows).toHaveLength(1);
    expect(second.rows[0]?.balanceAfterMinor).toBe(100_000);
  });
});

describe("pagerItems", () => {
  it("prints every page up to seven", () => {
    expect(pagerItems(1, 3).map((i) => (i.kind === "page" ? i.page : "..."))).toEqual([1, 2, 3]);
    expect(pagerItems(1, 1)).toEqual([]);
  });
  it("draws the renders' 1 2 3 4 5 ... 12", () => {
    expect(pagerItems(1, 12).map((i) => (i.kind === "page" ? i.page : "..."))).toEqual([1, 2, 3, 4, 5, "...", 12]);
  });
  it("keeps first and last around a middle page", () => {
    expect(pagerItems(6, 12).map((i) => (i.kind === "page" ? i.page : "..."))).toEqual([1, "...", 4, 5, 6, 7, 8, "...", 12]);
  });
});

describe("readPage", () => {
  it("reads only positive whole numbers", () => {
    expect(readPage("3")).toBe(3);
    expect(readPage("0")).toBe(1);
    expect(readPage("2.5")).toBe(1);
    expect(readPage("x")).toBe(1);
    expect(readPage(undefined)).toBe(1);
  });
});

describe("countdown and wholeDays", () => {
  it("prints days and hours, then hours and minutes, then due", () => {
    expect(countdown(new Date(NOW + 4 * DAY + 12 * 3_600_000).toISOString(), NOW)?.label).toBe("4d 12h");
    expect(countdown(new Date(NOW + 3 * 3_600_000 + 20 * 60_000).toISOString(), NOW)?.label).toBe("3h 20m");
    expect(countdown(new Date(NOW - 1000).toISOString(), NOW)).toEqual({ label: "due", due: true });
    expect(countdown(null, NOW)).toBeNull();
  });
  it("counts whole days held", () => {
    expect(wholeDays(new Date(NOW - 3.5 * DAY).toISOString(), NOW)).toBe(3);
    expect(wholeDays(null, NOW)).toBeNull();
  });
});

describe("pipelineFromWhole", () => {
  it("counts every state and purpose and orders activity newest first", () => {
    const pipeline = pipelineFromWhole([
      {
        id: "a",
        state: "HELD",
        purpose: "rent_deposit",
        amountMinor: 500,
        listingTitle: null,
        createdAt: new Date(NOW - 3 * DAY).toISOString(),
        heldAt: new Date(NOW - 2 * DAY).toISOString(),
        settledAt: null,
      },
      {
        id: "b",
        state: "REFUNDED",
        purpose: "first_rent",
        amountMinor: 700,
        listingTitle: "Flat",
        createdAt: new Date(NOW - 5 * DAY).toISOString(),
        heldAt: new Date(NOW - 4 * DAY).toISOString(),
        settledAt: new Date(NOW - 1 * DAY).toISOString(),
      },
    ]);
    expect(pipeline.total).toBe(2);
    expect(pipeline.byState.HELD).toEqual({ count: 1, amountMinor: 500 });
    expect(pipeline.byState.DISPUTED.count).toBe(0);
    expect(pipeline.byPurpose.first_rent.count).toBe(1);
    expect(pipeline.recent[0]).toMatchObject({ escrowId: "b", event: "refunded" });
    expect(pipeline.recent[1]).toMatchObject({ escrowId: "a", event: "held" });
  });
});

describe("reconciliation", () => {
  const run = (hoursAgo: number, outcome: string) => ({
    createdAt: new Date(NOW - hoursAgo * 3_600_000).toISOString(),
    metadata: { outcome },
  });

  it("reads the newest clean run and the share of clean runs on the page", () => {
    const health = reconciliationFromAudit([run(3, "needs_attention"), run(1, "clean"), run(2, "clean")]);
    expect(health.runs).toBe(3);
    expect(health.clean).toBe(2);
    expect(health.lastRunAt).toBe(run(1, "clean").createdAt);
    expect(health.lastCleanAt).toBe(run(1, "clean").createdAt);
    expect(health.pageOnly).toBe(true);
    expect(cleanShare(health)).toBe(67);
    expect(reconciliationVerdict(health, NOW, 3)).toBe("healthy");
  });
  it("reports silence before any share of clean runs", () => {
    const health = reconciliationFromAudit([run(5, "clean")]);
    expect(reconciliationVerdict(health, NOW, 3)).toBe("quiet");
  });
  it("flags a last run that needed a person", () => {
    const health = reconciliationFromAudit([run(1, "needs_attention"), run(2, "clean")]);
    expect(reconciliationVerdict(health, NOW, 3)).toBe("attention");
  });
  it("says never when there is no history", () => {
    const health = reconciliationFromAudit([]);
    expect(reconciliationVerdict(health, NOW, 3)).toBe("never");
    expect(cleanShare(health)).toBeNull();
  });
});

describe("pipelineFromWhole with every transition", () => {
  it("lists funding, release requests and disputes when the read carries them", () => {
    const at = (h: number) => new Date(NOW - h * 3_600_000).toISOString();
    const pipeline = pipelineFromWhole([
      {
        id: "c",
        state: "DISPUTED",
        purpose: "rent_deposit",
        amountMinor: 1,
        listingTitle: null,
        createdAt: at(10),
        heldAt: at(8),
        settledAt: null,
        fundedAt: at(9),
        releaseRequestedAt: at(3),
        releasedAt: null,
        refundedAt: null,
        disputedAt: at(1),
        resolvedAt: null,
      },
    ]);
    expect(pipeline.recent.map((e) => e.event)).toEqual(["disputed", "release_requested", "held", "funded", "opened"]);
  });
});

describe("reconciliation over a window", () => {
  it("is not page-only when every run in the window was read", () => {
    const health = reconciliationFromAudit([{ createdAt: new Date(NOW).toISOString(), metadata: { outcome: "clean" } }], 7);
    expect(health.pageOnly).toBe(false);
    expect(health.windowDays).toBe(7);
  });
  it("reads a job silent for the whole window as quiet, not never, once its last run is known", () => {
    const health = reconciliationFromAudit([], 7);
    health.lastRunAt = new Date(NOW - 9 * DAY).toISOString();
    expect(reconciliationVerdict(health, NOW, 3)).toBe("quiet");
  });
});
