import "server-only";

import { createAdminClient } from "../supabase/admin";
import { deriveRiskFor } from "./risk-derive";

/**
 * SCUML item 15: re-derive one person's class straight after something that
 * feeds it (a PEP answer, a staff flag), so a gate reads the new class now
 * rather than after tonight's run. Best effort: if the service role is not
 * available the daily job picks the person up, because `risk_people_due`
 * lists anyone with a PEP record newer than their class.
 */
export async function deriveRiskSoon(userId: string): Promise<void> {
  try {
    await deriveRiskFor(createAdminClient(), userId);
  } catch {
    /* The job is the backstop. */
  }
}
