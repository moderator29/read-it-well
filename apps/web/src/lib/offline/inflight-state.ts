"use server";

import { resolveSession } from "../actions/session";
import { guardMoney } from "../security/money-limits";
import { isBookingReference, isFundReference } from "../payments/references";

/**
 * WHAT HAPPENED TO A PAYMENT THAT LOST ITS CONNECTION: THE TRAY'S OWN READ. V-40.
 *
 * `paymentState` folds "no row" into pending, which is right for a checkout
 * panel that just opened Paystack and wrong for the tray: a person whose
 * checkout never reached Paystack has not been charged, and must not be told
 * "do not pay again". So this read tells them apart:
 *
 *   paid      the row says the money arrived;
 *   failed    the row says it did not (nothing was taken);
 *   returned  it arrived and was sent back (REVERSED, REFUNDED);
 *   pending   a row exists and Paystack has not decided;
 *   none      no row: nothing was started under this reference, or not yet;
 *   unknown   could not ask (signed out, rate limited, a read error).
 *
 * Read only, under the person's own RLS client: another person's reference
 * reads as `none`, exactly like a reference that does not exist.
 */
export type InflightAnswer = {
  state: "paid" | "failed" | "returned" | "pending" | "none" | "unknown";
  /** Where the record of it lives. */
  history: "/wallet/transactions" | "/bookings";
};

export async function inflightState(reference: string): Promise<InflightAnswer> {
  const ref = (reference ?? "").trim();
  const fund = isFundReference(ref);
  const history = fund ? "/wallet/transactions" : "/bookings";
  const unknown: InflightAnswer = { state: "unknown", history };
  const session = await resolveSession();
  if (session.state !== "signed-in" || ref.length === 0 || ref.length > 200) return unknown;
  const limit = await guardMoney("paymentState", session.user.id);
  if (!limit.allowed) return unknown;

  if (fund) {
    const { data, error } = await session.supabase.from("wallet_entries").select("status").eq("reference", ref).maybeSingle();
    if (error) return unknown;
    if (!data) return { state: "none", history };
    if (data.status === "COMPLETED") return { state: "paid", history };
    if (data.status === "FAILED") return { state: "failed", history };
    if (data.status === "REVERSED") return { state: "returned", history };
    return { state: "pending", history };
  }
  if (isBookingReference(ref)) {
    const { data, error } = await session.supabase.from("transactions").select("status").eq("provider_ref", ref).maybeSingle();
    if (error) return unknown;
    if (!data) return { state: "none", history };
    if (data.status === "SUCCESSFUL") return { state: "paid", history };
    if (data.status === "FAILED") return { state: "failed", history };
    if (data.status === "REFUNDED") return { state: "returned", history };
    return { state: "pending", history };
  }
  return { state: "none", history };
}
