import { describe, expect, it } from "vitest";
import { assembleByRole, assemblePulse, listerRole, rangeBuckets } from "./overview";
import { thinnest } from "./analytics";
import { assembleRunDays } from "./operations";
import {
  bucketSum,
  lagosDay,
  lagosDayStartIso,
  lagosMonth,
  lastDays,
  lastMonths,
  lastWeeks,
  readAll,
} from "./shared";

const NOW = Date.parse("2026-09-22T23:30:00Z"); // 00:30 on 23 September in Lagos

describe("Lagos calendar", () => {
  it("puts an instant on its Lagos day, an hour ahead of UTC", () => {
    expect(lagosDay(NOW)).toBe("2026-09-23");
    expect(lagosDay("2026-09-22T22:59:59Z")).toBe("2026-09-22");
    expect(lagosMonth("2026-08-31T23:30:00Z")).toBe("2026-09");
    expect(lagosDayStartIso("2026-09-23")).toBe("2026-09-22T23:00:00.000Z");
  });
  it("lists the last days, weeks and months oldest first, ending now", () => {
    expect(lastDays(3, NOW)).toEqual(["2026-09-21", "2026-09-22", "2026-09-23"]);
    expect(lastMonths(3, NOW)).toEqual(["2026-07", "2026-08", "2026-09"]);
    expect(lastMonths(2, Date.parse("2026-01-10T12:00:00Z"))).toEqual(["2025-12", "2026-01"]);
    const weeks = lastWeeks(2, NOW);
    expect(weeks).toEqual(["2026-09-10", "2026-09-17"]);
  });
});

describe("bucketSum", () => {
  it("drops values before the first bucket and keeps zero buckets", () => {
    const keys = ["2026-09-01", "2026-09-08", "2026-09-15"];
    const sums = bucketSum(
      [
        { key: "2026-08-31", amount: 9 },
        { key: "2026-09-01", amount: 1 },
        { key: "2026-09-07", amount: 2 },
        { key: "2026-09-20", amount: 4 },
      ],
      keys,
    );
    expect(sums).toEqual([3, 0, 4]);
  });
});

describe("readAll", () => {
  it("pages until a short page and refuses rather than truncating", async () => {
    const rows = Array.from({ length: 2500 }, (_, i) => i);
    const page = async (from: number, to: number) => ({ data: rows.slice(from, to + 1), error: null });
    expect((await readAll(page))?.length).toBe(2500);
    expect(await readAll(page, 2000)).toBeNull();
    expect(await readAll(async () => ({ data: null, error: new Error("x") }))).toBeNull();
  });
});

describe("assemblePulse", () => {
  const days = lastDays(14, NOW);
  it("sums today, yesterday and the two weeks from the same rows", () => {
    const pulse = assemblePulse({
      days,
      liveNow: 3,
      liveWeekAgo: 1,
      publishedAt: ["2026-09-01T10:00:00Z", "2026-09-20T10:00:00Z", "2026-09-22T23:10:00Z"],
      signups: ["2026-09-22T23:10:00Z", "2026-09-22T10:00:00Z", "2026-09-22T11:00:00Z"],
      submitted: ["2026-09-12T10:00:00Z", "2026-09-18T10:00:00Z"],
      collected: [
        { key: "2026-09-23", amount: 500 },
        { key: "2026-09-22", amount: 200 },
        { key: "2026-09-12", amount: 100 },
      ],
    });
    expect(pulse.signupsToday).toBe(1);
    expect(pulse.signupsYesterday).toBe(2);
    expect(pulse.collectedTodayMinor).toBe(500);
    expect(pulse.collectedYesterdayMinor).toBe(200);
    expect(pulse.collectedWeekMinor).toBe(700);
    expect(pulse.collectedPrevWeekMinor).toBe(100);
    expect(pulse.newSupplyWeek).toBe(1);
    expect(pulse.newSupplyPrevWeek).toBe(1);
    expect(pulse.daily).toHaveLength(14);
    expect(pulse.daily.at(-1)!.liveAtClose).toBe(3);
    expect(pulse.daily.at(-2)!.liveAtClose).toBe(2);
  });
  it("draws an empty platform as zeros, never as a missing day", () => {
    const pulse = assemblePulse({ days, liveNow: 0, liveWeekAgo: 0, publishedAt: [], signups: [], submitted: [], collected: [] });
    expect(pulse.daily.every((d) => d.signups === 0 && d.collectedMinor === 0)).toBe(true);
    expect(pulse.collectedWeekMinor).toBe(0);
  });
});

describe("range buckets", () => {
  it("draws twelve months, thirteen weeks or thirty days", () => {
    expect(rangeBuckets("12m", NOW).keys).toHaveLength(12);
    expect(rangeBuckets("12m", NOW).keys.at(-1)).toBe("2026-09-01");
    expect(rangeBuckets("90d", NOW).keys).toHaveLength(13);
    expect(rangeBuckets("30d", NOW).keys).toHaveLength(30);
    expect(rangeBuckets("30d", NOW).fromIso).toBe(lagosDayStartIso("2026-08-25"));
  });
});

describe("lister role", () => {
  it("takes the door the lister came through, then falls back on the agent type", () => {
    expect(listerRole("owner", "individual")).toBe("owner");
    expect(listerRole("firm", "individual")).toBe("firm");
    expect(listerRole(null, "business")).toBe("firm");
    expect(listerRole(null, "individual")).toBe("agent");
    expect(listerRole("nonsense", null)).toBe("agent");
  });
  it("counts each listing once in its Lagos month", () => {
    const roles = new Map([
      ["a", "owner" as const],
      ["b", "firm" as const],
    ]);
    const out = assembleByRole(
      ["2026-08", "2026-09"],
      [
        { created_at: "2026-08-31T23:30:00Z", agent_id: "a" },
        { created_at: "2026-08-10T10:00:00Z", agent_id: "b" },
        { created_at: "2026-07-10T10:00:00Z", agent_id: "b" },
        { created_at: "2026-09-02T10:00:00Z", agent_id: null },
      ],
      roles,
    );
    expect(out.months).toEqual([
      { month: "2026-08", owner: 0, agent: 0, firm: 1 },
      { month: "2026-09", owner: 1, agent: 1, firm: 0 },
    ]);
  });
});

describe("thin areas", () => {
  it("groups by area and city, fewest first", () => {
    const rows = thinnest(
      [
        { area: "Lekki", city: "Lagos" },
        { area: "lekki ", city: "Lagos" },
        { area: "Bwari", city: "Abuja" },
        { area: "Yaba", city: "Lagos" },
        { area: null, city: "Lagos" },
      ],
      2,
    );
    expect(rows).toEqual([
      { area: "Bwari", city: "Abuja", count: 1 },
      { area: "Yaba", city: "Lagos", count: 1 },
    ]);
  });
});

describe("run days", () => {
  it("counts runs and failures per Lagos day", () => {
    const out = assembleRunDays(
      ["2026-09-22", "2026-09-23"],
      [
        { action: "cron.hold-sweep.ok", created_at: "2026-09-22T10:00:00Z" },
        { action: "cron.hold-sweep.failed", created_at: "2026-09-22T23:05:00Z" },
        { action: "cron.pg-cron-watch.attention", created_at: "2026-09-22T23:20:00Z" },
      ],
    );
    expect(out).toEqual([
      { day: "2026-09-22", runs: 1, failed: 0 },
      { day: "2026-09-23", runs: 2, failed: 1 },
    ]);
  });
});
