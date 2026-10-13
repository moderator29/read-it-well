"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { parseRateQuote, type RateQuote, type RateRefusal } from "./rate-agreement";

/**
 * THE RATE AGREEMENT, the server half (D51). Read the figures; record the
 * acceptance. The database owns the arithmetic and the write
 * (`public.quote_listing_rate`, `public.accept_listing_rate`: SECURITY DEFINER,
 * ownership-checked), and `listings_zz_b3_rate_agreement_gate` refuses a
 * listing moving to SUBMITTED or PUBLISHED without an acceptance on the rate
 * in force and the listing's current price. A UI-only gate is not a gate.
 *
 * These sentences describe what happened to the request, not money terms.
 */

const REFUSAL_MESSAGES: Record<RateRefusal, string> = {
  not_found: "We could not find that listing on your account.",
  no_policy: "Fees cannot be shown just now. Nothing has been recorded. Please try again shortly.",
  no_price: "Add the price first, then you can review the fee on it.",
  rate_changed: "The fee changed while you were looking. Review the new figures and accept them again.",
  price_changed: "The price on this listing changed. Review the figures on the new price and accept them again.",
  signed_out: SIGNED_OUT_MESSAGE,
  bad_amount: "Add the price first, then you can review the fee on it.",
  unavailable: "Fees cannot be shown just now. Nothing has been recorded. Please try again shortly.",
};

const listingSchema = z.object({ listingId: z.string().uuid() });
const acceptSchema = z.object({
  listingId: z.string().uuid(),
  policyVersionId: z.number().int().positive(),
  amountMinor: z.number().int().positive(),
});

async function memberDb(): Promise<{ db: SupabaseClient } | { error: string }> {
  const s = await resolveSession();
  if (s.state === "unconfigured") return { error: NOT_CONFIGURED_MESSAGE };
  if (s.state === "signed-out") return { error: SIGNED_OUT_MESSAGE };
  return { db: s.supabase as unknown as SupabaseClient };
}

/** The figures a lister must accept before the listing can go for review. */
export async function quoteListingRate(input: { listingId: string }): Promise<ActionResult<RateQuote>> {
  const parsed = validate(listingSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const s = await memberDb();
  if ("error" in s) return fail(s.error);
  const { data, error } = await s.db.rpc("quote_listing_rate", { p_listing: parsed.data.listingId });
  if (error) return fail(REFUSAL_MESSAGES.unavailable);
  const quote = parseRateQuote(data);
  return "refused" in quote ? fail(REFUSAL_MESSAGES[quote.refused]) : ok(quote);
}

/**
 * Record that the lister accepted the figures they were shown. The version
 * and price they saw are sent back, so a rate or price that moved in between
 * is refused rather than accepted at a figure nobody saw.
 */
export async function acceptListingRate(input: {
  listingId: string;
  policyVersionId: number;
  amountMinor: number;
}): Promise<ActionResult<RateQuote>> {
  const parsed = validate(acceptSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const s = await memberDb();
  if ("error" in s) return fail(s.error);
  const { data, error } = await s.db.rpc("accept_listing_rate", {
    p_listing: parsed.data.listingId,
    p_policy_version: parsed.data.policyVersionId,
    p_amount_minor: parsed.data.amountMinor,
  });
  if (error) return fail(REFUSAL_MESSAGES.unavailable);
  const quote = parseRateQuote(data);
  return "refused" in quote ? fail(REFUSAL_MESSAGES[quote.refused]) : ok({ ...quote, accepted: true });
}
