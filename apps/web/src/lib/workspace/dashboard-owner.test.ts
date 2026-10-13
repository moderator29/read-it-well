import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/observability/read-error", () => ({ reportReadError: vi.fn(async () => {}) }));

import { readEarningsSince, readOwnerDashboard, readOwnerInputs } from "./dashboard-owner";

type Reply = { data: unknown; error: { code?: string; message?: string } | null };

/** A fake client: tables answer from `tables`, functions from `fns`. A value that is an Error is thrown. */
function fake(opts: { tables?: Record<string, Reply | Error>; fns?: Record<string, Reply | Error | ((args: Record<string, unknown>) => Reply)> }) {
  const answer = (r: Reply | Error) => (r instanceof Error ? Promise.reject(r) : Promise.resolve(r));
  return {
    rpc: (fn: string, args: Record<string, unknown>) => {
      const r = opts.fns?.[fn];
      if (!r) return Promise.resolve({ data: [], error: null });
      return answer(typeof r === "function" ? r(args) : r);
    },
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      for (const name of ["select", "eq", "in", "gte", "lte", "order"]) chain[name] = () => chain;
      chain.limit = () => answer(opts.tables?.[table] ?? { data: [], error: null });
      return chain;
    },
  };
}

const NOW = new Date("2026-10-13T11:00:00Z");

const BUILDING = { listing_id: "l1", place_name: "Yaba", bedrooms: 2, status: "PUBLISHED", let_state: "let", tenancy_ends_on: "2026-10-13", achieved_rent_minor: 500, rent_period: "year" };
const CHARGE = { id: "t1", listing_id: "l1", booking_id: "b1", move_in: "2025-10-13", rent_period: "year", rent_minor: 500, total_minor: 600, created_at: "2026-10-03T10:00:00Z" };
const PAYMENT = { kind: "earning", occurred_at: "2026-10-04T10:00:00Z", gross_minor: 600, status: "SUCCESSFUL", booking_id: "b1" };

describe("readOwnerDashboard: real numbers", () => {
  it("reads every source and builds the view", async () => {
    const db = fake({
      fns: { my_buildings: { data: [BUILDING], error: null }, my_earnings_history: { data: [PAYMENT], error: null } },
      tables: {
        rent_payments: { data: [CHARGE], error: null },
        inspection_requests: { data: [{ id: "v1", slot_at: "2026-10-14T10:00:00Z", state: "CONFIRMED", listings: { title: "Yaba flat" } }], error: null },
        deal_agreements: { data: [{ id: "a1", status: "awaiting_parties", terms_version: 2, owner_confirmed_version: 1, kind: "rent", listing_id: "l1", updated_at: "2026-10-01" }], error: null },
      },
    });
    const view = await readOwnerDashboard(db, "user-1", NOW);
    expect(view.units).toEqual({ let: 1, vacant: 0, other: 0, total: 1 });
    expect(view.rentMonth).toMatchObject({ billedMinor: 600, paidMinor: 600, openedCount: 1, paidCount: 1 });
    expect(view.paidThisMonthMinor).toBe(600);
    expect(view.leaseToday?.[0]).toMatchObject({ id: "t1", place: "Yaba", days: 0 });
    expect(view.visitsWeek?.map((v) => v.listingTitle)).toEqual(["Yaba flat"]);
    expect(view.agreements?.map((a) => a.id)).toEqual(["a1"]);
  });
});

describe("readOwnerDashboard: empty", () => {
  it("an owner with nothing yet gets real zeros and empty lists, not nulls", async () => {
    const view = await readOwnerDashboard(fake({}), "user-1", NOW);
    expect(view.units).toEqual({ let: 0, vacant: 0, other: 0, total: 0 });
    expect(view.rentMonth).toEqual({ billedMinor: 0, paidMinor: 0, openedCount: 0, paidCount: 0 });
    expect(view.paidThisMonthMinor).toBe(0);
    expect(view.trend).toHaveLength(6);
    expect(view.trend!.every((p) => p.minor === 0)).toBe(true);
    expect(view.leaseToday).toEqual([]);
    expect(view.renewals).toEqual([]);
    expect(view.visitsWeek).toEqual([]);
    expect(view.agreements).toEqual([]);
    expect(view.property).toBeNull();
  });
});

describe("readOwnerDashboard: errors", () => {
  it("a failing source is null and takes only its own figures with it", async () => {
    const db = fake({
      fns: { my_buildings: { data: null, error: { code: "XX000" } }, my_earnings_history: { data: [PAYMENT], error: null } },
      tables: { rent_payments: { data: [CHARGE], error: null }, inspection_requests: new Error("network"), deal_agreements: { data: null, error: { code: "42501" } } },
    });
    const view = await readOwnerDashboard(db, "user-1", NOW);
    expect(view.units).toBeNull();
    expect(view.visitsWeek).toBeNull();
    expect(view.agreements).toBeNull();
    expect(view.rentMonth).toMatchObject({ paidMinor: 600 });
  });

  it("a failed payment history makes every rent figure null, never zero", async () => {
    const db = fake({ fns: { my_earnings_history: { data: null, error: { code: "XX000" } } }, tables: { rent_payments: { data: [CHARGE], error: null } } });
    const view = await readOwnerDashboard(db, "user-1", NOW);
    expect(view.rentMonth).toBeNull();
    expect(view.trend).toBeNull();
    expect(view.paidThisMonthMinor).toBeNull();
    expect(view.leaseToday).toBeNull();
    expect(view.renewals).toBeNull();
  });

  it("a charge list that hits the ceiling is null, because a short list is a wrong figure", async () => {
    const many = Array.from({ length: 500 }, (_, i) => ({ ...CHARGE, id: `t${i}`, booking_id: `b${i}` }));
    const inputs = await readOwnerInputs(fake({ tables: { rent_payments: { data: many, error: null } } }), "user-1", NOW);
    expect(inputs.tenancies).toBeNull();
  });
});

describe("readEarningsSince", () => {
  const row = (at: string, i = 0) => ({ kind: "earning", occurred_at: at, gross_minor: 1, status: "SUCCESSFUL", booking_id: `b${i}` });

  it("pages back with p_before until the window is covered", async () => {
    const calls: unknown[] = [];
    const page1 = Array.from({ length: 200 }, (_, i) => row(`2026-10-${String(12 - Math.floor(i / 40)).padStart(2, "0")}T10:00:00Z`, i));
    const page2 = [row("2026-02-01T10:00:00Z", 900), row("2025-01-01T10:00:00Z", 901)];
    const db = fake({
      fns: {
        my_earnings_history: (args) => {
          calls.push(args.p_before);
          return { data: calls.length === 1 ? page1 : page2, error: null };
        },
      },
    });
    const rows = await readEarningsSince(db as never, "2026-01-01T00:00:00Z");
    expect(calls).toHaveLength(2);
    expect(calls[0]).toBeNull();
    expect(typeof calls[1]).toBe("string");
    expect(rows).toHaveLength(201);
    expect(rows!.some((r) => r.occurredAt.startsWith("2025"))).toBe(false);
  });

  it("is null when the pages run out before the window is covered", async () => {
    const full = Array.from({ length: 200 }, (_, i) => row(`2026-10-12T10:${String(i % 60).padStart(2, "0")}:00Z`, i));
    const db = fake({ fns: { my_earnings_history: { data: full, error: null } } });
    expect(await readEarningsSince(db as never, "2025-01-01T00:00:00Z")).toBeNull();
  });

  it("is null when a page fails", async () => {
    expect(await readEarningsSince(fake({ fns: { my_earnings_history: { data: null, error: { code: "XX000" } } } }) as never, "2026-01-01T00:00:00Z")).toBeNull();
  });
});
