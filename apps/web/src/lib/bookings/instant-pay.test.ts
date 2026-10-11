import { describe, expect, it } from "vitest";
import { INSTANT_PAY_WINDOW_MINUTES, instantPayBy, isInstantAgreement, readInstantOutcome } from "./instant-pay";

const DECIDED = "2026-10-07T12:00:00.000Z";
const instantAgreement = {
  status: "approved",
  decided_by: null,
  decided_at: DECIDED,
  terms: { instant_booking: true, total_minor: 10_000_000 },
};

/** A stand-in for the guest's RLS client: two reads, each answered once. */
function client(booking: unknown, agreement: unknown, error: unknown = null) {
  return {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: table === "bookings" ? booking : agreement, error }),
        }),
      }),
    }),
  } as never;
}

describe("instant bookings (D73)", () => {
  it("the window matches private.instant_pay_window()", () => {
    expect(INSTANT_PAY_WINDOW_MINUTES).toBe(30);
  });

  it("only a system-approved agreement marked instant is instant", () => {
    expect(isInstantAgreement(instantAgreement)).toBe(true);
    // A person approved it: today's path, whatever the terms say.
    expect(isInstantAgreement({ ...instantAgreement, decided_by: "u" })).toBe(false);
    expect(isInstantAgreement({ ...instantAgreement, terms: { instant_booking: "true" } })).toBe(false);
    expect(isInstantAgreement({ ...instantAgreement, terms: null })).toBe(false);
    expect(isInstantAgreement(null)).toBe(false);
  });

  it("pays by approval time plus the window, and only while approved", () => {
    expect(instantPayBy(instantAgreement)).toBe("2026-10-07T12:30:00.000Z");
    expect(instantPayBy({ ...instantAgreement, status: "paid" })).toBeNull();
    expect(instantPayBy({ ...instantAgreement, decided_at: null })).toBeNull();
  });

  it("reads CONFIRMED with an instant agreement as instant", async () => {
    const outcome = await readInstantOutcome(client({ status: "CONFIRMED" }, instantAgreement), "b");
    expect(outcome).toEqual({ instant: true, payBy: "2026-10-07T12:30:00.000Z" });
  });

  it("reads a request, a host-approved stay or a failed read as not instant", async () => {
    const none = { instant: false, payBy: null };
    expect(await readInstantOutcome(client({ status: "PENDING" }, null), "b")).toEqual(none);
    expect(
      await readInstantOutcome(client({ status: "CONFIRMED" }, { ...instantAgreement, decided_by: "staff" }), "b"),
    ).toEqual(none);
    expect(await readInstantOutcome(client(null, null, { message: "boom" }), "b")).toEqual(none);
  });
});
