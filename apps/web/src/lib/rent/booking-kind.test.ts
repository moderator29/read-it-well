import { beforeEach, describe, expect, it, vi } from "vitest";

import { isRentBooking } from "./booking-kind";

/**
 * A rent charge is a bookings row, and the product tells it from a stay by
 * the rent_payments row beside it, never by the night count. The second half
 * proves the one application-side reader that matters for a tenant's inbox:
 * `announceConfirmedStay` sends no "your stay is confirmed" mail for a rent
 * booking (the database notifier has already said "Rent paid"), and still
 * sends it for a stay.
 */

const BOOKING = "6f1c2b0e-3d4a-4b5c-8d6e-7f8091a2b3c4";

type Admin = Parameters<typeof isRentBooking>[0];

function adminWith(rent: { id: string } | null, error: { message: string } | null = null): Admin {
  const rentChain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "limit"]) rentChain[m] = () => rentChain;
  rentChain.maybeSingle = async () => ({ data: rent, error });
  return { from: () => rentChain } as unknown as Admin;
}

describe("isRentBooking", () => {
  it("is true when a rent_payments row carries the booking", async () => {
    expect(await isRentBooking(adminWith({ id: "rp-1" }), BOOKING)).toBe(true);
  });

  it("is false for a stay, and false rather than a throw when the read fails", async () => {
    expect(await isRentBooking(adminWith(null), BOOKING)).toBe(false);
    expect(await isRentBooking(adminWith(null, { message: "down" }), BOOKING)).toBe(false);
    const broken = { from: () => { throw new Error("no"); } } as unknown as Admin;
    expect(await isRentBooking(broken, BOOKING)).toBe(false);
  });
});

/* ------------------------------------------ announceConfirmedStay's branch */

const mail = vi.hoisted(() => ({
  sendMessage: vi.fn(async () => {}),
}));

vi.mock("../email/client", () => ({
  bestEffortEmail: async (work: () => Promise<void>) => {
    await work();
  },
  sendMessage: mail.sendMessage,
}));
vi.mock("../email/messages", () => ({
  bookingConfirmed: (data: unknown) => ({ subject: "Your stay is confirmed", data }),
  stayArrivalDetails: (data: unknown) => ({ subject: "Arrival details", data }),
}));
vi.mock("../email/recipients", () => ({
  emailMuted: async () => false,
  contactForUser: async () => ({ email: "tenant@example.invalid", name: "Ada" }),
}));

/** A service-role client that answers the booking, the listing and the rent row. */
function announceAdmin(rent: { id: string } | null) {
  return {
    from: (name: string) => {
      const chain: Record<string, unknown> = {};
      for (const m of ["select", "eq", "limit"]) chain[m] = () => chain;
      chain.maybeSingle = async () => {
        if (name === "rent_payments") return { data: rent, error: null };
        if (name === "bookings") {
          return {
            data: {
              guest_id: "guest-1",
              listing_id: "l1",
              check_in: "2026-10-01",
              check_out: "2026-10-02",
              nights: 1,
              total_minor: 150_000_000,
              guest_name: null,
              guest_phone: null,
              guest_email: null,
            },
            error: null,
          };
        }
        if (name === "listings") return { data: { title: "Two-bed flat, Lekki" }, error: null };
        return { data: null, error: null };
      };
      return chain;
    },
  };
}

beforeEach(() => {
  mail.sendMessage.mockClear();
});

describe("announceConfirmedStay on a rent charge", () => {
  it("sends no stay confirmation for a booking that carries a rent charge", async () => {
    const { announceConfirmedStay } = await import("../bookings/arrival");
    const admin = announceAdmin({ id: "rp-1" }) as unknown as Parameters<typeof announceConfirmedStay>[0];

    await announceConfirmedStay(admin, { bookingId: BOOKING, totalMinor: 150_000_000 });

    expect(mail.sendMessage).not.toHaveBeenCalled();
  });

  it("still sends the stay confirmation for a stay", async () => {
    const { announceConfirmedStay } = await import("../bookings/arrival");
    const admin = announceAdmin(null) as unknown as Parameters<typeof announceConfirmedStay>[0];

    await announceConfirmedStay(admin, { bookingId: BOOKING, totalMinor: 150_000_000 });

    expect(mail.sendMessage).toHaveBeenCalledTimes(1);
    const [to, message] = mail.sendMessage.mock.calls[0] as unknown as [string, { subject: string }];
    expect(to).toBe("tenant@example.invalid");
    expect(message.subject).toBe("Your stay is confirmed");
  });
});
