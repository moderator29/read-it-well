import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { phoneGateNeeded, type PhoneMoment } from "./core";
import { phoneConfirmationOn } from "./flag";

/**
 * THE THREE MOMENTS (V-50): does this action need a confirmed phone first?
 *
 * Called at the top of `requestInspection`, `submitReview` and
 * `reportSomething`. Returns the sentence to refuse with, or null to carry on.
 * With the flag off it returns null before reading anything, so the three
 * actions behave exactly as they did.
 *
 * A failed read is treated as "no need": this gate is friction in front of a
 * reputation action, not a security wall, and refusing somebody a report
 * because a count query blinked would be the worse failure.
 */

export const PHONE_REQUIRED_MESSAGE =
  "Confirm your mobile number first. It is asked once, it is never shown to anybody, and it keeps one person to one account. Open Settings, then Phone.";

type Loose = SupabaseClient;

const PRIOR: Record<PhoneMoment, { table: string; column: string }> = {
  inspection: { table: "inspection_requests", column: "requester_id" },
  review: { table: "reviews", column: "author_id" },
  report: { table: "reports", column: "reporter_id" },
};

export async function phoneGateFor(
  supabase: unknown,
  userId: string,
  moment: PhoneMoment,
  reportCategory?: string,
): Promise<string | null> {
  if (!(await phoneConfirmationOn())) return null;
  try {
    const db = supabase as Loose;
    const [{ data: phone }, { count }] = await Promise.all([
      db.from("confirmed_phones").select("user_id").eq("user_id", userId).maybeSingle(),
      db.from(PRIOR[moment].table).select("id", { count: "exact", head: true }).eq(PRIOR[moment].column, userId),
    ]);
    const needed = phoneGateNeeded({
      flagOn: true,
      confirmed: Boolean(phone),
      priorCount: count ?? 0,
      moment,
      ...(reportCategory ? { reportCategory } : {}),
    });
    return needed ? PHONE_REQUIRED_MESSAGE : null;
  } catch {
    return null;
  }
}
