import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/observability/read-error", () => ({ reportReadError: vi.fn(async () => {}) }));
vi.mock("@/lib/supabase/env", () => ({ SUPABASE_URL: "https://example.supabase.co/" }));

import { readAgentInputs, readClosedDeals, readEnquiries, readFeatured, readVisits } from "./dashboard-agent";

type Reply = { data?: unknown; error?: { code?: string } | null; count?: number | null };

function fake(tables: Record<string, Reply | Error>, fns: Record<string, Reply | Error> = {}) {
  const answer = (r: Reply | Error) => (r instanceof Error ? Promise.reject(r) : Promise.resolve({ data: null, error: null, ...r }));
  return {
    rpc: (fn: string) => answer(fns[fn] ?? { data: [] }),
    from: (table: string) => {
      const reply = tables[table] ?? { data: [] };
      const chain: Record<string, unknown> = {};
      for (const name of ["select", "eq", "in", "gte", "lte", "order"]) chain[name] = () => chain;
      /* A terminal that is awaited directly (count) or reached through limit / maybeSingle. */
      chain.limit = () => answer(reply);
      chain.maybeSingle = () => answer(reply);
      chain.then = (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) => answer(reply).then(ok, bad);
      return chain;
    },
  };
}

const NOW = new Date("2026-10-13T11:00:00Z");

describe("readEnquiries", () => {
  it("returns real rows", async () => {
    const rows = await readEnquiries(fake({ conversations: { data: [{ listing_id: "a", created_at: "2026-10-01T10:00:00Z" }] } }), "u", NOW);
    expect(rows).toEqual([{ listingId: "a", createdAt: "2026-10-01T10:00:00Z" }]);
  });
  it("empty is an empty list", async () => {
    expect(await readEnquiries(fake({ conversations: { data: [] } }), "u", NOW)).toEqual([]);
  });
  it("an error, a throw and the API ceiling are all null", async () => {
    expect(await readEnquiries(fake({ conversations: { data: null, error: { code: "XX000" } } }), "u", NOW)).toBeNull();
    expect(await readEnquiries(fake({ conversations: new Error("down") }), "u", NOW)).toBeNull();
    const full = Array.from({ length: 1000 }, () => ({ listing_id: "a", created_at: "2026-10-01T10:00:00Z" }));
    expect(await readEnquiries(fake({ conversations: { data: full } }), "u", NOW)).toBeNull();
  });
});

describe("readVisits", () => {
  it("returns confirmed and completed visits with the listing title", async () => {
    const rows = await readVisits(fake({ inspection_requests: { data: [{ id: "v", slot_at: "2026-10-14T10:00:00Z", state: "CONFIRMED", listings: { title: "Flat" } }] } }), "u", NOW);
    expect(rows).toEqual([{ id: "v", slotAt: "2026-10-14T10:00:00Z", state: "CONFIRMED", listingTitle: "Flat" }]);
  });
  it("empty, error and ceiling", async () => {
    expect(await readVisits(fake({ inspection_requests: { data: [] } }), "u", NOW)).toEqual([]);
    expect(await readVisits(fake({ inspection_requests: { data: null, error: { code: "XX000" } } }), "u", NOW)).toBeNull();
    const full = Array.from({ length: 1000 }, (_, i) => ({ id: `v${i}`, slot_at: "2026-10-14T10:00:00Z", state: "CONFIRMED" }));
    expect(await readVisits(fake({ inspection_requests: { data: full } }), "u", NOW)).toBeNull();
  });
});

describe("readClosedDeals", () => {
  it("returns the exact count, zero included", async () => {
    expect(await readClosedDeals(fake({ listings: { count: 4 } }), "agent", NOW)).toBe(4);
    expect(await readClosedDeals(fake({ listings: { count: 0 } }), "agent", NOW)).toBe(0);
  });
  it("an error or a missing count is null, never zero", async () => {
    expect(await readClosedDeals(fake({ listings: { count: null, error: { code: "XX000" } } }), "agent", NOW)).toBeNull();
    expect(await readClosedDeals(fake({ listings: { count: null } }), "agent", NOW)).toBeNull();
    expect(await readClosedDeals(fake({ listings: new Error("down") }), "agent", NOW)).toBeNull();
  });
});

describe("readAgentInputs", () => {
  it("one failing source degrades only itself", async () => {
    const inputs = await readAgentInputs(
      fake({ conversations: { data: [] }, inspection_requests: { data: null, error: { code: "XX000" } }, listings: { count: 2 } }),
      { userId: "u", agentId: "a" },
      NOW,
    );
    expect(inputs).toEqual({ enquiries: [], visits: null, closedDeals: 2 });
  });
});

describe("readFeatured", () => {
  const funnel = [
    { stage: "seen", mine: 40, area_median: null, compared: 0 },
    { stage: "opened", mine: 12, area_median: null, compared: 0 },
    { stage: "saved", mine: 3, area_median: null, compared: 0 },
    { stage: "enquired", mine: 2, area_median: null, compared: 0 },
    { stage: "booked", mine: 1, area_median: null, compared: 0 },
    { stage: "viewed", mine: 0, area_median: null, compared: 0 },
  ];
  const listing = { data: { id: "l", title: "Lekki flat", area: "Lekki", city: "Lagos", bedrooms: 3 } };

  it("no pick is no card", async () => {
    expect(await readFeatured(fake({}), null, true)).toBeNull();
  });

  it("real counts, a photo address and a place", async () => {
    const out = await readFeatured(
      fake({ listings: listing, listing_photos: { data: [{ storage_path: "l/1.jpg" }] } }, { listing_funnel: { data: funnel } }),
      { listingId: "l", enquiries: 5 },
      true,
    );
    expect(out).toEqual({
      listingId: "l",
      title: "Lekki flat",
      place: "Lekki, Lagos",
      bedrooms: 3,
      photoUrl: "https://example.supabase.co/storage/v1/object/public/listing-photos/l/1.jpg",
      enquiries30: 5,
      week: { opened: 12, enquired: 2, booked: 1 },
    });
  });

  it("a failed funnel leaves the week null, not zero, and the listing still shows", async () => {
    const out = await readFeatured(
      fake({ listings: listing, listing_photos: { data: [] } }, { listing_funnel: { data: null, error: { code: "XX000" } } }),
      { listingId: "l", enquiries: 0 },
      true,
    );
    expect(out?.week).toBeNull();
    expect(out?.photoUrl).toBeNull();
    expect(out?.enquiries30).toBe(0);
  });

  it("the 30 day count is null when the enquiry rows were never read", async () => {
    const out = await readFeatured(fake({ listings: listing }, { listing_funnel: { data: funnel } }), { listingId: "l", enquiries: 0 }, false);
    expect(out?.enquiries30).toBeNull();
  });

  it("a listing that cannot be read is no card", async () => {
    expect(await readFeatured(fake({ listings: { data: null, error: { code: "XX000" } } }), { listingId: "l", enquiries: 1 }, true)).toBeNull();
    expect(await readFeatured(fake({ listings: new Error("down") }), { listingId: "l", enquiries: 1 }, true)).toBeNull();
  });
});
