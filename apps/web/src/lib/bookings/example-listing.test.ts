import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * NO STAY IS EVER BOOKED AT AN EXAMPLE.
 *
 * The database has refused this since 20260809080630: the trigger
 * `bookings_never_against_a_demo_listing` raises SQLSTATE 23514 on any insert
 * pointing at a listing carrying `is_demo`. That is the guarantee and it does
 * not move.
 *
 * What was missing was the sentence. `reserve` never read `is_demo`, so the
 * refusal arrived as a 23514 that `checkConstraintMessage` did not recognise,
 * and the guest was told "Something went wrong working out this booking on
 * our side ... try again, and tell support if it happens twice". Every one of
 * the 64 listings in the catalogue today is an example, so that was the
 * message the product actually gave, and all three of its claims were false:
 * nothing went wrong on our side, trying again will never work, and support
 * has nothing to fix.
 *
 * Both halves are pinned here: the early read that refuses before the write,
 * and the translation of the trigger's own words for the race where a listing
 * becomes an example between the read and the insert.
 */

const session = vi.hoisted(() => ({
  resolveSession: vi.fn(),
  NOT_CONFIGURED_MESSAGE: "not configured",
  SIGNED_OUT_MESSAGE: "signed out",
}));
const repository = vi.hoisted(() => ({ byId: vi.fn() }));

vi.mock("../actions/session", () => session);
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("../flags", () => ({ isFeatureEnabled: async () => true }));
vi.mock("../listings/repository", () => ({ getListingRepository: () => repository }));
vi.mock("../supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("../email/client", () => ({
  bestEffortEmail: async () => undefined,
  sendMessage: async () => undefined,
}));
vi.mock("../email/recipients", () => ({
  adminOrNull: () => null,
  contactForAgent: async () => null,
  contactForSelf: () => null,
}));
vi.mock("./settlement", () => ({
  writeBookedNights: async () => undefined,
  releaseBookedNights: async () => undefined,
}));
vi.mock("./arrival", () => ({ announceConfirmedStay: async () => undefined }));

const { reserve } = await import("./actions");

const GUEST = "11111111-1111-4111-8111-111111111111";
const LISTING = "33333333-3333-4333-8333-333333333333";

type Answer = { data: unknown; error: unknown };

function mount(answers: Record<string, Answer>) {
  const writes: string[] = [];
  const client = {
    from(table: string) {
      let op: "select" | "insert" = "select";
      const chain: Record<string, unknown> = {};
      const settle = (): Answer => answers[`${table}:${op}`] ?? { data: null, error: null };
      for (const method of ["select", "eq", "order", "limit"]) chain[method] = () => chain;
      chain["insert"] = () => {
        op = "insert";
        writes.push(table);
        return chain;
      };
      chain["single"] = async () => settle();
      chain["maybeSingle"] = async () => settle();
      return chain;
    },
  };
  session.resolveSession.mockResolvedValue({ state: "signed-in", user: { id: GUEST }, supabase: client });
  return { writes };
}

/** Two nights, starting a week out, as the form sends them. */
function dates(): { checkIn: string; checkOut: string } {
  const start = new Date(Date.now() + 7 * 86_400_000);
  const end = new Date(Date.now() + 9 * 86_400_000);
  return { checkIn: start.toISOString().slice(0, 10), checkOut: end.toISOString().slice(0, 10) };
}

function form(): FormData {
  const { checkIn, checkOut } = dates();
  const data = new FormData();
  data.append("listingId", LISTING);
  data.append("checkIn", checkIn);
  data.append("checkOut", checkOut);
  data.append("adults", "2");
  data.append("children", "0");
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  repository.byId.mockResolvedValue(null);
});

describe("reserve, against an example listing", () => {
  it("refuses before it writes, and says what an example is", async () => {
    const { writes } = mount({
      "listings:select": {
        data: {
          id: LISTING,
          title: "Example apartment",
          agent_id: "a1",
          listing_intent: "rent",
          rate_minor: 5_000_000,
          rate_period: "night",
          rent_amount_minor: null,
          is_demo: true,
        },
        error: null,
      },
    });

    const result = await reserve(null, form());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("example listing");
      expect(result.error).not.toContain("our side");
    }
    expect(writes).not.toContain("bookings");
  });

  it("translates the trigger's own refusal rather than blaming our arithmetic", async () => {
    mount({
      "listings:select": {
        data: {
          id: LISTING,
          title: "A real apartment",
          agent_id: "a1",
          listing_intent: "rent",
          rate_minor: 5_000_000,
          rate_period: "night",
          rent_amount_minor: null,
          is_demo: false,
        },
        error: null,
      },
      "bookings:insert": {
        data: null,
        error: {
          code: "23514",
          message:
            "This listing is an example of what the catalogue will hold. No such property is available, so nothing can be arranged against it.",
        },
      },
    });

    const result = await reserve(null, form());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("example listing");
      expect(result.error).not.toContain("our side");
    }
  });

  it("still blames our arithmetic when the constraint really is ours", async () => {
    mount({
      "listings:select": {
        data: {
          id: LISTING,
          title: "A real apartment",
          agent_id: "a1",
          listing_intent: "rent",
          rate_minor: 5_000_000,
          rate_period: "night",
          rent_amount_minor: null,
          is_demo: false,
        },
        error: null,
      },
      "bookings:insert": {
        data: null,
        error: { code: "23514", message: 'new row violates check constraint "bookings_total_chk"' },
      },
    });

    const result = await reserve(null, form());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("our side");
  });
});
