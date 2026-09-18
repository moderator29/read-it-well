import "server-only";

import {
  DRIFT_REPORT_LIMIT,
  driftVerdict,
  parseDriftReport,
  type JobVerdict,
} from "../../bookings/lifecycle";
import { callServiceFunction, type AdminClient } from "../rpc";

/**
 * The nightly inventory drift sweep. public.inventory_drift compares, for
 * tonight and every night ahead, room_inventory.units_booked against the
 * rooms held by live bookings (once M6 gives bookings a room type; until
 * then any sold unit is drift), and the listing calendar against live
 * whole-place bookings in both directions. It reads only. Any row it returns
 * becomes one risk_alerts row carrying the ids and dates for the admin
 * alerts desk; nothing is corrected, because silent correction hides the
 * writer that is wrong.
 */
export async function inventoryDrift(admin: AdminClient): Promise<JobVerdict> {
  const data = await callServiceFunction(admin, "inventory_drift", {
    p_limit: DRIFT_REPORT_LIMIT,
  });
  return driftVerdict(parseDriftReport(data));
}
