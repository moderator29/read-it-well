import "server-only";

import { createPlan, listPlans, type PaystackMode } from "@/lib/payments/paystack";
import type { AdminClient } from "@/lib/supabase/service";

/**
 * THE PAYSTACK PLAN FOR A VALLO PLAN, AT ITS PRICE, IN THIS MODE.
 *
 * Paystack owns the monthly charge, so each Vallo plan needs a Paystack plan
 * at exactly the plan row's `price_minor`. The code is recorded in
 * `public.subscription_provider_plans` per plan, mode and price, and created
 * the first time it is needed:
 *
 *   1. the recorded code, if there is one: done;
 *   2. otherwise a monthly NGN plan Paystack already has at this amount under
 *      the name this file gives it (a code made earlier whose record was lost);
 *   3. otherwise a new plan at Paystack.
 *
 * Then it is recorded through `subscription_provider_plan_record`, where the
 * first code recorded wins, and the stored one is used. A price change is a
 * new plan row with a new price, so it gets a new code; the old code keeps
 * charging the people already on it at what they agreed to.
 *
 * The amount is never the client's: the caller passes the price it read from
 * the plan row, and the database refuses a checkout at any other.
 */

type Rpc = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
};
type LooseTable = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: unknown) => LooseFilter;
    };
  };
};
type LooseFilter = {
  eq: (column: string, value: unknown) => LooseFilter;
  maybeSingle: () => PromiseLike<{ data: unknown; error: unknown }>;
};

/** The name a Vallo plan's Paystack plan carries, so step 2 can recognise it. */
export function paystackPlanName(planName: string, planKey: string, amountMinor: number): string {
  return `${planName} monthly (${planKey}, ${amountMinor} kobo)`;
}

export async function recordedPlanCode(
  admin: AdminClient,
  input: { planKey: string; mode: PaystackMode; amountMinor: number },
): Promise<string | null> {
  const { data, error } = await (admin as unknown as LooseTable)
    .from("subscription_provider_plans")
    .select("provider_plan_code")
    .eq("provider", "paystack")
    .eq("mode", input.mode)
    .eq("plan_key", input.planKey)
    .eq("amount_minor", input.amountMinor)
    .eq("billing_interval", "monthly")
    .maybeSingle();
  if (error || !data) return null;
  const code = (data as { provider_plan_code?: unknown }).provider_plan_code;
  return typeof code === "string" && code.startsWith("PLN_") ? code : null;
}

/**
 * The plan code to charge under. Throws whatever the Paystack client throws
 * (PaystackError, PaystackUnknownOutcome) when it has to ask Paystack and
 * cannot; returns null when the code could not be recorded.
 */
export async function ensurePaystackPlan(
  admin: AdminClient,
  input: { planKey: string; planName: string; mode: PaystackMode; amountMinor: number },
): Promise<string | null> {
  const recorded = await recordedPlanCode(admin, input);
  if (recorded) return recorded;

  const name = paystackPlanName(input.planName, input.planKey, input.amountMinor);
  const existing = (await listPlans({ amountMinor: input.amountMinor, interval: "monthly" })).find(
    (p) => p.name === name && p.amountMinor === input.amountMinor && p.interval === "monthly" && p.currency === "NGN",
  );
  const code =
    existing?.planCode ??
    (
      await createPlan({
        name,
        amountMinor: input.amountMinor,
        interval: "monthly",
        description: `${input.planName}, charged monthly. Created by Vallo for subscriptions.`,
      })
    ).planCode;

  const { data, error } = await (admin as unknown as Rpc).rpc("subscription_provider_plan_record", {
    p_plan_key: input.planKey,
    p_mode: input.mode,
    p_plan_code: code,
    p_amount_minor: input.amountMinor,
  });
  if (error || typeof data !== "string" || !data.startsWith("PLN_")) return null;
  return data;
}
