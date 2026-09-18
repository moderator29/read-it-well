import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Json } from "../supabase/database.types";
import type { PaymentMethodRow } from "./db";
import { metadataObject, readAuthorization, type PaystackAuthorization } from "./paystack";

/**
 * Saved cards, the shared half.
 *
 * Client-safe types and schemas for the settings page, plus the one server
 * routine the webhook uses to file a card. Nothing here trusts a browser: the
 * authorization object comes from Paystack's own payload, read by
 * `readAuthorization`, and the only way a row is ever inserted is the service
 * role in `savePaymentMethodFromCharge`.
 */

/** One saved card as the settings page shows it. Never a card number. */
export type PaymentMethod = {
  id: string;
  /** Brand, e.g. visa or mastercard, as Paystack names it. */
  cardType: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  bank: string | null;
  /** False once the processor has said the token can no longer be charged. */
  reusable: boolean;
  isDefault: boolean;
  createdAt: string;
};

export const paymentMethodIdSchema = z.object({
  id: z.uuid("That card could not be identified."),
});

/** The rows a person sees: their own live methods, default first. */
export function toPaymentMethod(row: PaymentMethodRow): PaymentMethod {
  return {
    id: row.id,
    cardType: row.card_type,
    last4: row.last4,
    expMonth: row.exp_month,
    expYear: row.exp_year,
    bank: row.bank,
    reusable: row.reusable,
    isDefault: row.is_default,
    createdAt: row.created_at,
  };
}

/**
 * The one-line contract with the checkout: a charge whose metadata carries
 * `save_card: true` (the boolean, or the string the stringified-metadata
 * quirk turns it into) asked for its card to be kept.
 */
export function chargeAskedToSaveCard(metadata: unknown): boolean {
  const meta = metadataObject(metadata);
  const flag = meta["save_card"];
  return flag === true || flag === "true";
}

export type SavePaymentMethodOutcome = "saved" | "updated" | "skipped" | "failed";

/**
 * File the card a successful charge was paid with, when the charge asked for
 * it and the processor says the token is reusable.
 *
 * SERVICE ROLE ONLY, by construction: payment_methods has no insert policy,
 * so nothing but the admin client can reach this insert, and the admin client
 * is only ever handed a payload the webhook has already signature-verified or
 * the verify endpoint has returned. Authorization data is never accepted from
 * a client.
 *
 * Keyed on (user_id, signature): paying again with the same card refreshes
 * the token on the existing row rather than adding a second card. The partial
 * unique index cannot be named in a PostgREST upsert, so this is a read then
 * a write; a 23505 on the write means the other delivery of a replayed
 * webhook got there first, which is the same outcome.
 *
 * Never throws. A card that could not be filed is a missing convenience, not
 * a failed payment, and must never turn a credited funding into a 500.
 */
export async function savePaymentMethodFromCharge(
  admin: SupabaseClient<import("../supabase/database.types").Database>,
  charge: {
    userId: string;
    email: string | null;
    metadata: unknown;
    authorization: unknown;
  },
): Promise<SavePaymentMethodOutcome> {
  if (!chargeAskedToSaveCard(charge.metadata)) return "skipped";
  const authorization: PaystackAuthorization | null = readAuthorization(charge.authorization);
  if (!authorization || !authorization.reusable) return "skipped";
  if (!charge.email) return "skipped";

  try {
    const { data: existing, error: readError } = await admin
      .from("payment_methods")
      .select("id")
      .eq("user_id", charge.userId)
      .eq("signature", authorization.signature)
      .is("deleted_at", null)
      .maybeSingle();
    if (readError) return "failed";

    const facts = {
      authorization_code: authorization.authorizationCode,
      card_type: authorization.cardType,
      last4: authorization.last4,
      exp_month: authorization.expMonth,
      exp_year: authorization.expYear,
      bin: authorization.bin,
      bank: authorization.bank,
      channel: authorization.channel,
      reusable: true,
      email_used: charge.email,
    };

    if (existing) {
      const { error } = await admin.from("payment_methods").update(facts).eq("id", existing.id);
      return error ? "failed" : "updated";
    }

    const { error } = await admin.from("payment_methods").insert({
      user_id: charge.userId,
      signature: authorization.signature,
      ...facts,
    });
    if (error) return error.code === "23505" ? "updated" : "failed";
    return "saved";
  } catch {
    return "failed";
  }
}

/** Metadata a charge carries when the payer asked for the card to be kept. */
export function saveCardMetadata(extra: Record<string, Json>): Record<string, Json> {
  return { ...extra, save_card: true };
}
