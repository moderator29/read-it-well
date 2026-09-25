import { beforeEach, describe, expect, it, vi } from "vitest";
import { formatMoney } from "@vallo/i18n/core";

/**
 * THE TWO BRANCHES OF THE TRIPS READ, HELD APART.
 *
 * A rent charge and a stay are the same `bookings` row shape and they are not
 * the same thing. The charge exists so the money rails do not have to be built
 * twice; the screen that lists them must not inherit that compromise. What is
 * pinned here is the branch itself, from both sides:
 *
 *   a stay still reads as a stay, with its nights and its date range, and no
 *   tenancy leaks into the Upcoming tab;
 *
 *   a tenancy reads as a tenancy, with a move-in day, the rent module's own
 *   period word, the frozen figure the charge carries rather than whatever the
 *   listing says today, and one door, `/rent/pay/<inspectionId>`, which is the
 *   only route that can actually take the money. A stay checkout link on a
 *   tenancy would be a nightly panel offered for a year's rent.
 *
 * The date arithmetic is not mocked: `labelDate` and `formatMoney` run for
 * real, because "one night, 14 Aug to 15 Aug, at the price of a year" is
 * exactly the sentence this branch exists to stop being written.
 */

const session = vi.hoisted(() => ({ resolveSession: vi.fn() }));
vi.mock("../actions/session", () => session);
vi.mock("../listings/repository", () => ({
  getListingRepository: () => ({ byId: async () => null }),
}));

const { getMyBookings } = await import("./queries");

type Result = { data: unknown; error: unknown };

/** A PostgREST-shaped builder: every filter returns itself, awaiting resolves. */
function builder(result: Result): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "in", "order", "limit", "gte", "not"]) {
    chain[method] = () => chain;
  }
  chain.then = (resolve: (value: Result) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

const GUEST = "11111111-1111-4111-8111-111111111111";
const STAY_ID = "22222222-2222-4222-8222-222222222222";
const RENT_ID = "33333333-3333-4333-8333-333333333333";
const INSPECTION = "44444444-4444-4444-8444-444444444444";
const LISTING_STAY = "55555555-5555-4555-8555-555555555555";
const LISTING_RENT = "66666666-6666-4666-8666-666666666666";

type BookingRow = Record<string, unknown>;

const stayRow: BookingRow = {
  id: STAY_ID,
  listing_id: LISTING_STAY,
  check_in: "2099-08-14",
  check_out: "2099-08-16",
  nights: 2,
  adults: 2,
  children: 0,
  total_minor: 18_000_000,
  currency: "NGN",
  status: "CONFIRMED",
  guest_name: null,
  guest_phone: null,
};

/* A tenancy as the rent step opens it: one night, priced at a year's rent. */
const rentRow: BookingRow = {
  id: RENT_ID,
  listing_id: LISTING_RENT,
  check_in: "2099-09-01",
  check_out: "2099-09-02",
  nights: 1,
  adults: 1,
  children: 0,
  total_minor: 350_000_000,
  currency: "NGN",
  status: "PENDING",
  guest_name: null,
  guest_phone: null,
};

const charge = {
  booking_id: RENT_ID,
  inspection_id: INSPECTION,
  listing_id: LISTING_RENT,
  move_in: "2099-09-01",
  rent_period: "year",
  total_minor: 350_000_000,
  currency: "NGN",
};

function mountDatabase(tables: {
  bookings: BookingRow[];
  rent_payments?: unknown[];
  listings?: unknown[];
  reviews?: unknown[];
  transactions?: unknown[];
}) {
  const supabase = {
    from(table: string) {
      if (table === "bookings") return builder({ data: tables.bookings, error: null });
      if (table === "rent_payments") {
        return builder({ data: tables.rent_payments ?? [], error: null });
      }
      if (table === "listings") return builder({ data: tables.listings ?? [], error: null });
      if (table === "reviews") return builder({ data: tables.reviews ?? [], error: null });
      if (table === "transactions") {
        return builder({ data: tables.transactions ?? [], error: null });
      }
      throw new Error(`the trips read asked for an unexpected table: ${table}`);
    },
  };
  session.resolveSession.mockResolvedValue({
    state: "signed-in",
    user: { id: GUEST },
    supabase,
  });
}

beforeEach(() => {
  session.resolveSession.mockReset();
});

describe("getMyBookings, the stay branch", () => {
  it("reads a stay as a stay and files it by its dates", async () => {
    mountDatabase({
      bookings: [stayRow],
      listings: [{ id: LISTING_STAY, title: "Lekki Palm Grove", area: "Lekki", city: "Lagos" }],
    });

    const groups = await getMyBookings("en");
    expect(groups).not.toBe("unavailable");
    expect(groups).not.toBeNull();
    if (!groups || groups === "unavailable") return;

    expect(groups.upcoming).toHaveLength(1);
    const stay = groups.upcoming[0]!;
    expect(stay.title).toBe("Lekki Palm Grove");
    expect(stay.nights).toBe(2);
    expect(stay.dateRange).toContain(" to ");
    expect(stay.totalDisplay).toBe(formatMoney(18_000_000, "en", "NGN"));
    /* No tenancy in an account with no charge. */
    expect(groups.rent).toHaveLength(0);
  });
});

describe("getMyBookings, the tenancy branch", () => {
  it("keeps a rent charge out of every stay tab", async () => {
    mountDatabase({
      bookings: [rentRow],
      rent_payments: [charge],
      listings: [{ id: LISTING_RENT, title: "Ikoyi Terrace", area: "Ikoyi", city: "Lagos" }],
    });

    const groups = await getMyBookings("en");
    if (!groups || groups === "unavailable") throw new Error("expected groups");

    expect(groups.upcoming).toHaveLength(0);
    expect(groups.completed).toHaveLength(0);
    expect(groups.cancelled).toHaveLength(0);
    expect(groups.rent).toHaveLength(1);
  });

  it("reads it in tenancy words, and sends it to the rent page", async () => {
    mountDatabase({
      bookings: [rentRow],
      rent_payments: [charge],
      listings: [{ id: LISTING_RENT, title: "Ikoyi Terrace", area: "Ikoyi", city: "Lagos" }],
    });

    const groups = await getMyBookings("en");
    if (!groups || groups === "unavailable") throw new Error("expected groups");
    const tenancy = groups.rent[0]!;

    expect(tenancy.title).toBe("Ikoyi Terrace");
    expect(tenancy.inspectionId).toBe(INSPECTION);
    expect(tenancy.href).toBe(`/rent/pay/${INSPECTION}`);
    /* Never the stay checkout: that route prices nights. */
    expect(tenancy.href).not.toContain("/checkout/");
    expect(tenancy.moveIn).toBe("2099-09-01");
    expect(tenancy.moveInLabel).toBe("Tue 1 Sept");
    /* One day, and no sentence anywhere that says so. */
    expect(tenancy.moveInLabel).not.toContain(" to ");
    expect(tenancy.rentPeriod).toBe("year");
    expect(tenancy.periodLabel).toBe("Yearly");
    expect(tenancy.totalDisplay).toBe(formatMoney(350_000_000, "en", "NGN"));
    expect(tenancy.payable).toBe(true);
    expect(tenancy.paid).toBe(false);
  });

  it("quotes the charge's frozen figure, not the booking row's", async () => {
    /* A row whose bookings total has drifted from the charge. The charge is
       what `/rent/pay` will take, so the charge is what the list may quote. */
    mountDatabase({
      bookings: [{ ...rentRow, total_minor: 1, currency: "NGN" }],
      rent_payments: [charge],
    });

    const groups = await getMyBookings("en");
    if (!groups || groups === "unavailable") throw new Error("expected groups");
    expect(groups.rent[0]!.totalDisplay).toBe(formatMoney(350_000_000, "en", "NGN"));
  });

  it("offers no payment control once money has settled against it", async () => {
    mountDatabase({
      bookings: [{ ...rentRow, status: "CONFIRMED" }],
      rent_payments: [charge],
      transactions: [{ booking_id: RENT_ID }],
    });

    const groups = await getMyBookings("en");
    if (!groups || groups === "unavailable") throw new Error("expected groups");
    expect(groups.rent[0]!.paid).toBe(true);
    expect(groups.rent[0]!.payable).toBe(false);
  });

  it("splits one account's stays from its tenancies", async () => {
    mountDatabase({
      bookings: [stayRow, rentRow],
      rent_payments: [charge],
      listings: [
        { id: LISTING_STAY, title: "Lekki Palm Grove", area: "Lekki", city: "Lagos" },
        { id: LISTING_RENT, title: "Ikoyi Terrace", area: "Ikoyi", city: "Lagos" },
      ],
    });

    const groups = await getMyBookings("en");
    if (!groups || groups === "unavailable") throw new Error("expected groups");

    expect(groups.upcoming.map((b) => b.id)).toEqual([STAY_ID]);
    expect(groups.rent.map((r) => r.id)).toEqual([RENT_ID]);
  });
});
