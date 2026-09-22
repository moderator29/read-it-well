import "server-only";

import { createAdminClient } from "../supabase/admin";
import { requireAdmin } from "./guard";

/**
 * How many reports have been waiting longer than the promise.
 *
 * WHY THIS NUMBER EXISTS. `lib/legal/eula.tsx` says, in a document people
 * accept at sign up: "We act on every report within 24 hours." That sentence
 * is the one App Review's rejection message asks for, and it is also a promise
 * this company is now making to everybody who ticks the box. A promise nobody
 * measures is a promise nobody keeps, and the moderator opening this console
 * had no way to tell whether it was being kept.
 *
 * So the console prints this beside the queue, in words rather than as a
 * badge, and it prints a zero as a zero rather than hiding when the queue is
 * clean. Nothing here enforces anything: enforcement is a person reading the
 * queue. This is the instrument on the dashboard.
 *
 * WHY THE SERVICE ROLE. The same reason `getReports` uses it: a report is
 * written by its reporter and read by an admin, and `reports_select_own` would
 * show a moderator only the reports they had filed themselves. `requireAdmin`
 * decides who may ask, and it decides before the client is built.
 *
 * NULL IS A REAL ANSWER AND IT MEANS "COULD NOT COUNT". It is never rendered
 * as a zero, because "nothing is overdue" and "we could not tell" are opposite
 * facts and printing one for the other on a safety instrument is exactly the
 * invented number rule 15 forbids.
 */

/** The promise, in hours, in one place. */
export const REPORT_RESPONSE_HOURS = 24;

/** The statuses that mean nobody has finished with this report yet. */
const STILL_WAITING = ["open", "reviewing"] as const;

export async function countOverdueReports(): Promise<number | null> {
  const access = await requireAdmin();
  if (access.state !== "admin") return null;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return null;
  }

  const cutoff = new Date(Date.now() - REPORT_RESPONSE_HOURS * 3_600_000).toISOString();

  try {
    const { count, error } = await admin
      .from("reports")
      .select("id", { count: "exact", head: true })
      .in("status", [...STILL_WAITING])
      .lt("created_at", cutoff);
    if (error) return null;
    return count ?? null;
  } catch {
    return null;
  }
}
