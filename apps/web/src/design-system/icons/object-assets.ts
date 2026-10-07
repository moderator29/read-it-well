/**
 * THE TWO-TIER ASSET MAP (D29, 6 October 2026): which glass object a call site
 * names, and which accepted replacement it now draws.
 *
 * WHY A MAP INSIDE THE ICON COMPONENT AND NOT A CALL-SITE MIGRATION.
 *
 * Sixty-four files import `BrandIcon` and pass it a glass name (`shield-check`,
 * `bell-badge`, `villa`). The cheapest correct migration is to leave those call
 * sites alone and change what the name resolves to, so a screen that said
 * `shield-check` yesterday draws the matte royal-blue shield today with no edit.
 * `BrandIcon` consults this table first and falls back to `public/brand/glass`
 * for every name that has no accepted replacement, which is most of the long tail
 * and is listed in the report that accompanies this change.
 *
 * THE TIER IS DECIDED BY WHAT THE OBJECT IS, NOT BY ITS SIZE.
 *
 *   tier B  symbols: simple, matte, deep royal blue, one orange accent at most,
 *           no gloss, no text. `public/brand/tier-b/`
 *   tier A  real things: buildings, land, Nigerian infrastructure. Rich and
 *           realistic. `public/brand/tier-a/`
 *
 * A name is in this table only if its replacement was ACCEPTED on the light-mode
 * check: viewed on #F4F4F1 at 390px as well as on #010118. A rejected or
 * withheld object is not listed here, and the table in
 * `docs/design/assets-raw/2026-10-06/slice-report.json` says why.
 *
 * The files are produced by `scripts/slice-tiered-sheets.mjs` from the founder's
 * sheets; do not edit them by hand. Every file is a transparent webp at 1x and
 * `@2x`, on a square canvas: 128 and 256 for tier B and for the tier A buildings
 * (their source is only 160 to 290px wide, so 256 is as large as is honest), 160
 * and 320 for the tier A infrastructure, and 384 and 768 for the two scenes.
 */

export type ObjectTier = "a" | "b";

export interface ObjectAsset {
  tier: ObjectTier;
  /** The file stem under `public/brand/tier-{a,b}/`. */
  file: string;
}

const b = (file: string): ObjectAsset => ({ tier: "b", file });
const a = (file: string): ObjectAsset => ({ tier: "a", file });

/**
 * Every accepted object by its own file stem. These are also valid names for
 * `BrandIcon`, so a new screen can ask for `prepaid-meter` or `padlock` directly.
 */
export const TIERED_OBJECTS = {
  /* Tier B: success and reward */
  "tick-circle": b("tick-circle"),
  trophy: b("trophy"),
  "gift-box": b("gift-box"),
  ticket: b("ticket"),
  "key-cushion": b("key-cushion"),
  rosette: b("rosette"),
  "burst-rays": b("burst-rays"),
  "flag-pole": b("flag-pole"),
  "cards-stack": b("cards-stack"),
  "cards-stack-orange": b("cards-stack-orange"),
  "cards-stack-navy": b("cards-stack-navy"),
  "book-closed": b("book-closed"),
  /* Tier B: actions and states */
  "search-pin": b("search-pin"),
  "paper-plane": b("paper-plane"),
  bell: b("bell"),
  "calendar-page": b("calendar-page"),
  "chat-pair": b("chat-pair"),
  "bars-chart": b("bars-chart"),
  "clipboard-list": b("clipboard-list"),
  "map-pin": b("map-pin"),
  camera: b("camera"),
  "house-heart": b("house-heart"),
  "warning-triangle": b("warning-triangle"),
  "info-disc": b("info-disc"),
  hourglass: b("hourglass"),
  "calendar-bolt": b("calendar-bolt"),
  "key-ring": b("key-ring"),
  "key-ring-top": b("key-ring-top"),
  /* Tier B: analytics, people, places */
  "line-chart": b("line-chart"),
  "donut-chart": b("donut-chart"),
  "progress-ring": b("progress-ring"),
  "stars-arc": b("stars-arc"),
  headset: b("headset"),
  robot: b("robot"),
  "brain-chip": b("brain-chip"),
  "people-group": b("people-group"),
  globe: b("globe"),
  "globe-pin": b("globe-pin"),
  "palm-island": b("palm-island"),
  suitcase: b("suitcase"),
  "refresh-arrows": b("refresh-arrows"),
  "doc-plus": b("doc-plus"),
  "doc-search": b("doc-search"),
  "seal-plus": b("seal-plus"),
  /* Tier B: money and trust (receipt-roll and bank-card are rejected, see the report) */
  "banknotes-stack": b("banknotes-stack"),
  "shield-tick": b("shield-tick"),
  "passport-book": b("passport-book"),
  padlock: b("padlock"),
  "safe-dial": b("safe-dial"),
  scales: b("scales"),
  "wallet-angled": b("wallet-angled"),
  "wallet-folded": b("wallet-folded"),
  "wallet-card": b("wallet-card"),
  "wallet-out": b("wallet-out"),
  "wallet-plus": b("wallet-plus"),
  "banknote-fold": b("banknote-fold"),
  "book-bookmark": b("book-bookmark"),
  "sync-arrows": b("sync-arrows"),
  /* Tier B: empty states */
  "box-open": b("box-open"),
  birdcage: b("birdcage"),
  lantern: b("lantern"),
  "shelf-hook": b("shelf-hook"),
  envelope: b("envelope"),
  "cards-fan": b("cards-fan"),
  "frame-empty": b("frame-empty"),
  "cup-saucer": b("cup-saucer"),
  "scroll-unrolled": b("scroll-unrolled"),
  "watering-can": b("watering-can"),
  basket: b("basket"),
  "door-open": b("door-open"),
  /* Tier A: Nigerian infrastructure */
  "prepaid-meter": a("prepaid-meter"),
  "water-tank": a("water-tank"),
  "inverter-battery": a("inverter-battery"),
  generator: a("generator"),
  "borehole-pump": a("borehole-pump"),
  "estate-gate": a("estate-gate"),
  "ceiling-fan": a("ceiling-fan"),
  "moving-box": a("moving-box"),
  /* Tier A: buildings and land (the six with lettering on a sign are rejected) */
  "apartment-block": a("apartment-block"),
  "family-house-gate": a("family-house-gate"),
  "modern-house-glass": a("modern-house-glass"),
  "office-tower": a("office-tower"),
  "retail-shop": a("retail-shop"),
  "land-plot": a("land-plot"),
  "villa-pool": a("villa-pool"),
  "estate-entrance-barrier": a("estate-entrance-barrier"),
  bungalow: a("bungalow"),
  "townhouse-twin": a("townhouse-twin"),
  "terrace-row": a("terrace-row"),
  "narrow-block": a("narrow-block"),
  "house-hip-roof": a("house-hip-roof"),
  "penthouse-terrace": a("penthouse-terrace"),
  "mansion-columns": a("mansion-columns"),
  "serviced-block": a("serviced-block"),
  "brick-hall": a("brick-hall"),
  "small-house": a("small-house"),
  "midrise-block": a("midrise-block"),
  "stilt-beach-house": a("stilt-beach-house"),
  "lake-house": a("lake-house"),
  "mountain-cabin": a("mountain-cabin"),
  "tree-house": a("tree-house"),
  "house-boat": a("house-boat"),
  "farm-house": a("farm-house"),
  warehouse: a("warehouse"),
  /* Tier A scenes: wide hero compositions, drawn at their own large canvas. */
  "scene-hotel-bell": a("scene/scene-hotel-bell"),
  "scene-house-keys": a("scene/scene-house-keys"),
} as const satisfies Record<string, ObjectAsset>;

export type TieredObjectName = keyof typeof TIERED_OBJECTS;

/**
 * Glass names that now draw an accepted replacement. The key is the glass name a
 * call site already passes; the value is the replacement's file stem.
 *
 * Only a CLEAR match is listed. `receipt-check` has no replacement (the receipt
 * was rejected), `card-lock` has none (the card was rejected), and a glass name
 * that means something the new set does not draw (`calendar-check`,
 * `shield-lock`, `naira-hand`) stays on its glass artwork rather than being
 * handed a near miss. A near miss is worse than a consistent old drawing,
 * because it changes what the screen says.
 */
export const GLASS_TO_TIERED: Readonly<Record<string, TieredObjectName>> = {
  /* Tier B: symbols */
  "alert-triangle": "warning-triangle",
  "bell-badge": "bell",
  "booking-instant": "calendar-bolt",
  bot: "robot",
  "brain-chip": "brain-chip",
  camera: "camera",
  "calendar-grid": "calendar-page",
  "chart-growth": "bars-chart",
  "chart-ring": "donut-chart",
  "chat-duo": "chat-pair",
  "doc-review": "doc-search",
  gift: "gift-box",
  globe: "globe",
  "globe-pin": "globe-pin",
  headset: "headset",
  "support-chat": "headset",
  "heart-home": "house-heart",
  hourglass: "hourglass",
  info: "info-disc",
  "key-ring": "key-ring",
  "ledger-book": "book-bookmark",
  "luggage-check": "suitcase",
  "luggage-plane": "suitcase",
  "map-spot": "map-pin",
  "pin-map": "map-pin",
  "naira-coins": "banknotes-stack",
  "palm-tree": "palm-island",
  "people-ring": "people-group",
  "progress-ring": "progress-ring",
  "report-stats": "bars-chart",
  reviews: "stars-arc",
  "shield-check": "shield-tick",
  wallet: "wallet-angled",
  "wallet-out": "wallet-out",
  "wallet-plus": "wallet-plus",
  /* Tier A: places and things */
  "apartment-block": "apartment-block",
  "serviced-block": "serviced-block",
  "serviced-apartment": "midrise-block",
  bungalow: "bungalow",
  duplex: "townhouse-twin",
  "twin-house": "townhouse-twin",
  townhouse: "narrow-block",
  "terrace-house": "terrace-row",
  villa: "villa-pool",
  mansion: "mansion-columns",
  penthouse: "penthouse-terrace",
  "modern-house": "modern-house-glass",
  "guest-house": "small-house",
  "mini-flat": "small-house",
  "beach-house": "stilt-beach-house",
  "lake-house": "lake-house",
  "mountain-cabin": "mountain-cabin",
  "tree-house": "tree-house",
  "house-boat": "house-boat",
  "farm-house": "farm-house",
  warehouse: "warehouse",
  "office-space": "office-tower",
  "shop-retail": "retail-shop",
  "land-plot": "land-plot",
  loft: "brick-hall",
};

/** True when a name is one of the accepted new objects (as opposed to a glass name). */
export function isTieredObject(name: string): name is TieredObjectName {
  return Object.prototype.hasOwnProperty.call(TIERED_OBJECTS, name);
}

/**
 * The asset a name resolves to, or undefined when it has no accepted
 * replacement and the glass artwork stays. A name that is itself a new object
 * wins over the glass mapping, so `bell` means the matte bell.
 */
export function tieredAssetFor(name: string): ObjectAsset | undefined {
  if (isTieredObject(name)) return TIERED_OBJECTS[name];
  const mapped = GLASS_TO_TIERED[name];
  return mapped ? TIERED_OBJECTS[mapped] : undefined;
}

/** The @2x file, which `next/image` resizes for the drawn size. */
export function tieredSrc(asset: ObjectAsset): string {
  return `/brand/tier-${asset.tier}/${asset.file}@2x.webp`;
}
