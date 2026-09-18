import type { Database } from "@/lib/supabase/database.types";

/**
 * THE BOOKING STEPS TIMELINE, DERIVED.
 *
 * A stay thread opens on four steps: reserved, paid, arrival day, completed.
 * Each one is dated from the booking's own state events where an event
 * exists, from the booking's dates where the step IS a date (arrival), and
 * left undated where it has not happened. Nothing here invents a time.
 *
 * "Current" is the last step that has happened. That is the step a guest is
 * standing on, and it is the one the face accents; everything before it is
 * done and everything after it is still ahead. A cancelled booking keeps the
 * steps that did happen and says so beside them rather than pretending the
 * timeline continues.
 *
 * Pure, so it is tested rather than trusted.
 */

export type BookingStatus = Database["public"]["Enums"]["booking_status"];

export type BookingStepKey = "reserved" | "paid" | "arrival" | "completed";

export type BookingStep = {
  key: BookingStepKey;
  /** ISO instant, or an ISO date for the arrival step. Null when not yet. */
  at: string | null;
  state: "done" | "current" | "upcoming";
};

export type StateEvent = { at: string; to: BookingStatus };

export type BookingSteps = {
  steps: BookingStep[];
  cancelled: boolean;
};

const PAID_STATES: readonly BookingStatus[] = ["CONFIRMED", "COMPLETED", "NO_SHOW"];

/** Today's date in Lagos as YYYY-MM-DD, which is the calendar a check-in is on. */
export function lagosToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function deriveBookingSteps({
  status,
  checkIn,
  events,
  today,
}: {
  status: BookingStatus;
  /** ISO date, YYYY-MM-DD. */
  checkIn: string;
  events: StateEvent[];
  /** ISO date, YYYY-MM-DD, in Lagos. */
  today: string;
}): BookingSteps {
  const firstTo = (wanted: BookingStatus): string | null =>
    events.find((event) => event.to === wanted)?.at ?? null;

  const cancelled = status === "CANCELLED";
  const reservedAt = firstTo("PENDING") ?? events[0]?.at ?? null;
  const paidAt = firstTo("CONFIRMED");
  const completedAt = firstTo("COMPLETED");

  const paid = paidAt !== null || PAID_STATES.includes(status);
  const arrived = paid && today >= checkIn;
  const completed = status === "COMPLETED";

  const happened: Record<BookingStepKey, boolean> = {
    reserved: true,
    paid,
    arrival: arrived,
    completed,
  };
  const at: Record<BookingStepKey, string | null> = {
    reserved: reservedAt,
    paid: paidAt,
    arrival: checkIn,
    completed: completedAt,
  };

  const order: BookingStepKey[] = ["reserved", "paid", "arrival", "completed"];
  let current: BookingStepKey = "reserved";
  for (const key of order) if (happened[key]) current = key;

  return {
    cancelled,
    steps: order.map((key) => ({
      key,
      at: at[key],
      state: !happened[key] ? "upcoming" : key === current ? "current" : "done",
    })),
  };
}
