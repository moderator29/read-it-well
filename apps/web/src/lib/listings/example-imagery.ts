import type { Listing } from "./types";
import { isTenancyPeriod } from "./pricing";

/**
 * WHICH PICTURE AN EXAMPLE LISTING MAY WEAR, decided by what it is.
 *
 * THE PROBLEM. The 64 example listings were given photographs from
 * `public/brand/photos/`, and every one of those is an aspirational render:
 * a marble bathroom over a lit skyline, a villa with a pool at sunset. So "Mini
 * flat in Yaba" showed a gated villa, and "Self contained in Akoka" a pool
 * terrace. An example exists to teach a stranger what a Vallo listing looks
 * like, and these taught the eye to expect a lit villa where a real agent's
 * phone photograph of a real mini flat will show a tiled room with a ceiling
 * fan. Every real listing would then look like a disappointment next to them.
 *
 * THE RULE. A MODEST EXAMPLE is a tenancy (rent by the month, quarter or year)
 * of a kind people actually live or trade in on the mainland: a rental, an
 * apartment, a house of up to three bedrooms, a shop, an office. A villa, a
 * house of four or more bedrooms, a sale, a stay, a table and land keep what
 * they had: an aspirational picture of an aspirational property is not the
 * mismatch, and land already draws its own truth.
 *
 * A modest example wears only honest imagery: the SLOTS below, each a plain,
 * named photograph of the ordinary thing ("a single room with a bed and a
 * window, tiled floor, daylight"). Until a slot's file is in the repository it
 * wears NOTHING, and the frame draws its kind (`MediaFrame` with `drawn`), with
 * the card's "No photographs yet" beside it. A drawing of a bungalow is honest;
 * a render of a villa standing in for one is not.
 *
 * THE PHOTOGRAPHS DO NOT EXIST YET, AND THAT IS A FOUNDER ITEM, NOT A GAP IN
 * THE CODE. This environment cannot download images, and nothing may be used
 * that the company does not have the right to use. `EXAMPLE_SLOT_BRIEF` is the
 * shopping list: what each photograph must show and must not. To land one,
 * save it as `apps/web/public/brand/examples/<slot>.jpg` and add the slot to
 * `EXAMPLE_PHOTOGRAPHS_PRESENT`; `example-imagery.test.ts` fails if a listed
 * file is missing, so a named photograph can never ship as a broken image.
 */

/** The honest photographs an example may wear, by what they show. */
export type ExampleSlot =
  | "room-single"
  | "living-modest"
  | "kitchen-modest"
  | "bathroom-modest"
  | "block-exterior"
  | "bungalow-exterior"
  | "terrace-exterior"
  | "duplex-exterior"
  | "shop-front"
  | "office-interior";

/** What each photograph must show, for whoever takes or licenses it. */
export const EXAMPLE_SLOT_BRIEF: Record<ExampleSlot, string> = {
  "room-single":
    "A single room with a bed, a window with burglary bars, painted walls and a tiled floor, in daylight. No city view.",
  "living-modest":
    "A small living room in a mainland block: a plain sofa, a ceiling fan, a tiled floor, a window, daylight. No skyline.",
  "kitchen-modest":
    "A small kitchen: a gas cooker, a sink, wall tiles, a window. Clean and ordinary.",
  "bathroom-modest":
    "A small bathroom: a shower, a WC and a basin, plain tiles. No bathtub, no marble.",
  "block-exterior":
    "A three or four storey block of flats with balconies, a compound wall and a gate, in daylight.",
  "bungalow-exterior":
    "A painted bungalow in a walled compound, seen from the gate, in daylight.",
  "terrace-exterior":
    "A row of two storey terrace houses sharing a compound, in daylight.",
  "duplex-exterior":
    "A semi-detached duplex behind a compound gate, in daylight. No pool, no floodlights.",
  "shop-front":
    "A lock-up shop on a busy road, shutters open, from across the street. No brand names legible.",
  "office-interior":
    "An open-plan office floor with desks, a window and a split-unit air conditioner, in daylight.",
};

/**
 * The slots whose photograph is in `public/brand/examples/` today. EMPTY, and
 * honestly so: see the note above. Add a slot here in the same commit as its
 * file; the test checks the file is there.
 */
export const EXAMPLE_PHOTOGRAPHS_PRESENT: readonly ExampleSlot[] = [];

/** Where a slot's photograph is served from. */
export function exampleSlotPath(slot: ExampleSlot): string {
  return `/brand/examples/${slot}.jpg`;
}

type Shape = Pick<Listing, "kind" | "bedrooms" | "intent" | "pricePeriod" | "isDemo">;

/** True for an example whose aspirational photographs misrepresent it. */
export function isModestExample(listing: Shape): boolean {
  if (!listing.isDemo) return false;
  if (listing.intent === "sale") return false;
  if (!isTenancyPeriod(listing.pricePeriod)) return false;
  switch (listing.kind) {
    case "rental":
    case "apartment":
    case "shop":
    case "office":
      return true;
    case "home":
      return listing.bedrooms <= 3;
    default:
      return false;
  }
}

/** The slots a modest example should wear, in gallery order. */
export function exampleSlotsFor(listing: Shape): ExampleSlot[] {
  if (!isModestExample(listing)) return [];
  switch (listing.kind) {
    case "shop":
      return ["shop-front"];
    case "office":
      return ["office-interior", "block-exterior"];
    case "home":
      return [
        listing.bedrooms <= 2 ? "bungalow-exterior" : "duplex-exterior",
        "living-modest",
        "room-single",
        "kitchen-modest",
      ];
    default:
      /* A rental or an apartment: a self contained or a mini flat is one room
         and its bathroom; a larger flat is a block with a living room. */
      return listing.bedrooms <= 1
        ? ["room-single", "bathroom-modest", "block-exterior"]
        : ["block-exterior", "living-modest", "room-single", "kitchen-modest", "bathroom-modest"];
  }
}

/**
 * The photographs an example actually shows, replacing whatever the row
 * carries. For anything that is not a modest example, the row's own photos,
 * untouched. For a modest example, the slots that exist on disk.
 *
 * FOUNDER'S DECISION, 24 September 2026: until the honest slot photographs
 * exist, a modest example keeps its original photos rather than showing an
 * empty "No photographs yet" card. They are labelled examples, and a blank
 * card in front of every visitor was worse. The slot idea above stands for
 * when the files arrive; nothing here waits on them.
 */
export function honestExamplePhotos(
  listing: Shape,
  rowPhotos: string[],
  present: readonly ExampleSlot[] = EXAMPLE_PHOTOGRAPHS_PRESENT,
): string[] {
  if (!isModestExample(listing)) return rowPhotos;
  const honest = exampleSlotsFor(listing)
    .filter((slot) => present.includes(slot))
    .map(exampleSlotPath);
  return honest.length > 0 ? honest : rowPhotos;
}
