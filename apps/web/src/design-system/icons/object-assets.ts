/**
 * THE TWO-TIER OBJECTS (D29, 6 October 2026): the accepted matte and realistic
 * objects, by their own names.
 *
 * THE GLASS ORIGINALS WIN. For a few days a glass-to-tiered map redirected
 * some 60 glass names (`shield-check`, `bell-badge`, `villa`) onto these
 * objects with no call-site edit. The founder asked for the original icons
 * back, so that map is gone: every glass name draws its own
 * `public/brand/glass` file again, and a tiered object is drawn only where a
 * call site names it directly and the glass pack has no such name
 * (`padlock`, `prepaid-meter`, `burst-rays`).
 *
 * THE TIER IS DECIDED BY WHAT THE OBJECT IS, NOT BY ITS SIZE.
 *
 *   tier B  symbols: simple, matte, deep royal blue, one orange accent at most,
 *           no gloss, no text. `public/brand/tier-b/`
 *   tier A  real things: buildings, land, Nigerian infrastructure. Rich and
 *           realistic. `public/brand/tier-a/`
 *
 * An object is in this table only if it was ACCEPTED on the light-mode
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

/** True when a name is one of the accepted new objects (as opposed to a glass name). */
export function isTieredObject(name: string): name is TieredObjectName {
  return Object.prototype.hasOwnProperty.call(TIERED_OBJECTS, name);
}

/**
 * The tiered asset a name names by its own file stem, or undefined. There is
 * no glass-to-tiered redirect any more (see the note at the top of this file):
 * `BrandIcon` draws the glass original for every glass name and asks this only
 * for a name the glass pack does not have.
 */
export function tieredAssetFor(name: string): ObjectAsset | undefined {
  return isTieredObject(name) ? TIERED_OBJECTS[name] : undefined;
}

/** The @2x file, which `next/image` resizes for the drawn size. */
export function tieredSrc(asset: ObjectAsset): string {
  return `/brand/tier-${asset.tier}/${asset.file}@2x.webp`;
}

/**
 * The accepted render for a name, when there is one, for a call site that
 * asks for renders explicitly (`BrandIcon`'s `preferRender`, 7 October 2026:
 * the founder asked for one style across the space types row). Undefined when
 * the name has no tiered render, so the caller falls back to the glass rule.
 */
export function renderArtwork(name: string): BrandArtwork | undefined {
  const tiered = tieredAssetFor(name);
  return tiered ? { src: tieredSrc(tiered), material: tiered.tier === "b" ? "matte" : "real", object: name } : undefined;
}

export type BrandArtwork = { src: string; material: "matte" | "real" | "glass"; object: string };

/**
 * What a `BrandIcon` name draws. `object` is the name with its legacy alias
 * resolved, and `isGlass` says whether `public/brand/glass` has that object.
 *
 * THE GLASS ORIGINAL ALWAYS WINS, including for the names both sets share
 * (`camera`, `headset`, `key-ring`, `land-plot`...): the founder asked for the
 * original icons back. A tiered object is drawn only for a name the glass pack
 * does not have, asked for by its own name (`padlock`, `prepaid-meter`).
 */
export function brandArtwork(name: string, object: string, isGlass: boolean): BrandArtwork {
  if (!isGlass) {
    const tiered = tieredAssetFor(name);
    if (tiered) return { src: tieredSrc(tiered), material: tiered.tier === "b" ? "matte" : "real", object: name };
  }
  return { src: `/brand/glass/${object}.png`, material: "glass", object };
}
