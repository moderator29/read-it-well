import type { ChipState } from "@/components/ui/StatusChip";
import type { InspectionState } from "@/lib/inspections/types";
import { chipOf, toneOf, type VisitTone } from "@/lib/visit-calendar/model";

/**
 * A visit's state as the shared status chip draws it (`StatusChip`): waiting
 * is pending, booked is the brand square, held is success, missed or refused
 * is the one red, withdrawn is neutral. Not a client module, so the console's
 * server-drawn detail panel and the client rows read the same table.
 */
const CHIP_STATE: Record<VisitTone, ChipState> = {
  pending: "pending",
  info: "protected",
  success: "success",
  error: "failed",
  quiet: "neutral",
};

export function chipStateOf(state: InspectionState): ChipState {
  return CHIP_STATE[toneOf(chipOf(state))];
}
