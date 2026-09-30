import { describe, expect, it, vi } from "vitest";
import { calendarSyncEnabled, pullFeed, syncAll, syncIntervalMinutes, syncOne, type Fetcher, type Resolver } from "./calendar-sync";

const PUBLIC: Resolver = async () => ["54.230.10.10"];

const CAL = "BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20261003\r\nDTEND;VALUE=DATE:20261005\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";

function res(status: number, body = "", headers: Record<string, string> = {}) {
  return { status, headers: { get: (n: string) => headers[n.toLowerCase()] ?? null }, text: async () => body };
}

describe("the switch and the interval", () => {
  it("is off unless switched on", () => {
    expect(calendarSyncEnabled({})).toBe(false);
    expect(calendarSyncEnabled({ CALENDAR_SYNC_ENABLED: "0" })).toBe(false);
    expect(calendarSyncEnabled({ CALENDAR_SYNC_ENABLED: "true" })).toBe(true);
  });
  it("defaults to thirty minutes and stays within bounds", () => {
    expect(syncIntervalMinutes({})).toBe(30);
    expect(syncIntervalMinutes({ CALENDAR_SYNC_INTERVAL_MINUTES: "5" })).toBe(15);
    expect(syncIntervalMinutes({ CALENDAR_SYNC_INTERVAL_MINUTES: "99999" })).toBe(1440);
  });
});

describe("pulling a link", () => {
  it("follows a redirect that stays on the list, refuses one that leaves it", async () => {
    const good: Fetcher = vi.fn(async (url: string) =>
      url.includes("old") ? res(302, "", { location: "https://www.airbnb.com/calendar/new.ics" }) : res(200, CAL),
    );
    expect(await pullFeed(good, "https://www.airbnb.com/calendar/old.ics", PUBLIC)).toEqual({ ok: true, text: CAL });

    const evil: Fetcher = vi.fn(async () => res(302, "", { location: "http://169.254.169.254/" }));
    const out = await pullFeed(evil, "https://www.airbnb.com/calendar/old.ics", PUBLIC);
    expect(out.ok).toBe(false);
    expect(evil).toHaveBeenCalledTimes(1);
  });

  it("refuses a name that resolves inside (SSRF), without fetching", async () => {
    const fetcher = vi.fn(async () => res(200, CAL));
    for (const inside of [["10.0.0.5"], ["169.254.169.254"], ["::1"], ["54.1.1.1", "192.168.1.9"], []]) {
      const out = await pullFeed(fetcher, "https://www.airbnb.com/c.ics", async () => inside);
      expect(out.ok).toBe(false);
    }
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("stops reading a body past the size cap", async () => {
    const big = "x".repeat(2_000_001);
    const fetcher: Fetcher = async () => ({
      status: 200,
      headers: { get: () => null },
      text: async () => big,
      body: new Response(big).body,
    }) as never;
    expect(await pullFeed(fetcher, "https://www.airbnb.com/c.ics", PUBLIC)).toEqual({ ok: false, reason: "That calendar is too large to read." });
  });

  it("says why in the host's words", async () => {
    const gone: Fetcher = async () => res(404);
    expect(await pullFeed(gone, "https://www.airbnb.com/c.ics", PUBLIC)).toEqual({ ok: false, reason: "The site says this calendar link no longer exists." });
    const slow: Fetcher = async () => {
      throw new Error("aborted");
    };
    expect((await pullFeed(slow, "https://www.airbnb.com/c.ics", PUBLIC)).ok).toBe(false);
  });
});

describe("one sync", () => {
  it("hands the nights to the database", async () => {
    const apply = vi.fn(async () => {});
    const out = await syncOne(async () => res(200, CAL), apply, { id: "i1", url: "https://www.airbnb.com/c.ics", source: "airbnb" }, PUBLIC, new Date("2026-09-30T08:00:00Z"));
    expect(out).toEqual({ id: "i1", ok: true, nights: 2 });
    expect(apply).toHaveBeenCalledWith("i1", ["2026-10-03", "2026-10-04"], null);
  });

  it("hands a failure to the database instead of nights", async () => {
    const apply = vi.fn(async () => {});
    const out = await syncOne(async () => res(200, "<html>login</html>"), apply, { id: "i2", url: "https://www.airbnb.com/c.ics", source: "airbnb" }, PUBLIC);
    expect(out.ok).toBe(false);
    expect(apply).toHaveBeenCalledWith("i2", null, "That link did not return a calendar.");
  });
});

describe("a run", () => {
  it("stops starting pulls once the budget is spent", async () => {
    let t = 0;
    const rows = [1, 2, 3, 4].map((n) => ({ id: `i${n}`, url: "https://www.airbnb.com/c.ics", source: "airbnb" }));
    const { outcomes, skipped } = await syncAll(rows, async (row) => {
      t += 30;
      return { id: row.id, ok: true, nights: 0 };
    }, { concurrency: 1, budgetMs: 50, now: () => t });
    expect(outcomes).toHaveLength(2);
    expect(skipped).toBe(2);
  });
});
