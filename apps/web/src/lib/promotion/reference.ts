/**
 * A promotion purchase reference: `rm-promo-<purchase uuid>`, minted by the
 * database (`promotion_purchase_open`). Its own prefix so the webhook tells it
 * apart from a booking charge without reading metadata.
 */
export const PROMOTION_PREFIX = "rm-promo-";

const PROMOTION_REFERENCE_RE =
  /^rm-promo-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPromotionReference(value: string): boolean {
  return PROMOTION_REFERENCE_RE.test(value);
}
