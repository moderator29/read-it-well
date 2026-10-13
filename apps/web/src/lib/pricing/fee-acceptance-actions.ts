"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import {
  FEE_TERMS_VERSION,
  acceptFeeTermsArgs,
  parseFeeTermsQuote,
  type FeeTermsQuote,
  type FeeTermsRefusal,
} from "./fee-acceptance";

/**
 * THE FEE ACCEPTANCE RECORD, the server half (D61). Calls run on the member's
 * own session so the record's actor is the JWT subject (auth.uid()), never a
 * value this server asserts. The database recomputes every figure from policy
 * and refuses the write unless the figures sent are exactly its own.
 *
 * Not wired to publishing: the flag-gated block is b3_rate_agreement_gate's job.
 */

const REFUSAL_MESSAGES: Record<FeeTermsRefusal, string> = {
  not_found: "We could not find that listing on your account.",
  no_policy: "Fees cannot be shown just now. Nothing has been recorded. Please try again shortly.",
  no_price: "Add the price first, then you can review the fee on it.",
  rate_changed: "The fee changed while you were looking. Review the new figures and accept them again.",
  price_changed: "The price on this listing changed. Review the figures on the new price and accept them again.",
  figures_mismatch: "The figures changed while you were looking. Review them again and accept. Nothing has been recorded.",
  bad_terms_version: "The fee terms were updated. Review them again and accept. Nothing has been recorded.",
  signed_out: SIGNED_OUT_MESSAGE,
  bad_amount: "Add the price first, then you can review the fee on it.",
  unavailable: "Fees cannot be shown just now. Nothing has been recorded. Please try again shortly.",
};

const listingSchema = z.object({ listingId: z.string().uuid() });
const minor = z.number().int().nonnegative();
const acceptSchema = z.object({
  listingId: z.string().uuid(),
  policyVersionId: z.number().int().positive(),
  protectionRateId: z.number().int().positive(),
  rentMinor: z.number().int().positive(),
  feeLowMinor: minor,
  feeHighMinor: minor,
  receiveLowMinor: minor,
  receiveHighMinor: minor,
});

async function memberDb(): Promise<{ db: SupabaseClient } | { error: string }> {
  const s = await resolveSession();
  if (s.state === "unconfigured") return { error: NOT_CONFIGURED_MESSAGE };
  if (s.state === "signed-out") return { error: SIGNED_OUT_MESSAGE };
  return { db: s.supabase as unknown as SupabaseClient };
}

/** The worst-case-anchored range the lister is shown, and whether they must accept (again). */
export async function quoteFeeTerms(input: { listingId: string }): Promise<ActionResult<FeeTermsQuote>> {
  const parsed = validate(listingSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const s = await memberDb();
  if ("error" in s) return fail(s.error);
  const { data, error } = await s.db.rpc("fee_terms_quote", { p_listing: parsed.data.listingId });
  if (error) return fail(REFUSAL_MESSAGES.unavailable);
  const quote = parseFeeTermsQuote(data);
  return "refused" in quote ? fail(REFUSAL_MESSAGES[quote.refused]) : ok(quote);
}

/**
 * Record that the lister accepted exactly the figures they were shown. The
 * terms version is this server's, never the client's.
 */
export async function acceptFeeTerms(input: {
  listingId: string;
  policyVersionId: number;
  protectionRateId: number;
  rentMinor: number;
  feeLowMinor: number;
  feeHighMinor: number;
  receiveLowMinor: number;
  receiveHighMinor: number;
}): Promise<ActionResult<FeeTermsQuote>> {
  const parsed = validate(acceptSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const s = await memberDb();
  if ("error" in s) return fail(s.error);
  const shown = parsed.data;
  const { data, error } = await s.db.rpc(
    "accept_fee_terms",
    acceptFeeTermsArgs(
      {
        listingId: shown.listingId,
        policyVersionId: shown.policyVersionId,
        protectionRateId: shown.protectionRateId,
        rentMinor: shown.rentMinor,
        feeLowMinor: shown.feeLowMinor,
        feeHighMinor: shown.feeHighMinor,
        receiveLowMinor: shown.receiveLowMinor,
        receiveHighMinor: shown.receiveHighMinor,
      } as FeeTermsQuote,
      FEE_TERMS_VERSION,
    ),
  );
  if (error) return fail(REFUSAL_MESSAGES.unavailable);
  const quote = parseFeeTermsQuote(data);
  return "refused" in quote ? fail(REFUSAL_MESSAGES[quote.refused]) : ok(quote);
}
