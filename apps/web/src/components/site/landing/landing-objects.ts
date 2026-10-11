import type { Icon3DName } from "@/components/ui/icon-3d";
import type { FieldObject } from "./ObjectField";

/**
 * WHICH OF THE FOUNDER'S 3D OBJECTS STANDS FOR WHAT ON THE LANDING (30
 * September: "this 3d icons should be used in landing page to clean up those
 * ones"). One object per card or tile, never the same object twice in one
 * room, and one size per room (`LANDING_OBJECT_SIZE`), so a row of cards
 * reads as a set. Controls, chips and the example screens inside the
 * hands-on deck keep the line icons: they are the product's own rows.
 *
 * The receipt carries a dollar coin, so it is not used on the landing, where
 * every figure is in naira.
 */

/** The drawn size, in CSS pixels, per room. */
export const LANDING_OBJECT_SIZE = {
  journey: 56,
  bento: 64,
  category: 40,
  truths: 40,
  app: 36,
  check: 48,
  avatar: 32,
  os: 72,
  tile: 40,
} as const;

/** Find, Inspect, Agree, Move in. */
export const JOURNEY_OBJECTS: readonly Icon3DName[] = ["search", "calendar-booked", "contract", "keys"];

/** The bento's doors, by card key. */
export const BENTO_OBJECTS = {
  rent: "rent",
  stays: "shortlet",
  ai: "assistant",
  price: "analytics",
  messages: "envelope",
  agree: "shield",
  feed: "local-talks",
} as const satisfies Record<string, Icon3DName>;

/** The platform band's six layers, one object each, shown above the
    layer's name (7 October: the founder's art across the landing). */
export const OS_OBJECTS = {
  trust: "id-check",
  discover: "search",
  intelligence: "assistant",
  transactions: "card-secure",
  operations: "calendar-booked",
  ecosystem: "city",
} as const satisfies Record<string, Icon3DName>;

/** The eight kinds of place, by tile key. */
export const CATEGORY_OBJECTS = {
  apartment: "apartment",
  home: "home-small",
  shortlet: "shortlet",
  hotel: "hotel",
  resort: "villa",
  guest_house: "stay-rated",
  office: "city",
  land: "land",
} as const satisfies Record<string, Icon3DName>;

/** The assistant's three rules: real listings, the whole cost, no title
    opinions (a land title is the one it refuses to judge). */
export const TRUTH_OBJECTS: readonly Icon3DName[] = ["search", "price-tag", "land"];

/** On your phone: notifications, both sides, the record. */
export const APP_OBJECTS = {
  notify: "bell",
  sides: "city",
  record: "folder",
} as const satisfies Record<string, Icon3DName>;

/**
 * The hero's field: the headline's three words (rent, buy, stay) and the
 * map pin of "Find a place". Two show on a phone (the slots beside the
 * action), all four from 48rem, around the headline.
 */
export const HERO_OBJECTS: readonly FieldObject[] = [
  { name: "rent", slot: "a", size: 112, depth: 1.2 },
  { name: "shortlet", slot: "b", size: 120, depth: 1.4 },
  { name: "buy", slot: "c", size: 96, depth: 0.8 },
  { name: "map", slot: "d", size: 88, depth: 0.7 },
];

/** The closing card's field: the keys, the house and the record it keeps. */
export const CLOSE_OBJECTS: readonly FieldObject[] = [
  { name: "keys", slot: "a", size: 96, depth: 1.2 },
  { name: "villa", slot: "b", size: 88, depth: 0.9 },
  { name: "folder", slot: "c", size: 80, depth: 0.7 },
];
