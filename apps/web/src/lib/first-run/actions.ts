"use server";

import { markFirstRunSeen } from "./store";

/**
 * The client-callable write (W7-R2), for a first run that records itself as it
 * opens from the browser. The feature key is validated server-side and the row
 * is always the caller's own (RLS). Never throws.
 */
export async function markFirstRunSeenAction(feature: string): Promise<void> {
  await markFirstRunSeen(typeof feature === "string" ? feature : "");
}
