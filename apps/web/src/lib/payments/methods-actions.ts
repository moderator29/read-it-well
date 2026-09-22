"use server";

/**
 * Saved cards: list, choose a default, remove, and start saving one.
 *
 * Every read and every owner write runs under the caller's own RLS-bound
 * client. The database has no insert policy on payment_methods for anybody
 * but the service role, and the column grant limits an owner's UPDATE to
 * is_default and deleted_at, so nothing here could file a card or rewrite a
 * token even if it tried. Removing a card is a soft delete: the row that was
 * charged last month is still the row support answers questions about.
 *
 * Saving a card is a wallet top-up of the smallest honest amount. Paystack
 * only hands out a reusable authorization after a successful charge, and a
 * charge that is then refunded would cost the person a card fee for nothing.
 * So the checkout charges NGN 100, the money lands in their wallet through the
 * existing funding path (the webhook credits the rm-fund reference exactly as
 * it does any top-up), and the webhook files the card because the metadata
 * asked it to. Nothing is lost and nothing needs refunding.
 */

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import {
  NOT_CONFIGURED_MESSAGE,
  SIGNED_OUT_MESSAGE,
  resolveSession,
} from "../actions/session";
import { isFeatureEnabled } from "../flags";
import { guardMoney } from "../security/money-limits";
import { recordMoneyAudit } from "../wallet/audit";
import { getAdminClient } from "../wallet/ledger";
import { paymentMethodIdSchema, toPaymentMethod, type PaymentMethod } from "./methods";
import { logMoney } from "./observability";
import { PaystackError, initializeTransaction, isPaystackConfigured } from "./paystack";
import { FUND_PREFIX } from "./references";

const WALLET_OFF_MESSAGE =
  "The wallet is switched off for a moment while we make improvements. Please try again shortly.";

const CARDS_DOWN_MESSAGE =
  "We could not reach your saved cards just now. Nothing has changed. Please try again in a moment.";

const NOT_YOUR_CARD_MESSAGE =
  "We could not find that card on your account. Reload the page to see the cards you have.";

/**
 * The smallest honest amount a card can be saved with: NGN 100, in kobo. It
 * lands in the wallet, so it is a top-up rather than a fee, and it is small
 * enough that nobody has to think about it.
 */
const CARD_SETUP_AMOUNT_MINOR = 100_00;

/* How many card setups one person may start in an hour is a row of the
   table in lib/security/money-limits.ts ("card_setup"). Fails open. */

/** Where callbacks land: explicit site URL first, else the request's origin. */
async function siteOrigin(): Promise<string> {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  if (explicit.length > 0) return explicit.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

/** The caller's live saved cards, default first, then newest. */
export async function listPaymentMethods(): Promise<ActionResult<PaymentMethod[]>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const { data, error } = await session.supabase
    .from("payment_methods")
    .select("*")
    .eq("user_id", session.user.id)
    .is("deleted_at", null)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return fail(CARDS_DOWN_MESSAGE);
  return ok((data ?? []).map(toPaymentMethod));
}

/** Make one card the one charged by default. The database keeps it single. */
export async function setDefaultPaymentMethod(id: string): Promise<ActionResult<null>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const parsed = validate(paymentMethodIdSchema, { id });
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const { error, count } = await session.supabase
    .from("payment_methods")
    .update({ is_default: true }, { count: "exact" })
    .eq("id", parsed.data.id)
    .eq("user_id", session.user.id)
    .is("deleted_at", null);
  if (error) return fail(CARDS_DOWN_MESSAGE);
  // Under RLS a row that is not the caller's simply is not matched.
  if (count === 0) return fail(NOT_YOUR_CARD_MESSAGE);

  revalidatePath("/settings");
  revalidatePath("/settings/payments");
  return ok(null);
}

/** Remove a card from the account. Soft: the row stays for support. */
export async function removePaymentMethod(id: string): Promise<ActionResult<null>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const parsed = validate(paymentMethodIdSchema, { id });
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const { error, count } = await session.supabase
    .from("payment_methods")
    .update({ deleted_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", parsed.data.id)
    .eq("user_id", session.user.id)
    .is("deleted_at", null);
  if (error) return fail(CARDS_DOWN_MESSAGE);
  if (count === 0) return fail(NOT_YOUR_CARD_MESSAGE);

  revalidatePath("/settings");
  revalidatePath("/settings/payments");
  return ok(null);
}

/**
 * Start saving a card: a NGN 100 wallet top-up whose metadata asks the
 * webhook to keep the card. The person is sent to the hosted checkout, pays,
 * and comes back to the wallet with the money in it and the card on file.
 *
 * Mirrors fundWallet line for line where it matters: the service role client
 * is resolved and refused on BEFORE the charge is opened, so a checkout can
 * never be started that nothing on our side can account for.
 */
export async function startCardSetup(): Promise<
  ActionResult<{ authorizationUrl: string; accessCode: string; reference: string }>
> {
  if (!(await isFeatureEnabled("wallet"))) return fail(WALLET_OFF_MESSAGE);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  if (!isPaystackConfigured()) {
    return fail("We cannot save a card right now. Nothing was charged.");
  }

  const admin = getAdminClient();
  if (!admin) {
    logMoney({
      surface: "fund",
      outcome: "unconfigured",
      reason: "service_role_key_missing",
      userId: session.user.id,
    });
    return fail(
      "Saving a card is unavailable just now, so nothing was charged. This is our side, not yours, and it is already flagged. Please try again shortly.",
    );
  }

  const email = session.user.email;
  if (!email) {
    return fail(
      "Your account has no email address, which the card processor needs. Add one to your profile and try again.",
    );
  }

  const limit = await guardMoney("startCardSetup", session.user.id);
  if (!limit.allowed) return fail(limit.message);

  const reference = `${FUND_PREFIX}${randomUUID()}`;
  const callbackUrl = `${await siteOrigin()}/wallet?funded=1&reference=${reference}`;

  try {
    const tx = await initializeTransaction({
      email,
      amountMinor: CARD_SETUP_AMOUNT_MINOR,
      reference,
      callbackUrl,
      metadata: { user_id: session.user.id, purpose: "card-setup", save_card: true },
    });
    logMoney({
      surface: "fund",
      outcome: "received",
      reason: "card_setup_checkout_opened",
      reference,
      amountMinor: CARD_SETUP_AMOUNT_MINOR,
      userId: session.user.id,
    });
    await recordMoneyAudit(admin, {
      actor: { kind: "user", userId: session.user.id },
      action: "wallet.funding.started",
      reference,
      amountMinor: CARD_SETUP_AMOUNT_MINOR,
      subjectUserId: session.user.id,
      outcome: "started",
      detail: { purpose: "card-setup" },
    });
    /* See the note on CardCheckout.accessCode: the same transaction, resumable
       in a checkout drawn on our own page instead of on Paystack's. */
    return ok({
      authorizationUrl: tx.authorizationUrl,
      accessCode: tx.accessCode,
      reference: tx.reference,
    });
  } catch (e) {
    logMoney({
      surface: "fund",
      outcome: "failed",
      reason: "card_setup_checkout_could_not_open",
      reference,
      amountMinor: CARD_SETUP_AMOUNT_MINOR,
      userId: session.user.id,
    });
    const said =
      e instanceof PaystackError && e.status !== 401 && e.message.trim().length > 0
        ? ` The payment service said: ${e.message.trim()}`
        : "";
    return fail(`The secure payment page could not be opened. Nothing was charged.${said}`);
  }
}
