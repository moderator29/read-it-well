import type { UiIconName } from "@/design-system/icons/UiIcon";
import type { BrandIconObject } from "@/design-system/icons/BrandIcon";

/**
 * THE PLATFORM'S OWN ICONS IN THE NAVIGATION (Track M, 25 September 2026).
 *
 * The founder: "use the current platform icons, not the old black and white".
 * The drawer rows and the dock's sub-nav tray had moved to plain line glyphs
 * in grey with the pump.fun layout; the layout stays and the glyphs go back to
 * the blue glass objects the rest of the product speaks in.
 *
 * This supersedes, for these two surfaces, the older rule in BrandIcon.tsx
 * that navigation never uses glass objects. The dock capsule keeps its line
 * glyphs: five icons in a 56px bar is the one place a filled/outline pair
 * reads better than five small objects.
 *
 * A destination missing from this map falls back to its line glyph, so a new
 * row can never render blank.
 */
export const GLASS_FOR: Partial<Record<UiIconName, BrandIconObject>> = {
  home: "home-ring",
  search: "search-ring",
  feed: "people-ring",
  bed: "hotel-bed",
  "calendar-booking": "calendar-check",
  "chat-bubble": "chat-duo",
  bell: "bell-badge",
  heart: "heart-home",
  document: "contract-sign",
  sparkle: "bot",
  "price-tag": "report-stats",
  /* Payments and earnings histories: a receipt, the record of money that moved. */
  history: "receipt-check",
  "building-apartment": "apartment-block",
  "shield-stop": "shield-lock",
  plus: "person-card",
  ticket: "support-chat",
  /* Settings is absent on purpose: its mark is the line glyph, in brand blue (the founder, 25 September 2026). */
};
