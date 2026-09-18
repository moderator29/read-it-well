import { describe, expect, it } from "vitest";
import { deriveBookingSteps, lagosToday } from "./booking-steps";

const RESERVED = { at: "2026-09-10T09:00:00.000Z", to: "PENDING" as const };
const PAID = { at: "2026-09-10T09:03:00.000Z", to: "CONFIRMED" as const };
const DONE = { at: "2026-09-28T12:00:00.000Z", to: "COMPLETED" as const };

describe("the booking steps timeline", () => {
  it("stands on reserved while the stay is unpaid", () => {
    const { steps, cancelled } = deriveBookingSteps({
      status: "PENDING",
      checkIn: "2026-09-26",
      events: [RESERVED],
      today: "2026-09-18",
    });
    expect(cancelled).toBe(false);
    expect(steps.map((s) => s.state)).toEqual(["current", "upcoming", "upcoming", "upcoming"]);
    expect(steps[0]?.at).toBe(RESERVED.at);
    expect(steps[1]?.at).toBeNull();
  });

  it("dates paid from its event and moves the current step onto it", () => {
    const { steps } = deriveBookingSteps({
      status: "CONFIRMED",
      checkIn: "2026-09-26",
      events: [RESERVED, PAID],
      today: "2026-09-18",
    });
    expect(steps.map((s) => s.state)).toEqual(["done", "current", "upcoming", "upcoming"]);
    expect(steps[1]?.at).toBe(PAID.at);
    /* Arrival is always dated: it is the check-in day whether or not it has come. */
    expect(steps[2]?.at).toBe("2026-09-26");
  });

  it("stands on arrival day from check-in onwards, and only once paid", () => {
    const paid = deriveBookingSteps({
      status: "CONFIRMED",
      checkIn: "2026-09-26",
      events: [RESERVED, PAID],
      today: "2026-09-26",
    });
    expect(paid.steps[2]?.state).toBe("current");

    const unpaid = deriveBookingSteps({
      status: "PENDING",
      checkIn: "2026-09-26",
      events: [RESERVED],
      today: "2026-09-27",
    });
    expect(unpaid.steps[2]?.state).toBe("upcoming");
  });

  it("completes on the COMPLETED event and marks everything before it done", () => {
    const { steps } = deriveBookingSteps({
      status: "COMPLETED",
      checkIn: "2026-09-26",
      events: [RESERVED, PAID, DONE],
      today: "2026-09-30",
    });
    expect(steps.map((s) => s.state)).toEqual(["done", "done", "done", "current"]);
    expect(steps[3]?.at).toBe(DONE.at);
  });

  it("keeps what happened on a cancelled booking and says it was cancelled", () => {
    const { steps, cancelled } = deriveBookingSteps({
      status: "CANCELLED",
      checkIn: "2026-09-26",
      events: [RESERVED, PAID, { at: "2026-09-12T10:00:00.000Z", to: "CANCELLED" }],
      today: "2026-09-18",
    });
    expect(cancelled).toBe(true);
    expect(steps.map((s) => s.state)).toEqual(["done", "current", "upcoming", "upcoming"]);
  });

  it("reads today on the Lagos calendar, not the device's", () => {
    /* 23:30 UTC on the 25th is already the 26th in Lagos (UTC+1). */
    expect(lagosToday(new Date("2026-09-25T23:30:00.000Z"))).toBe("2026-09-26");
  });
});
