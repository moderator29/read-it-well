/**
 * Whether a booking can be reviewed, in the words the review screen and the
 * review action give when it cannot.
 *
 * The same rule as `reviews_insert_own` (NEW-A1-03): a finished stay is
 * CONFIRMED or COMPLETED, with a check-out on or before today in Lagos. The
 * nightly complete-stays job moves a paid stay to COMPLETED the morning after
 * check-out, so COMPLETED is the ordinary state of a stay that happened. A
 * booking that carries a rent charge is a tenancy, not a stay, and is not
 * reviewed as one. The database decides; this only names the reason first.
 *
 * Client-safe: a pure function.
 */

export type ReviewIneligibility = "cancelled" | "unconfirmed" | "not-finished" | "no-show" | "tenancy";

export function reviewIneligibility(
  booking: { status: string; checkOut: string; isTenancy: boolean },
  today: string,
): ReviewIneligibility | null {
  if (booking.isTenancy) return "tenancy";
  if (booking.status === "CANCELLED") return "cancelled";
  if (booking.status === "NO_SHOW") return "no-show";
  if (booking.status !== "CONFIRMED" && booking.status !== "COMPLETED") return "unconfirmed";
  if (booking.checkOut > today) return "not-finished";
  return null;
}
