import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * NEW-A1-03: a stay the nightly job has recorded as COMPLETED is reviewable,
 * as it is in reviews_insert_own. The action reads the booking only to give an
 * honest sentence before the insert, and that sentence must not refuse what
 * the database would take. A tenancy (a booking with a rent_payments row) is
 * not a stay and is not reviewed as one.
 */

const session = vi.hoisted(() => ({ resolveSession: vi.fn() }));
const flags = vi.hoisted(() => ({ isFeatureEnabled: vi.fn() }));

vi.mock("../actions/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../actions/session")>()),
  resolveSession: session.resolveSession,
}));
vi.mock("../flags", () => flags);
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("../bookings/schema", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../bookings/schema")>()),
  lagosToday: () => "2026-09-24",
}));

const { submitReview } = await import("./actions");

const GUEST = "11111111-1111-4111-8111-111111111111";
const BOOKING = "22222222-2222-4222-8222-222222222222";
const LISTING = "33333333-3333-4333-8333-333333333333";

type Booking = { id: string; listing_id: string; status: string; check_out: string };

function fakeClient(booking: Booking | null, tenancy: boolean, inserts: unknown[]) {
  return {
    from(table: string) {
      const chain: Record<string, unknown> = {};
      for (const method of ["select", "eq", "limit"]) chain[method] = () => chain;
      chain.maybeSingle = async () => {
        if (table === "bookings") return { data: booking, error: null };
        if (table === "rent_payments") return { data: tenancy ? { id: "rp" } : null, error: null };
        return { data: null, error: null };
      };
      chain.insert = async (row: unknown) => {
        inserts.push(row);
        return { error: null };
      };
      return chain;
    },
  };
}

function form(): FormData {
  const f = new FormData();
  f.set("bookingId", BOOKING);
  f.set("rating", "5");
  f.set("body", "");
  return f;
}

function signedIn(booking: Booking | null, tenancy = false) {
  const inserts: unknown[] = [];
  session.resolveSession.mockResolvedValue({
    state: "signed-in",
    user: { id: GUEST },
    supabase: fakeClient(booking, tenancy, inserts),
  });
  return inserts;
}

const stay = (status: string, check_out = "2026-09-20"): Booking => ({
  id: BOOKING,
  listing_id: LISTING,
  status,
  check_out,
});

describe("submitReview (NEW-A1-03)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    flags.isFeatureEnabled.mockResolvedValue(true);
  });

  it("takes a review for a stay the nightly job recorded as COMPLETED", async () => {
    const inserts = signedIn(stay("COMPLETED"));
    const result = await submitReview(null, form());
    expect(result.ok).toBe(true);
    expect(inserts).toHaveLength(1);
  });

  it("still takes a review for a CONFIRMED stay whose check-out has passed", async () => {
    const inserts = signedIn(stay("CONFIRMED"));
    expect((await submitReview(null, form())).ok).toBe(true);
    expect(inserts).toHaveLength(1);
  });

  it("refuses a stay that has not finished, without writing", async () => {
    const inserts = signedIn(stay("CONFIRMED", "2026-09-30"));
    const result = await submitReview(null, form());
    expect(result.ok).toBe(false);
    expect(inserts).toHaveLength(0);
  });

  it("refuses a no-show in its own words, not as a stay awaiting the host", async () => {
    const inserts = signedIn(stay("NO_SHOW"));
    const result = await submitReview(null, form());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).not.toMatch(/awaiting the host/i);
    expect(inserts).toHaveLength(0);
  });

  it("refuses a tenancy, which is not a stay", async () => {
    const inserts = signedIn(stay("CONFIRMED"), true);
    const result = await submitReview(null, form());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/tenancy|move-in|rent/i);
    expect(inserts).toHaveLength(0);
  });
});
