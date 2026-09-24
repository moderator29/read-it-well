import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ListingRow } from "./supabase-repository";
import { decodeCursor, encodeCursor, keysetFilter, type CursorKey } from "./keyset";
import { fillPage } from "./page-fill";

/**
 * OPS-11: the catalogue in pages.
 *
 * The gap these close: the shelf read the newest 200 rows and filtered them
 * in memory, so there was no page 2 at all, and an amenity filter answered
 * from a capped join read could drop a listing that carried the whole set.
 *
 * The repository is driven through a stand-in PostgREST that evaluates the
 * real filter strings (`.eq`, `.or` logic trees, `.order`, `.limit`) over an
 * in-memory table full of ties and nulls, so a wrong keyset tree or a wrong
 * order shows up as a repeated or missing row. The same predicate is walked in
 * SQL against the live catalogue by supabase/tests/probes/ops-11.sql.
 */

type Value = string | number | boolean | null;
type Row = Record<string, unknown>;

/* ---------------------------------------------------- a small PostgREST */

function compare(a: Value, b: string): number {
  if (typeof a === "number") return a - Number(b);
  const left = String(a);
  return left < b ? -1 : left > b ? 1 : 0;
}

function term(row: Row, column: string, op: string, value: string): boolean {
  const cell = row[column] as Value;
  if (op === "is") return value === "null" ? cell === null : String(cell) === value;
  if (cell === null || cell === undefined) return false;
  const c = compare(cell, value);
  switch (op) {
    case "eq":
      return c === 0;
    case "neq":
      return c !== 0;
    case "lt":
      return c < 0;
    case "lte":
      return c <= 0;
    case "gt":
      return c > 0;
    case "gte":
      return c >= 0;
    default:
      throw new Error(`the stand-in does not know ${op}`);
  }
}

/** Parse `a.eq.1,or(b.lt."x",and(c.is.null,d.gt.2))` into a predicate. */
function parseTree(text: string, combine: "or" | "and"): (row: Row) => boolean {
  let at = 0;
  function list(): ((row: Row) => boolean)[] {
    const parts: ((row: Row) => boolean)[] = [];
    for (;;) {
      parts.push(item());
      if (text[at] === ",") {
        at++;
        continue;
      }
      return parts;
    }
  }
  function item(): (row: Row) => boolean {
    const group = /^(or|and)\(/.exec(text.slice(at));
    if (group) {
      at += group[0].length;
      const inner = list();
      if (text[at] !== ")") throw new Error(`unclosed group at ${at} in ${text}`);
      at++;
      return group[1] === "or" ? (r) => inner.some((p) => p(r)) : (r) => inner.every((p) => p(r));
    }
    const head = /^([a-z_0-9]+)\.([a-z]+)\./.exec(text.slice(at));
    if (!head) throw new Error(`bad term at ${at} in ${text}`);
    at += head[0].length;
    let value = "";
    if (text[at] === '"') {
      const end = text.indexOf('"', at + 1);
      value = text.slice(at + 1, end);
      at = end + 1;
    } else {
      while (at < text.length && text[at] !== "," && text[at] !== ")") value += text[at++];
    }
    const [, column, op] = head;
    return (r) => term(r, column!, op!, value);
  }
  const parts = list();
  if (at !== text.length) throw new Error(`trailing input at ${at} in ${text}`);
  return combine === "or" ? (r) => parts.some((p) => p(r)) : (r) => parts.every((p) => p(r));
}

type Order = { column: string; ascending: boolean; nullsFirst: boolean };

function byOrders(orders: Order[]) {
  return (a: Row, b: Row): number => {
    for (const o of orders) {
      const x = a[o.column] as Value;
      const y = b[o.column] as Value;
      if (x === y) continue;
      if (x === null) return o.nullsFirst ? -1 : 1;
      if (y === null) return o.nullsFirst ? 1 : -1;
      const c = compare(x, String(y));
      if (c !== 0) return o.ascending ? c : -c;
    }
    return 0;
  };
}

type Tables = Record<string, Row[]>;

function standIn(tables: Tables, log: { listingsReads: number }) {
  function from(table: string) {
    const filters: ((row: Row) => boolean)[] = [];
    const orders: Order[] = [];
    const run = (limit?: number) => {
      if (table === "listings") log.listingsReads += 1;
      let rows = (tables[table] ?? []).filter((row) => filters.every((f) => f(row)));
      if (orders.length > 0) rows = [...rows].sort(byOrders(orders));
      if (limit !== undefined) rows = rows.slice(0, limit);
      return Promise.resolve({ data: rows, error: null });
    };
    const q = {
      select: () => q,
      eq(column: string, value: unknown) {
        const embed = /^am\d+\.amenity_id$/.exec(column);
        if (embed) {
          filters.push((row) =>
            ((row.listing_amenities as { amenity_id: string }[]) ?? []).some((a) => a.amenity_id === value),
          );
        } else {
          filters.push((row) => term(row, column, "eq", String(value)));
        }
        return q;
      },
      neq: (column: string, value: unknown) => (filters.push((r) => term(r, column, "neq", String(value))), q),
      gte: (column: string, value: unknown) => (filters.push((r) => term(r, column, "gte", String(value))), q),
      in(column: string, values: unknown[]) {
        filters.push((row) => values.map(String).includes(String(row[column])));
        return q;
      },
      not: () => q,
      or(text: string) {
        filters.push(parseTree(text, "or"));
        return q;
      },
      order(column: string, options: { ascending: boolean; nullsFirst?: boolean }) {
        orders.push({ column, ascending: options.ascending, nullsFirst: options.nullsFirst ?? !options.ascending });
        return q;
      },
      limit: (n: number) => run(n),
      maybeSingle: () => run(1).then(({ data }) => ({ data: data[0] ?? null, error: null })),
      then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => run().then(resolve, reject),
    };
    return q;
  }
  return {
    from,
    auth: { getSession: async () => ({ data: { session: null } }) },
    storage: { from: () => ({ createSignedUrls: async () => ({ data: [], error: null }) }) },
    rpc: async (fn: string, args: { p_listing_ids: string[] }) => {
      if (fn !== "listing_review_stats") return { data: null, error: { message: "unknown function" } };
      const out: { listing_id: string; rating_avg: number; review_count: number }[] = [];
      for (const id of args.p_listing_ids) {
        const mine = (tables.reviews ?? []).filter((r) => r.listing_id === id);
        if (mine.length === 0) continue;
        const avg = mine.reduce((sum, r) => sum + (r.rating as number), 0) / mine.length;
        out.push({ listing_id: id, rating_avg: avg, review_count: mine.length });
      }
      return { data: out, error: null };
    },
  };
}

/* ---------------------------------------------------- the catalogue */

const AMENITIES = [
  { id: "a0000000-0000-4000-8000-000000000001", code: "wifi" },
  { id: "a0000000-0000-4000-8000-000000000002", code: "parking" },
  { id: "a0000000-0000-4000-8000-000000000003", code: "security" },
];

/* Few distinct values per column, so ties are everywhere and only the id breaks them. */
const PUBLISHED = [
  "2026-09-01T10:00:00.123456+00:00",
  "2026-09-01T10:00:00.123457+00:00",
  "2026-09-02T08:30:00+00:00",
  null,
];
const CREATED = ["2026-08-01T00:00:00+00:00", "2026-08-01T00:00:00.5+00:00"];
const MOVE_IN = [null, 150_000_000, 300_000_000];

function hex(n: number): string {
  // A spread of ids whose lexical order is not their creation order.
  return ((n * 2654435761) >>> 0).toString(16).padStart(8, "0");
}

function listingRow(n: number): ListingRow & { listing_amenities: { amenity_id: string }[] } {
  const amenities = AMENITIES.filter((_, a) => (n >> a) & 1).map((a) => ({ amenity_id: a.id }));
  return {
    id: `${hex(n)}-0000-4000-8000-${String(n).padStart(12, "0")}`,
    reference: null,
    title: `Listing ${n}`,
    property_type: "home",
    listing_intent: "rent",
    rent_amount_minor: 100_000_000 + n,
    rent_period: "year",
    rent_negotiable: false,
    rate_minor: null,
    rate_period: null,
    sale_price_minor: null,
    price_negotiable: null,
    caution_deposit_minor: null,
    service_charge_minor: null,
    service_charge_period: null,
    agency_fee_minor: null,
    legal_fee_minor: null,
    agreement_fee_minor: null,
    total_move_in_cost_minor: MOVE_IN[n % 3] ?? null,
    sale_agency_fee_minor: null,
    sale_legal_fee_minor: null,
    governors_consent_fee_minor: null,
    stamp_duty_minor: null,
    survey_registration_fee_minor: null,
    total_purchase_cost_minor: null,
    minimum_tenancy_months: null,
    available_from: null,
    furnished: null,
    tenure: null,
    sale_status: null,
    year_built: null,
    condition: null,
    size_sqm: null,
    toilets: null,
    parking_spaces: null,
    floor: null,
    total_floors: null,
    bedrooms: 1 + (n % 4),
    bathrooms: 1,
    featured: n % 11 === 0,
    is_demo: false,
    agent_id: "ag000000-0000-4000-8000-000000000001",
    listing_role: "agent",
    area: "Yaba",
    city: "Lagos",
    state_code: "LA",
    latitude: null,
    longitude: null,
    published_at: PUBLISHED[n % 4] ?? null,
    created_at: CREATED[n % 2]!,
    address_verified_at: null,
    physically_inspected_at: null,
    power_grid: null,
    power_backup: null,
    power_backup_hours: null,
    water_supply: null,
    prepaid_meter: null,
    has_estate_access: null,
    listing_photos: [],
    listing_amenities: amenities,
    status: "PUBLISHED",
  } as unknown as ListingRow & { listing_amenities: { amenity_id: string }[] };
}

const tables: Tables = {
  listings: Array.from({ length: 61 }, (_, n) => listingRow(n + 1)) as unknown as Row[],
  amenities: AMENITIES,
  states: [{ code: "LA", name: "Lagos" }],
  reviews: [],
  agent_badges: [],
  listing_lister: [],
};
const log = { listingsReads: 0 };
const client = standIn(tables, log);

vi.mock("../supabase/server", () => ({ createClient: async () => client }));
vi.mock("./read-failure", () => ({
  catalogueReadFailed: async (_where: string, error: unknown) => {
    throw error instanceof Error ? error : new Error(JSON.stringify(error));
  },
}));

const { SupabaseListingRepository, withAmenities } = await import("./supabase-repository");
const repo = new SupabaseListingRepository(async () => client as never);

type Walk = { pages: string[][]; nexts: (string | null)[] };

async function walk(
  filter: Parameters<typeof repo.search>[0],
  order: "default" | "move-in",
  pageSize: number,
): Promise<Walk> {
  const pages: string[][] = [];
  const nexts: (string | null)[] = [];
  let after: string | null = null;
  for (let guard = 0; guard < 50; guard++) {
    const page = await repo.searchPage(filter, { order, after, pageSize });
    pages.push(page.listings.map((l) => l.id));
    nexts.push(page.next);
    if (!page.next) break;
    after = page.next;
  }
  return { pages, nexts };
}

async function singleRead(filter: Parameters<typeof repo.search>[0], order: "default" | "move-in") {
  return (await repo.search(filter, { order })).map((l) => l.id);
}

beforeEach(() => {
  log.listingsReads = 0;
});

describe("page 2 continues exactly from page 1 (OPS-11)", () => {
  it.each(["default", "move-in"] as const)("the %s order: every row once, in the single read's order", async (order) => {
    const expected = await singleRead({}, order);
    expect(expected).toHaveLength(61);
    const { pages, nexts } = await walk({}, order, 7);
    expect(pages.flat()).toEqual(expected);
    expect(new Set(pages.flat()).size).toBe(61);
    // Every page is full except the last, and only the last says there is no next.
    pages.slice(0, -1).forEach((page) => expect(page).toHaveLength(7));
    expect(nexts.at(-1)).toBeNull();
    nexts.slice(0, -1).forEach((next) => expect(next).not.toBeNull());
  });

  it("a page size that divides the catalogue ends on a full page with no empty page after it", async () => {
    tables.listings = tables.listings!.slice(0, 56);
    try {
      const { pages } = await walk({}, "default", 7);
      expect(pages).toHaveLength(8);
      pages.forEach((page) => expect(page).toHaveLength(7));
    } finally {
      tables.listings = Array.from({ length: 61 }, (_, n) => listingRow(n + 1)) as unknown as Row[];
    }
  });
});

describe("no short pages when rows are refused (OPS-11)", () => {
  it("with an amenity set: the set is decided by the database and every page is full", async () => {
    const filter = { amenities: ["wifi", "parking"] };
    const expected = await singleRead(filter, "default");
    const carrying = tables.listings!.filter((row) => {
      const ids = (row.listing_amenities as { amenity_id: string }[]).map((a) => a.amenity_id);
      return ids.includes(AMENITIES[0]!.id) && ids.includes(AMENITIES[1]!.id);
    });
    expect(expected).toHaveLength(carrying.length);
    const { pages } = await walk(filter, "default", 4);
    expect(pages.flat()).toEqual(expected);
    pages.slice(0, -1).forEach((page) => expect(page).toHaveLength(4));
  });

  it("with a filter only the matcher decides (party size): pages still fill, in order", async () => {
    const filter = { guests: 7 };
    const expected = await singleRead(filter, "move-in");
    expect(expected.length).toBeGreaterThan(5);
    expect(expected.length).toBeLessThan(61);
    const { pages } = await walk(filter, "move-in", 5);
    expect(pages.flat()).toEqual(expected);
    pages.slice(0, -1).forEach((page) => expect(page).toHaveLength(5));
  });

  it("an unknown amenity matches nothing and reads no listings", async () => {
    const page = await repo.searchPage({ amenities: ["helipad"] }, {});
    expect(page).toEqual({ listings: [], next: null });
    expect(log.listingsReads).toBe(0);
  });
});

describe("the cursor", () => {
  const key: CursorKey = {
    featured: true,
    publishedAt: "2026-09-01T10:00:00.123456+00:00",
    createdAt: "2026-08-01T00:00:00+00:00",
    id: "0b3c1d2e-0000-4000-8000-000000000001",
    moveInMinor: 150_000_000,
  };

  it("round-trips, and only for the order it was made in", () => {
    expect(decodeCursor("move-in", encodeCursor("move-in", key))).toEqual(key);
    expect(decodeCursor("default", encodeCursor("move-in", key))).toBeNull();
  });

  it("refuses anything that could reach the filter as syntax", () => {
    const forged = (wire: Record<string, unknown>) =>
      Buffer.from(JSON.stringify({ v: 1, o: "d", f: false, p: null, c: key.createdAt, i: key.id, ...wire })).toString("base64url");
    expect(decodeCursor("default", forged({}))).not.toBeNull();
    expect(decodeCursor("default", forged({ c: '2026-08-01T00:00:00Z",id.gt."0' }))).toBeNull();
    expect(decodeCursor("default", forged({ i: "x),or(id.gt.0" }))).toBeNull();
    expect(decodeCursor("default", forged({ f: "true" }))).toBeNull();
    expect(decodeCursor("default", "not base64 !")).toBeNull();
    expect(decodeCursor("default", "")).toBeNull();
  });

  it("a forged cursor reads as the first page", async () => {
    const first = await repo.searchPage({}, { pageSize: 3 });
    const forged = await repo.searchPage({}, { pageSize: 3, after: "eyJ2IjoxfQ" });
    expect(forged.listings.map((l) => l.id)).toEqual(first.listings.map((l) => l.id));
  });

  it("places a null publication date and a null move-in cost last", () => {
    expect(keysetFilter("default", { ...key, featured: false, publishedAt: null })).toBe(
      `and(featured.eq."false",and(published_at.is.null,or(created_at.lt."${key.createdAt}",and(created_at.eq."${key.createdAt}",id.lt."${key.id}"))))`,
    );
    expect(keysetFilter("move-in", { ...key, moveInMinor: null }).startsWith("and(total_move_in_cost_minor.is.null,")).toBe(true);
  });
});

describe("the amenity embeds", () => {
  it("adds one aliased inner embed per amenity and nothing when none is asked for", () => {
    expect(withAmenities("id, title", [])).toBe("id, title");
    const select = withAmenities("id, title", ["x", "y"]);
    expect(select).toContain("am0:listing_amenities!inner(amenity_id)");
    expect(select).toContain("am1:listing_amenities!inner(amenity_id)");
  });
});

describe("fillPage at its round-trip bound", () => {
  it("continues from the last row read rather than claiming the end", async () => {
    const rows = Array.from({ length: 100 }, (_, n) => ({ item: n, key: n }));
    const page = await fillPage<number, number>({
      pageSize: 5,
      after: null,
      batchSize: 10,
      maxBatches: 2,
      accept: (n) => n >= 90,
      fetchBatch: async (after, limit) => rows.filter((r) => after === null || r.key > after).slice(0, limit),
    });
    expect(page.items).toEqual([]);
    expect(page.next).toBe(19);
  });
});
