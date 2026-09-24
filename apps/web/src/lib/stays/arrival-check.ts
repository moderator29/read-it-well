/**
 * V-91, THE ARRIVAL CHECK: "IS IT AS LISTED?"
 *
 * From check-in time until three hours after it, the guest of a paid stay is
 * asked one question on their booking. "Yes" closes it; "No" is a report with
 * a reason and at least one photo taken there and then. The database decides
 * the window and every rule (`arrival_check_state`, `answer_arrival_check`,
 * migration 20260924111100); this file reads its answers without trusting
 * them, and names the photo paths the storage policy accepts. Pure.
 *
 * The host-payout half of V-91 is not built here: settlement timing belongs
 * to the audit session. `private.arrival_report_open` is waiting for it.
 */

export const ARRIVAL_ANSWERS = ["as_listed", "not_as_listed", "no_access"] as const;
export type ArrivalAnswer = (typeof ARRIVAL_ANSWERS)[number];
export type ArrivalReportReason = Exclude<ArrivalAnswer, "as_listed">;

/** At least one photo for a report, and no more than this. */
export const MAX_ARRIVAL_PHOTOS = 6;

export type ArrivalCheckState =
  | { state: "none" }
  | { state: "before"; opensAt: string | null }
  | { state: "open"; closesAt: string | null }
  | { state: "closed" }
  | { state: "answered"; answer: ArrivalAnswer; answeredAt: string | null; reference: string | null }
  | { state: "failed" };

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function isArrivalAnswer(value: unknown): value is ArrivalAnswer {
  return typeof value === "string" && (ARRIVAL_ANSWERS as readonly string[]).includes(value);
}

/** The database's answer, read without trusting it. Anything unreadable is "failed". */
export function readArrivalCheckState(data: unknown): ArrivalCheckState {
  if (!data || typeof data !== "object") return { state: "failed" };
  const row = data as Record<string, unknown>;
  switch (row.state) {
    case "none":
      return { state: "none" };
    case "closed":
      return { state: "closed" };
    case "before":
      return { state: "before", opensAt: text(row.opens_at) };
    case "open":
      return { state: "open", closesAt: text(row.closes_at) };
    case "answered":
      return isArrivalAnswer(row.answer)
        ? { state: "answered", answer: row.answer, answeredAt: text(row.answered_at), reference: text(row.reference) }
        : { state: "failed" };
    default:
      return { state: "failed" };
  }
}

/**
 * Where a photo is uploaded: `<booking>/<random>.<ext>`. The storage policy
 * accepts only the guest of that paid stay, and only while it is unanswered.
 */
export function arrivalPhotoPath(bookingId: string, fileName: string, random: string): string {
  const extension = (fileName.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const safe = ["jpg", "jpeg", "png", "webp", "heic"].includes(extension) ? extension : "jpg";
  return `${bookingId}/${random.replace(/[^A-Za-z0-9-]/g, "")}.${safe}`;
}

/** A report is ready to send: a reason, and between one and six photos. */
export function reportReady(reason: ArrivalReportReason | null, photoCount: number): boolean {
  return reason !== null && photoCount >= 1 && photoCount <= MAX_ARRIVAL_PHOTOS;
}

/**
 * Whether the check could be open today, for a page whose read failed: on the
 * check-in date, or the day after (a late check-in hour can run past
 * midnight). Dates are Lagos calendar days, YYYY-MM-DD.
 */
export function arrivalCheckMayBeOpen(checkIn: string, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return false;
  const next = new Date(`${checkIn}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return today === checkIn || today === next.toISOString().slice(0, 10);
}
