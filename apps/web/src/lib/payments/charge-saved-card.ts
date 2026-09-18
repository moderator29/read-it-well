import "server-only";

/**
 * Charging a saved card, server side only.
 *
 * NOT A SERVER ACTION, DELIBERATELY. A "use server" export is an endpoint the
 * browser can call with any arguments it likes, and a function that charges a
 * chosen amount against a chosen reference must never be one. This module is
 * imported by the checkout and payment actions that already decided what is
 * owed and under which reference, and by nothing that runs in a browser.
 *
 * THE 3DS HONESTY RULE. charge_authorization cannot present a challenge. When
 * the issuing bank insists on authentication, or the token has gone stale,
 * Paystack declines. The only honest answer is to hand the person the hosted
 * checkout under the same reference, once, and never to retry the saved card:
 * a loop of declined charges is how a card gets blocked and a person gets
 * charged twice. The one decline this module acts on beyond falling back is
 * the processor saying the authorization is not reusable, on which the row is
 * marked so and never offered again.
 */

import { type ActionResult, fail, ok } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { consume, subjectForUser } from "../security/rate-limit";
import type { Json } from "../supabase/database.types";
import { recordMoneyAudit } from "../wallet/audit";
import { getAdminClient } from "../wallet/ledger";
import { logMoney } from "./observability";
import {
  PaystackError,
  chargeAuthorization,
  initializeTransaction,
  isPaystackConfigured,
} from "./paystack";

export type ChargeSavedCardOutcome =
  | { kind: "charged" }
  | { kind: "needs_hosted_checkout"; authorizationUrl: string };

/** How many saved-card charges one person may attempt in ten minutes. Fails open. */
const CHARGE_LIMIT = 10;
const CHARGE_WINDOW_SECONDS = 10 * 60;

const NOT_REUSABLE_RE = /not\s+reusable|reusable/i;

/**
 * Charge the caller's saved card for `amountMinor` kobo under `reference`.
 *
 * The card must be the caller's own (read under their RLS), live, and marked
 * reusable. `reference` is the caller's idempotency key and settlement key:
 * the webhook settles whatever charge lands under it, exactly as it would a
 * hosted checkout. On a decline the same reference is handed to
 * initializeTransaction; if the processor refuses the reference as already
 * used, the caller gets a plain failure and should start a fresh attempt
 * under a fresh reference rather than retry this one.
 */
export async function chargeSavedCard(params: {
  methodId: string;
  amountMinor: number;
  reference: string;
  purpose: string;
  metadata?: Record<string, Json>;
  /** Where a hosted fallback returns to. Defaults to the wallet. */
  callbackUrl?: string;
}): Promise<ActionResult<ChargeSavedCardOutcome>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  if (!Number.isSafeInteger(params.amountMinor) || params.amountMinor <= 0) {
    return fail("That amount is not one we can charge.");
  }
  if (!isPaystackConfigured()) {
    return fail("Card payments are unavailable right now. Nothing was charged.");
  }
  const admin = getAdminClient();
  if (!admin) return fail(NOT_CONFIGURED_MESSAGE);

  const { data: method, error: readError } = await session.supabase
    .from("payment_methods")
    .select("id, user_id, authorization_code, email_used, reusable, last4")
    .eq("id", params.methodId)
    .eq("user_id", session.user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (readError) return fail("We could not read your saved card. Nothing was charged.");
  if (!method) return fail("That card is not on your account. Choose another way to pay.");
  if (!method.reusable) {
    return fail("That card can no longer be charged without you present. Pay by card instead and we will ask the bank directly.");
  }

  const verdict = await consume({
    bucket: "card_charge",
    subject: subjectForUser(session.user.id),
    limit: CHARGE_LIMIT,
    windowSeconds: CHARGE_WINDOW_SECONDS,
  });
  if (!verdict.allowed) {
    return fail(`That is a lot of card charges at once. Try again ${verdict.retryIn}.`);
  }

  const metadata: Record<string, Json> = {
    ...(params.metadata ?? {}),
    user_id: session.user.id,
    purpose: params.purpose,
    saved_card: true,
  };

  let declined: string;
  try {
    const charge = await chargeAuthorization({
      authorizationCode: method.authorization_code,
      email: method.email_used,
      amountMinor: params.amountMinor,
      reference: params.reference,
      metadata,
    });
    if (charge.status === "success") {
      logMoney({
        surface: "fund",
        outcome: "posted",
        reason: `saved_card_charged:${params.purpose}`,
        reference: params.reference,
        amountMinor: params.amountMinor,
        userId: session.user.id,
      });
      await recordMoneyAudit(admin, {
        actor: { kind: "user", userId: session.user.id },
        action: "payment_method.charged",
        reference: params.reference,
        amountMinor: params.amountMinor,
        subjectUserId: session.user.id,
        outcome: "success",
        detail: { purpose: params.purpose, last4: method.last4 },
      });
      return ok({ kind: "charged" });
    }
    declined = charge.gatewayResponse ?? charge.status;
  } catch (e) {
    declined = e instanceof PaystackError ? e.message : "The saved card could not be charged.";
  }

  // The specific not-reusable decline: mark the row so it is never offered
  // again. The service role writes it because `reusable` is not in the
  // owner's column grant, which is the point: a browser cannot flip it back.
  if (NOT_REUSABLE_RE.test(declined)) {
    await admin
      .from("payment_methods")
      .update({ reusable: false })
      .eq("id", method.id);
  }

  logMoney({
    surface: "fund",
    outcome: "rejected",
    reason: "saved_card_declined_falling_back_to_hosted",
    reference: params.reference,
    amountMinor: params.amountMinor,
    userId: session.user.id,
  });
  await recordMoneyAudit(admin, {
    actor: { kind: "user", userId: session.user.id },
    action: "payment_method.declined",
    reference: params.reference,
    amountMinor: params.amountMinor,
    subjectUserId: session.user.id,
    outcome: "declined",
    detail: { purpose: params.purpose, reason: declined.slice(0, 200) },
  });

  // Never retry. Once, to the hosted checkout, under the same reference.
  const email = session.user.email;
  if (!email) {
    return fail("Your account has no email address, which the card processor needs. Add one to your profile and try again.");
  }
  try {
    const tx = await initializeTransaction({
      email,
      amountMinor: params.amountMinor,
      reference: params.reference,
      callbackUrl:
        params.callbackUrl ??
        `${(process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "")}/wallet?funded=1&reference=${params.reference}`,
      metadata,
    });
    return ok({ kind: "needs_hosted_checkout", authorizationUrl: tx.authorizationUrl });
  } catch (e) {
    const said =
      e instanceof PaystackError && e.status !== 401 && e.message.trim().length > 0
        ? ` The payment service said: ${e.message.trim()}`
        : "";
    return fail(
      `Your saved card was declined and the secure payment page could not be opened. Nothing was charged. Start the payment again.${said}`,
    );
  }
}
