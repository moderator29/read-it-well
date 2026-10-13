import { isPromotionTier, type PromotionTierSlug } from "./tiers";

/**
 * A LISTER'S OWN PROMOTION PURCHASES (`public.promotion_my_purchases()`).
 *
 * The function reads `promotion.purchases` for `auth.uid()` only, so it is
 * asked on the lister's own client and can only ever return their rows. This
 * file is the parse: anything that does not fit the shape is dropped rather
 * than guessed at, and the screen never invents a purchase.
 */
export type PromotionPurchase = {
  id: string;
  listingId: string;
  tier: PromotionTierSlug;
  amountMinor: number;
  currency: string;
  durationDays: number;
  status: string;
  paidAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
};

function whole(value: unknown): number | null {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof n === "number" && Number.isSafeInteger(n) ? n : null;
}

const text = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);

export function parsePurchases(raw: unknown): PromotionPurchase[] | null {
  if (!Array.isArray(raw)) return null;
  const out: PromotionPurchase[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const amount = whole(r["amount_minor"]);
    const days = whole(r["duration_days"]);
    const id = text(r["id"]);
    const listingId = text(r["listing_id"]);
    const created = text(r["created_at"]);
    const status = text(r["status"]);
    if (!id || !listingId || !created || !status || amount === null || days === null || !isPromotionTier(r["tier"])) continue;
    out.push({
      id,
      listingId,
      tier: r["tier"],
      amountMinor: amount,
      currency: text(r["currency"]) ?? "NGN",
      durationDays: days,
      status,
      paidAt: text(r["paid_at"]),
      startsAt: text(r["starts_at"]),
      endsAt: text(r["ends_at"]),
      createdAt: created,
    });
  }
  return out;
}

/** Paid and not yet over; otherwise the purchase's own status word is the whole story. */
export function purchasePhase(p: Pick<PromotionPurchase, "status" | "startsAt" | "endsAt">, now: number): "running" | "finished" | "other" {
  if (p.status !== "paid") return "other";
  if (p.endsAt && Date.parse(p.endsAt) <= now) return "finished";
  if (p.startsAt && Date.parse(p.startsAt) <= now) return "running";
  return "other";
}
