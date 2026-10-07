import type { Icon3DName } from "@/components/ui/icon-3d";
import type { BrandIconObject } from "./BrandIcon";
import type { TieredObjectName } from "./object-assets";

/**
 * NO GLASS ANYWHERE (the founder, 7 October 2026, from phone screenshots of
 * production): "Remove all glass icons on the entire platform." He named the
 * Get started page, the side nav, the flip card and the Neighbour badge ("it's
 * all glass"), and he held up the Profile screen's Belongings rows as the
 * look: a solid blue calendar, a solid blue book, a solid blue scroll, a blue
 * suitcase. Solid, opaque blue 3D renders, not translucent glass.
 *
 * So every glass name now draws a SOLID object, and this table says which.
 * Two solid sets exist and both are opaque royal blue with an orange accent:
 *
 *   tiered   `public/brand/tier-b` (matte symbols, the Belongings look) and
 *            `public/brand/tier-a` (real buildings and land), see
 *            `object-assets.ts`
 *   3d       `public/brand/3d`, the founder's own 3D sheet (`Icon3D`), used
 *            where it says the meaning better: a calendar with a tick, a
 *            hand holding naira, a verified seal, a hotel with stars
 *
 * Every entry is chosen for what the glass object MEANT on the screens that
 * use it, not for what it depicted, the same rule `glass-to-line.ts` follows.
 * Where a glass name and a tiered object share a name (`camera`, `land-plot`)
 * the tiered render is the answer. The glass PNGs stay on disk (commissioned
 * artwork; deleting it is the founder's call) but nothing draws them, and
 * `no-glass-at-runtime.test.ts` fails the build if anything starts to.
 */
export type SolidArt = { set: "tiered"; name: TieredObjectName } | { set: "3d"; name: Icon3DName };

const t = (name: TieredObjectName): SolidArt => ({ set: "tiered", name });
const d = (name: Icon3DName): SolidArt => ({ set: "3d", name });

export const GLASS_TO_SOLID = {
  "alert-triangle": t("warning-triangle"),
  "apartment-block": t("apartment-block"),
  "bank-column": d("bank"),
  "beach-house": t("stilt-beach-house"),
  "bed-ring": d("stay-rated"),
  /* The 3D bell carries the orange badge dot the glass one had. */
  "bell-badge": d("bell"),
  "bell-tile": t("bell"),
  "bill-tile": t("clipboard-list"),
  "booking-instant": t("calendar-bolt"),
  "bookmark-ribbon": t("book-bookmark"),
  bot: t("robot"),
  "brain-chip": t("brain-chip"),
  "brain-ring": t("brain-chip"),
  "building-chip": t("apartment-block"),
  bungalow: t("bungalow"),
  "calendar-check": d("calendar-booked"),
  "calendar-clock": d("calendar-pending"),
  "calendar-grid": t("calendar-page"),
  "calendar-home": t("calendar-page"),
  "calendar-ring": t("calendar-page"),
  "calendar-time": d("calendar-pending"),
  camera: t("camera"),
  "card-lock": d("card-secure"),
  "card-tile": t("cards-stack"),
  "chart-growth": d("analytics"),
  "chart-ring": t("donut-chart"),
  "chat-duo": t("chat-pair"),
  "chat-ring": t("chat-pair"),
  "city-ring": d("city"),
  "clock-check": d("clock"),
  "clock-expired": t("hourglass"),
  "cluster-home": t("terrace-row"),
  /* Money, not a token: the notes, never a casino coin. */
  "coin-naira": t("banknotes-stack"),
  "concierge-bell": d("hotel"),
  "container-home": t("small-house"),
  "contract-sign": d("contract"),
  "coworking-space": t("office-tower"),
  "doc-cross": t("warning-triangle"),
  "doc-home": d("contract"),
  "doc-lock": t("padlock"),
  "doc-review": t("doc-search"),
  "doc-shield": t("shield-tick"),
  duplex: t("townhouse-twin"),
  "farm-house": t("farm-house"),
  /* The crypto option: the same 3D coin its success screen draws. */
  "flip-coin": d("coin"),
  gift: t("gift-box"),
  "gift-star": d("gift"),
  globe: t("globe"),
  "globe-chip": t("globe"),
  "globe-pin": t("globe-pin"),
  "guest-house": t("small-house"),
  headset: t("headset"),
  "heart-home": t("house-heart"),
  "home-check": d("home-verified"),
  "home-lock": t("padlock"),
  "home-ring": d("home-small"),
  /* The Neighbour badge: looking around a place, a pin under a lens. */
  "home-search": t("search-pin"),
  hotel: d("hotel"),
  "hotel-bed": d("stay-rated"),
  "hotel-room": d("stay-rated"),
  "hotel-star": d("hotel"),
  hourglass: t("hourglass"),
  "house-boat": t("house-boat"),
  "id-card-check": d("id-check"),
  info: t("info-disc"),
  "inspect-ring": d("checklist"),
  "key-cycle": t("key-ring"),
  "key-ring": t("key-ring"),
  "keys-handover": d("handover"),
  "keys-home": d("rent"),
  "keys-tag": d("keys"),
  "lake-house": t("lake-house"),
  "land-plot": t("land-plot"),
  "ledger-book": t("book-bookmark"),
  "listing-search": t("doc-search"),
  loft: t("brick-hall"),
  "luggage-check": t("suitcase"),
  "luggage-plane": t("suitcase"),
  "manage-ring": d("toolbox"),
  mansion: t("mansion-columns"),
  "map-route": d("map"),
  "map-spot": t("map-pin"),
  "mini-flat": t("small-house"),
  "modern-house": t("modern-house-glass"),
  "mountain-cabin": t("mountain-cabin"),
  "naira-coins": t("banknotes-stack"),
  "naira-hand": d("earnings"),
  "office-space": t("office-tower"),
  /* Appearance: an empty frame to put your own look in. */
  palette: t("frame-empty"),
  "palm-tree": t("palm-island"),
  "payment-failed": t("warning-triangle"),
  "payment-received": d("earnings"),
  "payment-sent": t("wallet-out"),
  penthouse: t("penthouse-terrace"),
  "people-ring": t("people-group"),
  "person-card": d("id-check"),
  "phone-tile": d("phone-code"),
  "pin-map": t("map-pin"),
  "progress-ring": t("progress-ring"),
  "receipt-check": t("clipboard-list"),
  "report-stats": t("bars-chart"),
  reviews: t("stars-arc"),
  "role-switch-tile": t("sync-arrows"),
  "savings-pot": t("safe-dial"),
  "seal-check": d("verified"),
  "seal-cross": t("warning-triangle"),
  "seal-pending": t("hourglass"),
  "search-home": t("search-pin"),
  "search-ring": d("search"),
  "send-plane-tile": t("paper-plane"),
  "serviced-apartment": t("midrise-block"),
  "serviced-block": t("serviced-block"),
  "shared-apartment": t("apartment-block"),
  "shield-check": t("shield-tick"),
  "shield-check-tile": t("shield-tick"),
  "shield-home": d("home-verified"),
  "shield-lock": t("padlock"),
  "shield-ring": t("shield-tick"),
  "shop-retail": t("retail-shop"),
  shortlet: d("shortlet"),
  /* The same drawing: a lit hotel under palms. */
  "stays-hotel-palms": t("scene-hotel-bell"),
  "studio-apartment": d("home-small"),
  "support-chat": t("headset"),
  "support-shield": d("support"),
  "tag-hash": t("ticket"),
  "tag-percent": d("price-tag"),
  "terrace-house": t("terrace-row"),
  "tour-360": d("video"),
  townhouse: t("narrow-block"),
  "transfer-arrow": t("sync-arrows"),
  "tree-house": t("tree-house"),
  "twin-house": t("townhouse-twin"),
  "user-check": d("id-check"),
  "user-verified": d("id-check"),
  villa: t("villa-pool"),
  wallet: t("wallet-angled"),
  "wallet-chip": t("wallet-folded"),
  "wallet-naira": t("wallet-card"),
  "wallet-out": t("wallet-out"),
  "wallet-plus": t("wallet-plus"),
  "wallet-ring": t("wallet-folded"),
  "wallet-secure": d("pay"),
  "wallet-tile": t("wallet-folded"),
  warehouse: t("warehouse"),
} as const satisfies Record<BrandIconObject, SolidArt>;
