"use server";

/**
 * Pay an existing charge in crypto: the three server actions the screen calls.
 *
 * NEVER TRUST THE CLIENT. The browser sends a booking id, an asset/network
 * choice, a refund address and a payment id; every figure (the naira total,
 * the split, the crypto amount, the rate) is read or priced on the server. A
 * charge is marked paid only by a provider settlement report applied in the
 * database (`crypto_payment_apply`), never by anything this file returns.
 *
 * Every action re-checks the gate (flag, provider, direct settlement,
 * assets, payer KYC), so a stale page with the option still drawn cannot open
 * a payment after the founder switches crypto off.
 */

import { z } from "zod";

import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { guardMoney } from "../security/money-limits";
import { getAdminClient } from "../supabase/service";
import { guaranteeReserveSubaccount } from "../payments/paystack";
import { contactFromSession } from "../email/recipients";
import { cryptoAvailability, enabledPairs, payerKyc } from "./availability";
import { activeProvider } from "./providers";
import { isCryptoReference } from "./reference";
import { readCryptoPayment, requestQuote, startPayment } from "./service";
import type { CryptoPaymentView } from "./view";
import type { SupabaseClient } from "@supabase/supabase-js";

const CLOSED_MESSAGE = "Paying in crypto is not available for this charge. Nothing has been paid; you can pay another way.";
const KYC_MESSAGE = "Verify your identity first. Crypto payment is only open to people who have completed an identity check on Vallo.";
const UNAVAILABLE = "Crypto payment is temporarily unavailable. Nothing has been paid.";

const quoteSchema = z.object({
  bookingId: z.uuid(),
  asset: z.string().trim().min(2).max(10),
  network: z.string().trim().min(2).max(20),
});

const startSchema = z.object({
  paymentId: z.uuid(),
  refundAddress: z.string().trim().min(10).max(200),
});

async function openFor(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const availability = await cryptoAvailability(supabase, userId);
  if (availability.gate.open) return null;
  return availability.gate.reason === "kyc_required" ? KYC_MESSAGE : CLOSED_MESSAGE;
}

/** A quote for paying this charge in crypto. Writes a `quoted` row; moves no money. */
export async function getCryptoQuote(input: {
  bookingId: string;
  asset: string;
  network: string;
}): Promise<ActionResult<CryptoPaymentView>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const limit = await guardMoney("cryptoQuote", session.user.id);
  if (!limit.allowed) return fail(limit.message);

  const parsed = validate(quoteSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const loose = session.supabase as unknown as SupabaseClient;
  const closed = await openFor(loose, session.user.id);
  if (closed) return fail(closed);

  const admin = getAdminClient();
  const provider = activeProvider();
  if (!admin || !provider) return fail(UNAVAILABLE);

  const result = await requestQuote({
    admin,
    provider,
    enabled: enabledPairs(),
    bookingId: parsed.data.bookingId,
    payerId: session.user.id,
    asset: parsed.data.asset,
    network: parsed.data.network,
  });
  return result.ok ? ok(result.data) : fail(result.message);
}

/** Accept a quote: open the attempt and get the provider's deposit address. */
export async function startCryptoPayment(input: {
  paymentId: string;
  refundAddress: string;
}): Promise<ActionResult<CryptoPaymentView>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const limit = await guardMoney("cryptoStart", session.user.id);
  if (!limit.allowed) return fail(limit.message);

  const parsed = validate(startSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const loose = session.supabase as unknown as SupabaseClient;
  const closed = await openFor(loose, session.user.id);
  if (closed) return fail(closed);

  const admin = getAdminClient();
  const provider = activeProvider();
  if (!admin || !provider) return fail(UNAVAILABLE);

  const kyc = await payerKyc(loose, session.user.id);
  const contact = contactFromSession(session.user);
  const result = await startPayment({
    admin,
    provider,
    paymentId: parsed.data.paymentId,
    payerId: session.user.id,
    refundAddress: parsed.data.refundAddress,
    reserveCode: guaranteeReserveSubaccount(),
    payer: { email: contact?.email ?? null, legalName: kyc.legalName },
  });
  return result.ok ? ok(result.data) : fail(result.message);
}

/**
 * Where a crypto payment stands, read from OUR row under the payer's own RLS.
 * Safe to poll; never calls the provider (the webhook and the reconcile job
 * are the only things that do), so polling cannot spend a provider allowance.
 * A row that is not the caller's is simply absent.
 */
export async function cryptoPaymentStatus(reference: string): Promise<ActionResult<CryptoPaymentView | null>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const limit = await guardMoney("cryptoState", session.user.id);
  if (!limit.allowed) return fail(limit.message);

  const ref = (reference ?? "").trim();
  if (!isCryptoReference(ref)) return ok(null);
  const view = await readCryptoPayment(session.supabase as unknown as SupabaseClient, { reference: ref });
  return ok(view);
}
