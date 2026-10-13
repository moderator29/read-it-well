import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A HOST DECLINES, AND THE GUEST'S BOOKINGS SWITCH.
 *
 * The decline wrote the guest's "Your booking request was not accepted" row
 * (the one that carries the host's reason) straight into
 * `public.notifications`, so a guest who had switched Bookings off still got
 * it, while the general "Booking cancelled" row from the status trigger
 * (private.notify) honoured the switch. It now goes through the in-app door.
 * The decline itself never depends on it.
 */

const GUEST = "44444444-4444-4444-8444-444444444444";
const BOOKING = "55555555-5555-4555-8555-555555555555";
const LISTING = "66666666-6666-4666-8666-666666666666";
const HOST = "77777777-7777-4777-8777-777777777777";

const session = vi.hoisted(() => ({ resolveSession: vi.fn() }));
const supabaseAdmin = vi.hoisted(() => ({ createAdminClient: vi.fn() }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "not configured",
  SIGNED_OUT_MESSAGE: "signed out",
  resolveSession: session.resolveSession,
}));
vi.mock("../flags", () => ({ isFeatureEnabled: async () => true }));
vi.mock("../supabase/admin", () => supabaseAdmin);
vi.mock("../bookings/actions", () => ({ confirm: vi.fn() }));

import { declineBooking } from "./bookings-actions";

/** The caller's own client: an agent row, and a pending booking on their listing. */
function hostSession() {
  const chain = (data: unknown) => {
    const c: Record<string, unknown> = {};
    Object.assign(c, { select: () => c, eq: () => c, maybeSingle: async () => ({ data, error: null }) });
    return c;
  };
  session.resolveSession.mockResolvedValue({
    state: "signed-in",
    user: { id: HOST },
    supabase: {
      from: (table: string) =>
        table === "agents"
          ? chain({ id: "agent-1" })
          : chain({
              id: BOOKING,
              listing_id: LISTING,
              guest_id: GUEST,
              status: "PENDING",
              check_in: "2026-11-01",
              check_out: "2026-11-03",
            }),
    },
  });
}

/** The service role: the booking moves, the history and calendar writes succeed, profiles carry `settings`. */
function serviceRole(settings: unknown) {
  const inserts: { table: string; row: unknown }[] = [];
  const client = {
    from(table: string) {
      if (table === "bookings") {
        const c: Record<string, unknown> = {};
        Object.assign(c, {
          update: () => c,
          eq: () => c,
          select: async () => ({ data: [{ id: BOOKING }], error: null }),
        });
        return c;
      }
      if (table === "availability") {
        const c: Record<string, unknown> = {};
        Object.assign(c, { delete: () => c, eq: () => c, gte: () => c, lt: async () => ({ error: null }) });
        return c;
      }
      if (table === "profiles") {
        return { select: () => ({ in: async (_c: string, ids: string[]) => ({ data: ids.map((id) => ({ id, settings })), error: null }) }) };
      }
      return {
        insert: async (row: unknown) => {
          inserts.push({ table, row });
          return { error: null };
        },
      };
    },
  };
  supabaseAdmin.createAdminClient.mockReturnValue(client);
  return { inserts };
}

beforeEach(() => {
  session.resolveSession.mockReset();
  supabaseAdmin.createAdminClient.mockReset();
  hostSession();
});

describe("declining a booking request", () => {
  const input = { bookingId: BOOKING, reason: "The flat is being repainted that week." };

  it("does not send the reason notice to a guest who switched Bookings off, and still declines", async () => {
    const { inserts } = serviceRole({ notifications: { bookings: false } });
    const result = await declineBooking(input);
    expect(result.ok).toBe(true);
    expect(inserts.find((i) => i.table === "booking_state_events")).toBeDefined();
    expect(inserts.filter((i) => i.table === "notifications")).toEqual([]);
  });

  it("sends the reason notice to a guest who left Bookings on", async () => {
    const { inserts } = serviceRole({ notifications: { bookings: true } });
    const result = await declineBooking(input);
    expect(result.ok).toBe(true);
    const written = inserts.filter((i) => i.table === "notifications");
    expect(written).toHaveLength(1);
    expect(written[0]!.row).toMatchObject({
      user_id: GUEST,
      kind: "booking",
      title: "Your booking request was not accepted",
      href: "/bookings",
    });
    expect(String((written[0]!.row as { body: string }).body)).toContain("repainted");
  });

  it("sends it when the guest has never touched the switch", async () => {
    const { inserts } = serviceRole({});
    await declineBooking(input);
    expect(inserts.filter((i) => i.table === "notifications")).toHaveLength(1);
  });
});
