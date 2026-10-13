import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  dayCounts,
  historyOf,
  isNarrowed,
  narrowVisits,
  readVisitQuery,
  visitsHref,
  type AdminVisitRow,
} from "./visits-model";

const L1 = "11111111-1111-4111-8111-111111111111";
const L2 = "22222222-2222-4222-8222-222222222222";
const V1 = "33333333-3333-4333-8333-333333333333";

function visit(over: Partial<AdminVisitRow>): AdminVisitRow {
  return {
    id: V1,
    listingId: "44444444-4444-4444-8444-444444444444",
    listingTitle: "Two bed in Yaba",
    city: "Lagos",
    area: "Yaba",
    listerId: L1,
    listerName: "Ade",
    renterId: "55555555-5555-4555-8555-555555555555",
    renterName: "Bola",
    state: "CONFIRMED",
    mode: "in_person",
    at: "2026-10-17T13:00:00Z",
    asked: false,
    requestedAt: "2026-10-17T12:00:00Z",
    slotAt: "2026-10-17T13:00:00Z",
    createdAt: "2026-10-10T09:00:00Z",
    respondedAt: "2026-10-11T09:00:00Z",
    confirmedAt: "2026-10-12T09:00:00Z",
    completedAt: null,
    outcome: null,
    ...over,
  };
}

describe("the desk's address", () => {
  const today = "2026-10-13";

  it("reads a clean query and drops anything malformed", () => {
    expect(readVisitQuery({}, today)).toEqual({
      view: "week", day: today, state: null, mode: null, city: null, lister: null, visit: null,
    });
    expect(
      readVisitQuery(
        { view: "month", day: "2026-11-02", state: "missed", mode: "video", city: " Abuja ", lister: L1, visit: V1 },
        today,
      ),
    ).toEqual({ view: "month", day: "2026-11-02", state: "missed", mode: "video", city: "Abuja", lister: L1, visit: V1 });
    expect(
      readVisitQuery({ view: "year", day: "2026-02-30", state: "DECLINED", mode: "phone", lister: "1 or 1=1", visit: "x" }, today),
    ).toEqual({ view: "week", day: today, state: null, mode: null, city: null, lister: null, visit: null });
  });

  it("writes the address back, leaving out the defaults", () => {
    const query = readVisitQuery({ state: "confirmed" }, today);
    expect(visitsHref("/admin/bookings/visits", query)).toBe("/admin/bookings/visits?day=2026-10-13&state=confirmed");
    expect(visitsHref("/admin/bookings/visits", query, { view: "month", visit: V1 })).toBe(
      `/admin/bookings/visits?view=month&day=2026-10-13&state=confirmed&visit=${V1}`,
    );
    expect(isNarrowed(query)).toBe(true);
    expect(isNarrowed(readVisitQuery({ visit: V1 }, today))).toBe(false);
  });
});

describe("the filters", () => {
  const rows = [
    visit({ id: "a", state: "REQUESTED", mode: "video", city: "Abuja", listerId: L2 }),
    visit({ id: "b", state: "COMPLETED" }),
    visit({ id: "c", state: "NO_SHOW", city: "lagos" }),
    visit({ id: "d", state: "DECLINED" }),
  ];
  const base = readVisitQuery({}, "2026-10-13");

  it("narrow by state, mode, city and lister, together", () => {
    expect(narrowVisits(rows, base).map((r) => r.id)).toEqual(["a", "b", "c", "d"]);
    expect(narrowVisits(rows, { ...base, state: "done" }).map((r) => r.id)).toEqual(["b"]);
    expect(narrowVisits(rows, { ...base, state: "missed" }).map((r) => r.id)).toEqual(["c"]);
    expect(narrowVisits(rows, { ...base, mode: "video" }).map((r) => r.id)).toEqual(["a"]);
    expect(narrowVisits(rows, { ...base, city: "Lagos" }).map((r) => r.id)).toEqual(["b", "c", "d"]);
    expect(narrowVisits(rows, { ...base, lister: L2 }).map((r) => r.id)).toEqual(["a"]);
    expect(narrowVisits(rows, { ...base, lister: L2, mode: "in_person" })).toEqual([]);
  });

  it("counts visits per Lagos day", () => {
    const counts = dayCounts([
      visit({ id: "a", at: "2026-10-16T22:30:00Z" }),
      visit({ id: "b", at: "2026-10-16T23:30:00Z" }),
      visit({ id: "c", at: "2026-10-17T10:00:00Z" }),
    ]);
    expect([...counts.entries()].sort()).toEqual([
      ["2026-10-16", 1],
      ["2026-10-17", 2],
    ]);
  });
});

describe("a visit's history", () => {
  it("is drawn only from the timestamps the record keeps, oldest first", () => {
    expect(historyOf(visit({}), null).map((s) => s.key)).toEqual(["requested", "answered", "confirmed"]);
    expect(historyOf(visit({ respondedAt: null, confirmedAt: null, state: "REQUESTED" }), []).map((s) => s.key)).toEqual(["requested"]);
  });

  it("adds a no-show's report, dispute and decision", () => {
    const steps = historyOf(visit({ state: "NO_SHOW" }), [
      {
        absentRole: "requester",
        reportedAt: "2026-10-17T15:00:00Z",
        disputedAt: "2026-10-18T09:00:00Z",
        resolvedAt: "2026-10-19T09:00:00Z",
        resolution: "overturned",
      },
    ]);
    expect(steps.map((s) => s.key)).toEqual([
      "requested", "answered", "confirmed", "noShowReported", "noShowDisputed", "noShowResolved",
    ]);
  });
});

describe("least privilege in what the console reads", () => {
  const source = readFileSync(new URL("./visits.ts", import.meta.url), "utf8");
  const selects = [...source.matchAll(/select\(\s*"([^"]+)"/g), ...source.matchAll(/COLUMNS =\s*"([^"]+)"/g)].map((m) => m[1]!);

  it("reads through the operations door and never the service role directly", () => {
    expect(source).toContain('adminReader("operations")');
    expect(source).not.toContain("createAdminClient");
  });

  it("asks for no contact detail, no message and no member's own words", () => {
    expect(selects.length).toBeGreaterThan(3);
    for (const columns of selects) {
      expect(columns).not.toMatch(/email|phone|mobile|address|dispute_note|note|body|message/);
    }
    expect(source).not.toMatch(/from\("(messages|conversations|notifications)"\)/);
  });

  it("never writes", () => {
    expect(source).not.toMatch(/\.(insert|update|upsert|delete|rpc)\(/);
  });
});
