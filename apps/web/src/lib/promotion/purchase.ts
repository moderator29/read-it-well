import "server-only";

import { PaystackError, PaystackUnknownOutcome } from "@/lib/payments/paystack";
import { FiatProviderDisabled, assertProviderEnabled, openCheckout, paystackSeam } from "@/lib/payments/providers";
import { logMoney } from "@/lib/payments/observability";
import type { AdminClient } from "@/lib/supabase/service";
import { PROMOTION_TIERS, type PromotionTier } from "./inventory";
import { PROMOTION_PREFIX } from "./reference";

/**
 * OPEN A PROMOTION PURCHASE (D60, docs/promotion/VALLO_PROMOTION.md).
 *
 * Promotion is Vallo's own revenue: a SINGLE-PARTY Paystack charge to Vallo's
 * account. No split, no subaccount, no escrow, and nothing borrowed from the
 * booking flow. `openCheckout` is called without `split`, so it takes the
 * plain `collect` path.
 *
 * THE AMOUNT NEVER COMES FROM THE CLIENT. The caller passes a tier slug; the
 * database (`promotion_purchase_open`) reads today's dated price row, freezes
 * it on the purchase and returns it. The webhook later checks the charge
 * against that frozen row.
 *
 * NOTHING ACTIVATES HERE. A purchase becomes a placement only when the
 * webhook confirms the charge (`./webhook.ts`). A returning browser proves
 * nothing.
 *
 * The caller (a server action) resolves the session and passes the member's
 * own id and email; this module trusts them as already authenticated.
 *
 * D50: the member never sees provider text. Every failure is one of the fixed
 * reasons below, which the surface maps to locale copy.
 */

export type PromotionOpenFailure =
  | "unknown_tier"
  | "not_your_listing"
  | "listing_not_published"
  | "already_active"
  | "no_price"
  /** Another checkout for this listing and tier opened within the hour. */
  | "purchase_in_progress"
  /** D60: the price in force is only proposed; nothing is sold until it is confirmed. */
  | "price_not_confirmed"
  | "payments_paused"
  | "unavailable"
  /** The provider may have opened the checkout; we do not know. Never "failed". */
  | "outcome_unknown";

export type PromotionOpenResult =
  | {
      ok: true;
      purchaseId: string;
      reference: string;
      amountMinor: number;
      currency: "NGN";
      authorizationUrl: string;
      accessCode: string;
    }
  | { ok: false; reason: PromotionOpenFailure };

const DB_REASONS: ReadonlySet<PromotionOpenFailure> = new Set([
  "unknown_tier",
  "not_your_listing",
  "listing_not_published",
  "already_active",
  "no_price",
  "price_not_confirmed",
  "purchase_in_progress",
]);

type Rpc = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
};

export function isPromotionTier(value: unknown): value is PromotionTier {
  return typeof value === "string" && (PROMOTION_TIERS as readonly string[]).includes(value);
}

/** Moves a purchase's status. Best effort: no sweep exists yet, so a missed move stays where it was until one is built; nothing guesses. */
export async function markPromotionPurchase(
  admin: AdminClient,
  reference: string,
  status: "pending" | "unknown" | "failed" | "abandoned",
): Promise<boolean> {
  try {
    const { data, error } = await (admin as unknown as Rpc).rpc("promotion_purchase_mark", {
      p_reference: reference,
      p_status: status,
    });
    return !error && data === true;
  } catch {
    return false;
  }
}

type OpenRow = {
  ok?: unknown;
  reason?: unknown;
  purchase_id?: unknown;
  reference?: unknown;
  amount_minor?: unknown;
  currency?: unknown;
};

export async function openPromotionPurchase(
  admin: AdminClient,
  input: { memberId: string; email: string; listingId: string; tier: string; callbackUrl: string },
): Promise<PromotionOpenResult> {
  if (!isPromotionTier(input.tier)) return { ok: false, reason: "unknown_tier" };

  // The kill switch gates what starts money movement.
  try {
    await assertProviderEnabled("paystack");
  } catch (e) {
    if (e instanceof FiatProviderDisabled) return { ok: false, reason: "payments_paused" };
    return { ok: false, reason: "unavailable" };
  }

  let row: OpenRow;
  try {
    const { data, error } = await (admin as unknown as Rpc).rpc("promotion_purchase_open", {
      p_member: input.memberId,
      p_listing: input.listingId,
      p_tier: input.tier,
    });
    if (error || !data || typeof data !== "object") return { ok: false, reason: "unavailable" };
    row = data as OpenRow;
  } catch {
    return { ok: false, reason: "unavailable" };
  }

  if (row.ok !== true) {
    const reason = typeof row.reason === "string" ? (row.reason as PromotionOpenFailure) : "unavailable";
    return { ok: false, reason: DB_REASONS.has(reason) ? reason : "unavailable" };
  }

  const reference = typeof row.reference === "string" ? row.reference : "";
  const purchaseId = typeof row.purchase_id === "string" ? row.purchase_id : "";
  const amountMinor = typeof row.amount_minor === "number" ? row.amount_minor : Number(row.amount_minor);
  if (
    !reference.startsWith(PROMOTION_PREFIX) ||
    purchaseId.length === 0 ||
    !Number.isSafeInteger(amountMinor) ||
    amountMinor <= 0 ||
    row.currency !== "NGN"
  ) {
    return { ok: false, reason: "unavailable" };
  }

  try {
    // No `split`: Vallo's own revenue, one party, settles to the main account.
    const opened = await openCheckout(paystackSeam(), {
      reference,
      amountMinor,
      email: input.email,
      callbackUrl: input.callbackUrl,
      metadata: { kind: "promotion", purchase_id: purchaseId, listing_id: input.listingId, tier: input.tier },
    });
    await markPromotionPurchase(admin, reference, "pending");
    logMoney({ surface: "promotion", outcome: "received", reason: "promotion_checkout_opened", reference, amountMinor });
    return {
      ok: true,
      purchaseId,
      reference,
      amountMinor,
      currency: "NGN",
      authorizationUrl: opened.authorizationUrl,
      accessCode: opened.accessCode,
    };
  } catch (e) {
    if (e instanceof PaystackUnknownOutcome) {
      // A timeout is not a failure: the checkout may exist. The webhook still
      // activates it if the member pays.
      await markPromotionPurchase(admin, reference, "unknown");
      logMoney({ surface: "promotion", outcome: "failed", reason: "promotion_open_outcome_unknown", reference, amountMinor });
      return { ok: false, reason: "outcome_unknown" };
    }
    if (e instanceof PaystackError) {
      // An explicit refusal: no checkout exists, nothing can be paid.
      await markPromotionPurchase(admin, reference, "failed");
      logMoney({ surface: "promotion", outcome: "rejected", reason: "promotion_open_refused", reference, amountMinor });
      return { ok: false, reason: "unavailable" };
    }
    await markPromotionPurchase(admin, reference, "unknown");
    logMoney({ surface: "promotion", outcome: "failed", reason: "promotion_open_threw", reference, amountMinor });
    return { ok: false, reason: "outcome_unknown" };
  }
}
