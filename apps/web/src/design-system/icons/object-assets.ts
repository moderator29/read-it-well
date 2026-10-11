import { icon3dSrc } from "@/components/ui/icon-3d";
import { GLASS_TO_SOLID } from "./glass-to-solid";

/**
 * THE TWO-TIER OBJECTS (D29, 6 October 2026): the accepted matte and realistic
 * objects, by their own names.
 *
 * NO NAME DRAWS GLASS (the founder, 7 October 2026: "Remove all glass icons on
 * the entire platform"). A name that is a tiered object draws it; every glass
 * name draws the solid object `glass-to-solid.ts` chose for its meaning, from
 * this table or from the founder's 3D sheet in `public/brand/3d`. The glass
 * PNGs stay on disk and nothing references them.
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
 * The tiered asset a name names by its own file stem, or undefined. A glass
 * name is resolved by `brandArtwork` through `GLASS_TO_SOLID`, not here.
 */
export function tieredAssetFor(name: string): ObjectAsset | undefined {
  return isTieredObject(name) ? TIERED_OBJECTS[name] : undefined;
}

/** The @2x file, which `next/image` resizes for the drawn size. */
export function tieredSrc(asset: ObjectAsset): string {
  return `/brand/tier-${asset.tier}/${asset.file}@2x.webp`;
}

/**
 * `matte` is tier B, `real` is tier A, `solid` is the founder's 3D sheet
 * (`public/brand/3d`). There is no `glass`: nothing draws it any more.
 */
export type BrandArtwork = { src: string; material: "matte" | "real" | "solid"; object: string };

function tieredArtwork(name: TieredObjectName): BrandArtwork {
  const asset = TIERED_OBJECTS[name];
  return { src: tieredSrc(asset), material: asset.tier === "b" ? "matte" : "real", object: name };
}

/**
 * The accepted tiered render a name names by its own stem, or undefined.
 * Since 7 October 2026 every `BrandIcon` draws a render or a solid object by
 * default, so this is only a lookup for a call site that wants to know.
 */
export function renderArtwork(name: string): BrandArtwork | undefined {
  return isTieredObject(name) ? tieredArtwork(name) : undefined;
}

export type SolidName = keyof typeof GLASS_TO_SOLID;

/** True when a glass name has a solid object chosen for it. */
export function hasSolidArtwork(object: string): object is SolidName {
  return Object.prototype.hasOwnProperty.call(GLASS_TO_SOLID, object);
}

/**
 * The solid file a glass name draws, for the few places that set an image
 * path directly rather than through `BrandIcon` (the leaderboard's board
 * object, the directory's empty state, the setup paths' tiles).
 */
export function solidSrc(object: SolidName): string {
  const art = GLASS_TO_SOLID[object];
  return art.set === "3d" ? icon3dSrc(art.name) : tieredSrc(TIERED_OBJECTS[art.name]);
}

/**
 * What a `BrandIcon` name draws. `name` is what the call site passed and
 * `object` is that name with its legacy alias resolved.
 *
 * NOTHING HERE RETURNS GLASS. A name that is itself a tiered object draws it
 * (`padlock`, `prepaid-meter`, `camera`, `land-plot`); a glass name draws the
 * solid object `GLASS_TO_SOLID` chose for its meaning. A name in neither is
 * ruled out by the types; at runtime it draws the shield, the platform's
 * neutral mark, rather than a broken image.
 */
export function brandArtwork(name: string, object: string): BrandArtwork {
  if (isTieredObject(name)) return tieredArtwork(name);
  if (isTieredObject(object)) return tieredArtwork(object);
  const solid = GLASS_TO_SOLID[hasSolidArtwork(object) ? object : "shield-check"];
  if (solid.set === "3d") return { src: icon3dSrc(solid.name), material: "solid", object };
  return { ...tieredArtwork(solid.name), object };
}
