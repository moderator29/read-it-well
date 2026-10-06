import type { ChipState } from "@/components/ui/StatusChip";

/**
 * A stay's lifecycle as a status chip state (reference 7071: the bill list's
 * chips, label and shape, never colour alone).
 *
 * Every value of `booking_status` is named, so the next one added is a type
 * error rather than a silent default:
 *
 *   PENDING     pending   waiting on payment or the host
 *   CONFIRMED   success   the stay is theirs
 *   COMPLETED   success   it happened
 *   CANCELLED   neutral   a window closed; nothing failed, so never the rose
 *                         that means "it did not happen because something
 *                         went wrong" (checkout's own ruling on this state)
 *   NO_SHOW     neutral   the host's record, which the guest may dispute, so
 *                         not drawn as a verdict
 */
export type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export function bookingChip(status: BookingStatus): ChipState {
  switch (status) {
    case "PENDING":
      return "pending";
    case "CONFIRMED":
    case "COMPLETED":
      return "success";
    case "CANCELLED":
    case "NO_SHOW":
      return "neutral";
  }
}
