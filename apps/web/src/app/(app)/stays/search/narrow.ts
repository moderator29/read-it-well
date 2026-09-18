import type { StaySearchRow } from "@/lib/stays/types";

/**
 * The category tile's `type`, applied to a page of projection rows.
 *
 * A seam: `StaysQuery` (BB's `lib/stays/filters.ts`) carries no kind, so
 * the tiles narrow the returned page by its `kind` column until it does.
 * The count shown for a narrowed page is the narrowed page's length, never
 * the projection's total, so the number is always true of what is drawn.
 */
const TYPE_KINDS: Record<string, string[]> = {
  hotel: ["hotel"],
  apartment: ["apartment", "serviced_apartments"],
  resort: ["resort", "villa"],
  guest_house: ["guest_house", "home"],
  serviced_apartments: ["serviced_apartments", "apartment"],
  shortlet: ["shortlet", "shortlet_operator"],
};

export function readType(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && /^[a-z_]{1,32}$/.test(raw) ? raw : undefined;
}

export function narrowByType(rows: StaySearchRow[], type: string | undefined): StaySearchRow[] {
  if (!type) return rows;
  const kinds = TYPE_KINDS[type] ?? [type];
  return rows.filter((row) => kinds.includes(row.kind));
}
