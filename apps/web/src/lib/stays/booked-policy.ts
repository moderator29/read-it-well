import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import { termsFromPolicyRules, type CancellationTerms } from "../trust/cancellation";
import { checkInHourOf } from "../host/cancellation-presets";

/**
 * THE CANCELLATION POLICY ON THE RATE A GUEST IS BOOKING, as terms the
 * checkout timeline can draw against the stay's dates and total.
 *
 * A host picks Flexible, Moderate, Firm or Strict in the wizard and it is put
 * on every rate they sell; the guest is shown that policy's tiers on the stay
 * page and here, before they pay. Read through the guest's own client, which
 * `bookings` RLS scopes to their own booking. Null when the booking has no
 * rate plan (a listing stay), when its policy has no readable tiers, or on
 * any failure, and the timeline then draws the platform schedule as before.
 *
 * DISPLAY ONLY. Which terms a refund is computed from is decided in the
 * database when the stay is accepted
 * (`private.stay_agreement_carries_cancellation_terms`), and
 * `20261013090100_a_stay_refund_follows_the_policy_the_guest_booked.sql`
 * is what makes that the booked policy too. The two must ship together.
 */
export async function readBookedPolicyTerms(bookingId: string): Promise<CancellationTerms | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = (await createClient()) as unknown as SupabaseClient;
    const { data, error } = await supabase
      .from("bookings")
      .select("rate_plan_id, accommodations(check_in_from), rate_plans(cancellation_policies(id, rules))")
      .eq("id", bookingId)
      .maybeSingle();
    if (error || !data) return null;
    const plan = (data as { rate_plans?: { cancellation_policies?: { id: string; rules: unknown } | null } | null })
      .rate_plans;
    const policy = plan?.cancellation_policies ?? null;
    if (!policy) return null;
    /* Deadlines count from check-in at the property's own stated time. */
    const checkInFrom = (data as { accommodations?: { check_in_from?: string | null } | null }).accommodations?.check_in_from;
    return termsFromPolicyRules(policy.id, policy.rules, checkInHourOf(checkInFrom));
  } catch {
    return null;
  }
}
