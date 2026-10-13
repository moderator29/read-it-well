import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A TABLE DECISION AND THE GUEST'S BOOKINGS SWITCH.
 *
 * The console's confirm, decline and cancel of a table wrote the guest's
 * "booking" notice straight into `public.notifications`, so a guest who had
 * switched Bookings off still got it in the bell and on the lock screen. It
 * now goes through the in-app door, which applies the switch the way
 * `private.notify` does. The decision itself never depends on it.
 */

const guard = vi.hoisted(() => ({ requireAdmin: vi.fn() }));
const supabaseAdmin = vi.hoisted(() => ({ createAdminClient: vi.fn() }));

vi.mock("./guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./guard")>();
  return { ...actual, ...guard };
});
vi.mock("../supabase/admin", () => supabaseAdmin);
vi.mock("./audit", () => ({ writeAudit: async () => undefined }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { decideReservationAsAdmin } from "./bookings-actions";

const RESERVATION_ID = "22222222-2222-4222-8222-222222222222";
const GUEST = "44444444-4444-4444-8444-444444444444";

const ROW = {
  id: RESERVATION_ID,
  status: "PENDING",
  guest_id: GUEST,
  listing_id: null,
  business_id: null,
  reserved_for: "2026-09-20T19:00:00Z",
};

/** A service-role client: the reservation reads and moves, profiles carry `settings`, notifications record. */
function adminClient(settings: unknown) {
  const inserts: { table: string; row: unknown }[] = [];
  const profileReads: string[][] = [];
  const client = {
    from(table: string) {
      if (table === "reservations") {
        const chain: Record<string, unknown> = {};
        Object.assign(chain, {
          select: () => chain,
          update: () => chain,
          eq: () => chain,
          maybeSingle: async () => ({ data: ROW, error: null }),
        });
        return chain;
      }
      if (table === "profiles") {
        return {
          select: () => ({
            in: async (_column: string, ids: string[]) => {
              profileReads.push(ids);
              return { data: ids.map((id) => ({ id, settings })), error: null };
            },
          }),
        };
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
  return { inserts, profileReads };
}

beforeEach(() => {
  guard.requireAdmin.mockReset();
  supabaseAdmin.createAdminClient.mockReset();
  guard.requireAdmin.mockResolvedValue({
    state: "admin",
    supabase: {},
    user: { id: "11111111-1111-4111-8111-111111111111" },
    isAdmin: true,
    isSuperAdmin: false,
  });
});

describe("a table decision tells the guest through the in-app door", () => {
  it("does not write the notice for a guest who switched Bookings off, and still decides", async () => {
    const { inserts, profileReads } = adminClient({ notifications: { bookings: false } });
    const result = await decideReservationAsAdmin({ reservationId: RESERVATION_ID, decision: "confirm" });
    expect(result).toEqual({ ok: true, data: { status: "CONFIRMED" } });
    expect(profileReads).toEqual([[GUEST]]);
    expect(inserts.filter((i) => i.table === "notifications")).toEqual([]);
  });

  it("writes it for a guest who left Bookings on", async () => {
    const { inserts } = adminClient({ notifications: { bookings: true, messages: false } });
    const result = await decideReservationAsAdmin({ reservationId: RESERVATION_ID, decision: "confirm" });
    expect(result.ok).toBe(true);
    const written = inserts.filter((i) => i.table === "notifications");
    expect(written).toHaveLength(1);
    expect(written[0]!.row).toMatchObject({ user_id: GUEST, kind: "booking", href: "/bookings?side=stays&from=stays" });
  });

  it("applies to a decline with a reason as well", async () => {
    const { inserts } = adminClient({ notifications: { bookings: false } });
    const result = await decideReservationAsAdmin({
      reservationId: RESERVATION_ID,
      decision: "decline",
      reason: "The restaurant is closed that evening for a private event.",
    });
    expect(result).toEqual({ ok: true, data: { status: "CANCELLED" } });
    expect(inserts.filter((i) => i.table === "notifications")).toEqual([]);
  });
});
