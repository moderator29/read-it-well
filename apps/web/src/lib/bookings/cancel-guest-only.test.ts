import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * SEC-17: `cancel` proved ownership by reading through the caller's RLS
 * client, but RLS also shows a booking to its host, and the cancel itself is
 * service-role work. So a host could cancel through the guest's path. The
 * read is now filtered to the caller as guest.
 */
const GUEST = "11111111-1111-4111-8111-111111111111";
const HOST = "22222222-2222-4222-8222-222222222222";
const BOOKING = "33333333-3333-4333-8333-333333333333";

const state = vi.hoisted(() => ({ caller: "", updates: 0 }));

/** RLS as it is: guest and host both see the booking. */
function rlsClient() {
  return {
    from(table: string) {
      const filters: Record<string, unknown> = {};
      const chain: Record<string, unknown> = {};
      chain["select"] = () => chain;
      chain["eq"] = (col: string, val: unknown) => {
        filters[col] = val;
        return chain;
      };
      chain["limit"] = async () => ({ data: [], error: null });
      chain["maybeSingle"] = async () => {
        if (table !== "bookings") return { data: null, error: null };
        const row = { id: BOOKING, listing_id: "l", status: "PENDING", check_in: "2099-01-10", check_out: "2099-01-12", guest_id: GUEST };
        const visible = state.caller === GUEST || state.caller === HOST;
        const matches = Object.entries(filters).every(([k, v]) => (row as Record<string, unknown>)[k] === v);
        return { data: visible && matches ? row : null, error: null };
      };
      return chain;
    },
  };
}

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("../flags", () => ({ isFeatureEnabled: async () => true }));
vi.mock("../email/client", () => ({ bestEffortEmail: async () => undefined, sendMessage: async () => undefined }));
vi.mock("./settlement", () => ({ releaseBookedNights: async () => undefined, writeBookedNights: async () => undefined }));
vi.mock("../actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "nc",
  SIGNED_OUT_MESSAGE: "so",
  resolveSession: async () => ({ state: "signed-in", user: { id: state.caller }, supabase: rlsClient() }),
}));
vi.mock("../supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => {
      const chain: Record<string, unknown> = {};
      chain["update"] = () => {
        state.updates += 1;
        return chain;
      };
      chain["eq"] = () => chain;
      chain["in"] = async () => ({ error: null });
      chain["insert"] = async () => ({ error: null });
      return chain;
    },
  }),
}));

const { cancel } = await import("./actions");

const form = () => {
  const f = new FormData();
  f.set("bookingId", BOOKING);
  return f;
};

beforeEach(() => {
  state.updates = 0;
});

describe("cancelling a booking", () => {
  it("lets the guest cancel their own unpaid booking (control)", async () => {
    state.caller = GUEST;
    await cancel(null, form());
    expect(state.updates).toBe(1);
  });

  it("does not let the host cancel through the guest's path", async () => {
    state.caller = HOST;
    const result = await cancel(null, form());
    expect(result.ok).toBe(false);
    expect(state.updates).toBe(0);
  });
});
