import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, type Script } from "@/lib/testing/fake-supabase";
import { withoutComments } from "@/lib/copy/source-scan";
import { LISTER_GAPS } from "./measurement";
import { readListingMeasurement } from "./measurement-read";

/**
 * ONE LISTING'S LAST THIRTY DAYS, READ AS ITS LISTER MAY READ THEM
 * (`VALLO_PROMOTION-v2.md` section 11). Whole counts or no data; a refused
 * count is reported and is no data, never zero; nothing reads around a
 * policy with the service role.
 */
const reported = vi.hoisted(() => [] as unknown[]);
vi.mock("@/lib/observability/report", () => ({
  reportError: vi.fn(async (input: { context?: { kind?: unknown } }) => {
    reported.push(input.context?.kind);
    return { sent: false, reason: "not_configured" };
  }),
}));

const LISTING = "00000000-0000-4000-8000-0000000000aa";
const AGENT = "00000000-0000-4000-8000-0000000000bb";
const NOW = new Date("2026-10-06T12:00:00Z");
const SINCE = "2026-09-06T12:00:00.000Z";

const OWN = { listings: { select: { data: { id: LISTING, is_demo: false }, error: null } } };
const counts = (n: Record<string, number | null>): Script => ({
  ...OWN,
  conversations: { select: { count: n.conversations ?? null } },
  enquiry_stages: { select: { count: n.enquiry_stages ?? null } },
  inspection_requests: { select: { count: n.inspection_requests ?? null } },
  bookings: { select: { count: n.bookings ?? null } },
});

beforeEach(() => {
  reported.length = 0;
});

describe("which listing is read", () => {
  it("no listing: says so, reads nothing", async () => {
    const db = fakeSupabase();
    expect(await readListingMeasurement(db.client as never, AGENT, null, NOW)).toEqual({ state: "no-listing" });
    expect(db.calls).toEqual([]);
  });

  it("a malformed id, or a listing that is not the caller's: missing, and nothing counted", async () => {
    const db = fakeSupabase({ listings: { select: { data: null, error: null } } });
    expect(await readListingMeasurement(db.client as never, AGENT, "not-an-id", NOW)).toEqual({ state: "missing" });
    expect(await readListingMeasurement(db.client as never, AGENT, LISTING, NOW)).toEqual({ state: "missing" });
    expect(db.calls.map((c) => c.table)).toEqual(["listings"]);
    expect(db.calls[0]!.filters).toEqual([
      ["eq", "id", LISTING],
      ["eq", "agent_id", AGENT],
    ]);
  });

  it("an example listing is never counted", async () => {
    const db = fakeSupabase({ listings: { select: { data: { id: LISTING, is_demo: true }, error: null } } });
    expect(await readListingMeasurement(db.client as never, AGENT, LISTING, NOW)).toEqual({ state: "example" });
  });

  it("a refused listing read is reported and answers unavailable", async () => {
    const db = fakeSupabase({ listings: { select: { data: null, error: { code: "42501", message: "denied" } } } });
    expect(await readListingMeasurement(db.client as never, AGENT, LISTING, NOW)).toEqual({ state: "unavailable" });
    expect(reported).toEqual(["read.promotion.readListingMeasurement"]);
  });
});

describe("the thirty days, counted", () => {
  it("returns the four readable counts as recorded, a recorded zero as zero", async () => {
    const db = fakeSupabase(counts({ conversations: 7, enquiry_stages: 3, inspection_requests: 1, bookings: 0 }));
    const read = await readListingMeasurement(db.client as never, AGENT, LISTING, NOW);
    expect(read.state).toBe("ok");
    if (read.state !== "ok") return;
    expect(read.measurement.windowDays).toBe(30);
    expect(read.measurement.values).toMatchObject({ inquiries: 7, contacts: 3, viewings: 1, bookings: 0 });
    expect(reported).toEqual([]);
  });

  it("the six it cannot read are no data with their reason, never zero", async () => {
    const db = fakeSupabase(counts({ conversations: 7, enquiry_stages: 3, inspection_requests: 1, bookings: 2 }));
    const read = await readListingMeasurement(db.client as never, AGENT, LISTING, NOW);
    if (read.state !== "ok") throw new Error(read.state);
    for (const metric of ["impressions", "views", "uniqueViewers", "saves", "shares", "transactions"] as const) {
      expect(read.measurement.values[metric], metric).toBeNull();
      expect(read.measurement.gaps[metric], metric).toBe(LISTER_GAPS[metric]);
    }
    expect(read.measurement.bySource).toBeUndefined();
  });

  it("a refused count is reported and is no data, never zero; a missing count is no data", async () => {
    const db = fakeSupabase({
      ...counts({ conversations: 7, inspection_requests: null, bookings: 2 }),
      enquiry_stages: { select: { data: null, error: { code: "42P01", message: "relation does not exist" } } },
    });
    const read = await readListingMeasurement(db.client as never, AGENT, LISTING, NOW);
    if (read.state !== "ok") throw new Error(read.state);
    expect(read.measurement.values.contacts).toBeNull();
    expect(read.measurement.gaps.contacts).toBe("readFailed");
    expect(read.measurement.values.viewings).toBeNull();
    expect(read.measurement.values.inquiries).toBe(7);
    expect(reported).toEqual(["read.promotion.readListingMeasurement"]);
  });

  it("asks for exactly this listing over exactly the last thirty days", async () => {
    const db = fakeSupabase(counts({}));
    await readListingMeasurement(db.client as never, AGENT, LISTING, NOW);
    expect(db.of("conversations", "select")[0]!.filters).toEqual([
      ["eq", "listing_id", LISTING],
      ["gte", "created_at", SINCE],
    ]);
    expect(db.of("enquiry_stages", "select")[0]!.filters).toEqual([
      ["eq", "conversations.listing_id", LISTING],
      ["gte", "set_at", SINCE],
    ]);
    expect(db.of("inspection_requests", "select")[0]!.filters).toEqual([
      ["eq", "listing_id", LISTING],
      ["eq", "state", "COMPLETED"],
      ["gte", "completed_at", SINCE],
    ]);
    expect(db.of("bookings", "select")[0]!.filters).toEqual([
      ["eq", "listing_id", LISTING],
      ["in", "status", ["CONFIRMED", "COMPLETED", "NO_SHOW"]],
      ["gte", "created_at", SINCE],
    ]);
    expect(db.wrote()).toBe(false);
  });

  it("never reads a table the lister's policies close, and never reaches for the service role", async () => {
    const db = fakeSupabase(counts({}));
    await readListingMeasurement(db.client as never, AGENT, LISTING, NOW);
    const tables = new Set(db.calls.map((c) => c.table));
    for (const closed of ["saved_items", "share_links", "transactions", "listing_daily_stats", "listing_view_marks"]) {
      expect(tables.has(closed), closed).toBe(false);
    }
    const source = withoutComments(readFileSync(join(__dirname, "measurement-read.ts"), "utf8"));
    expect(source).not.toMatch(/createAdminClient|service_role|SERVICE_ROLE|supabase\/admin/);
  });

  it("a throw is reported and answers unavailable", async () => {
    const db = fakeSupabase({ listings: { select: "throw" } });
    expect(await readListingMeasurement(db.client as never, AGENT, LISTING, NOW)).toEqual({ state: "unavailable" });
    expect(reported).toEqual(["read.promotion_measurement"]);
  });
});
