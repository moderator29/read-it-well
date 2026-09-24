import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "../locale";
import { countsAsOwnReport, phoneGateNeeded, type PhoneMoment } from "./core";
import { phoneConfirmationOn } from "./flag";

/**
 * THE THREE MOMENTS (V-50): does this action need a confirmed phone first?
 *
 * Called at the top of `requestInspection`, `submitReview`,
 * `submitTenancyReview` and `reportSomething`. Returns the sentence to refuse with, or null to carry on.
 * With the flag off it returns null before reading anything, so the three
 * actions behave exactly as they did.
 *
 * A failed read is treated as "no need": this gate is friction in front of a
 * reputation action, not a security wall, and refusing somebody a report
 * because a count query blinked would be the worse failure.
 */

type Loose = SupabaseClient;

/**
 * How many earlier actions of this kind the member has. A review is a stay
 * review or a tenancy review (V-59), so both tables count. A report counts
 * only if the member chose to write it: danger reports and the reports V-05
 * files from a renter's answers do not use up the first-report moment.
 */
async function priorCount(db: Loose, userId: string, moment: PhoneMoment): Promise<number> {
  if (moment === "inspection") {
    const { count } = await db
      .from("inspection_requests")
      .select("id", { count: "exact", head: true })
      .eq("requester_id", userId);
    return count ?? 0;
  }
  if (moment === "review") {
    const [stay, tenancy] = await Promise.all([
      db.from("reviews").select("id", { count: "exact", head: true }).eq("author_id", userId),
      db.from("tenancy_reviews").select("rent_payment_id", { count: "exact", head: true }).eq("tenant_id", userId),
    ]);
    return (stay.count ?? 0) + (tenancy.error ? 0 : (tenancy.count ?? 0));
  }
  const { data } = await db.from("reports").select("category, reason").eq("reporter_id", userId).limit(50);
  const rows = Array.isArray(data) ? (data as { category: string | null; reason: string | null }[]) : [];
  return rows.filter(countsAsOwnReport).length;
}

export async function phoneGateFor(
  supabase: unknown,
  userId: string,
  moment: PhoneMoment,
  reportCategory?: string,
): Promise<string | null> {
  if (!(await phoneConfirmationOn())) return null;
  try {
    const db = supabase as Loose;
    const [{ data: phone }, prior] = await Promise.all([
      db.from("confirmed_phones").select("user_id").eq("user_id", userId).maybeSingle(),
      priorCount(db, userId, moment),
    ]);
    const needed = phoneGateNeeded({
      flagOn: true,
      confirmed: Boolean(phone),
      priorCount: prior,
      moment,
      ...(reportCategory ? { reportCategory } : {}),
    });
    return needed ? getDictionary(await getLocale()).trustVisible.phone.required : null;
  } catch {
    return null;
  }
}
