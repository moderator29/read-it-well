import { describe, expect, it, vi } from "vitest";

/**
 * `getRentCharges` against a fake RLS client: it reads, it never writes, it
 * counts exactly and it names only the rows it prints.
 */
const tables: Record<string, Record<string, unknown>[]> = {};
const writes: string[] = [];

function builder(table: string) {
  let rows = [...(tables[table] ?? [])];
  let head = false;
  let range: [number, number] | null = null;
  const chain: Record<string, unknown> = {
    select: (_cols: string, opts?: { head?: boolean }) => {
      head = Boolean(opts?.head);
      return chain;
    },
    eq: (col: string, value: unknown) => {
      rows = rows.filter((r) => r[col] === value);
      return chain;
    },
    in: (col: string, values: unknown[]) => {
      rows = rows.filter((r) => values.includes(r[col]));
      return chain;
    },
    order: () => chain,
    range: (from: number, to: number) => {
      range = [from, to];
      return chain;
    },
    then: (resolve: (v: unknown) => unknown) =>
      resolve(
        head
          ? { count: rows.length, error: null }
          : { data: range ? rows.slice(range[0], range[1] + 1) : rows, error: null },
      ),
  };
  for (const w of ["insert", "update", "upsert", "delete", "rpc"]) {
    chain[w] = () => {
      writes.push(`${table}.${w}`);
      return chain;
    };
  }
  return chain;
}

vi.mock("../guard", () => ({
  requireAdmin: async () => ({ state: "admin", supabase: { from: (t: string) => builder(t) } }),
}));

describe("getRentCharges", () => {
  it("reads every charge, its booking and its payment, and counts by state", async () => {
    tables.rent_payments = [
      { id: "r1", booking_id: "b1", listing_id: "l1", tenant_id: "u1", move_in: "2026-10-01", rent_period: "year", total_minor: 300_000_00, currency: "NGN", created_at: "2026-09-20T10:00:00Z" },
      { id: "r2", booking_id: "b2", listing_id: "l1", tenant_id: "u2", move_in: "2026-11-01", rent_period: "year", total_minor: 200_000_00, currency: "NGN", created_at: "2026-09-21T10:00:00Z" },
    ];
    tables.bookings = [
      { id: "b1", status: "CONFIRMED" },
      { id: "b2", status: "PENDING" },
    ];
    tables.transactions = [{ booking_id: "b1", status: "SUCCESSFUL" }];
    tables.listings = [{ id: "l1", title: "2 bedroom flat, Yaba" }];
    tables.profiles = [{ id: "u1", display_name: "Amaka" }];
    const { getRentCharges } = await import("./money");
    const out = await getRentCharges();
    expect(out.state).toBe("ok");
    if (out.state !== "ok") return;
    expect(out.data.total).toBe(2);
    expect(out.data.byState).toEqual({ awaiting: 1, paid: 1, cancelled: 0, no_show: 0, check: 0 });
    expect(out.data.paidMinor).toBe(300_000_00);
    expect(out.data.awaitingMinor).toBe(200_000_00);
    expect(out.data.latest[0]).toMatchObject({ id: "r2", listingTitle: "2 bedroom flat, Yaba", tenantName: null, state: "awaiting" });
    expect(out.data.latest[1]).toMatchObject({ id: "r1", tenantName: "Amaka", state: "paid" });
    expect(out.data.complete).toBe(true);
    expect(writes).toEqual([]);
  });
  it("draws zero, not a failure, when no charge exists", async () => {
    tables.rent_payments = [];
    const { getRentCharges } = await import("./money");
    const out = await getRentCharges();
    expect(out.state).toBe("ok");
    if (out.state === "ok") {
      expect(out.data.total).toBe(0);
      expect(out.data.latest).toEqual([]);
    }
  });
});
