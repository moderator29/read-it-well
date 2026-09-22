import type { PriceCheckSubject, RentPeriod } from "./types";

/**
 * THE ADDRESS ENTRY LADDER, AND WHY IT IS NOT A TEXT FIELD.
 *
 * ---------------------------------------------------------------------------
 * TWO FACTS DECIDE THIS ENTIRE INTERACTION.
 *
 * THERE IS NO GEOCODER IN THIS TREE. `lib/maps/tiles.ts` is a tile licensing
 * module and it is the whole of `lib/maps`. A geocoder for Nigeria is a
 * licensing decision, a cost and a dependency, and it would be wrong more
 * often than a person dragging a pin.
 *
 * AND MANY NIGERIAN PROPERTIES HAVE NO FORMAL ADDRESS AT ALL. A field
 * demanding one refuses those people, and a parser guessing at one invents a
 * building.
 *
 * So the flow is a LADDER from coarse to fine, every rung is answerable, no
 * rung is a required text field, and it may be stopped at any rung. Stopping
 * early is not a failure: it produces an area report, which is what stage one
 * actually is.
 *
 *   1  State           37 rows, already read by sign-up.
 *   2  Local government  fetched lazily, because 774 rows is not a phone payload.
 *   3  Area            typeahead over the strings we already hold, free text accepted.
 *   4  THE PIN         a map, draggable, and the rung that actually matters.
 *   5  Free text       "anything else that helps", STORED NOWHERE AND PARSED NEVER.
 *
 * ---------------------------------------------------------------------------
 * RUNG FOUR IS THE ONE THAT MATTERS AND IT IS A MAP.
 *
 * A pin is more accurate than any Nigerian street address, it needs no parser,
 * it needs no normaliser, and it is the exact input `ST_DWithin` wants. One
 * line of copy goes with it and it is not decoration: "Drag the pin to the
 * building. We only use this to find nearby properties." A person dropping a
 * pin on their own home is entitled to know what happens to it, and what
 * happens to it is that it finds neighbours and is then thrown away: the
 * analytics row holds a five kilometre cell and the watch row holds three
 * decimal places.
 *
 * ---------------------------------------------------------------------------
 * RUNG FIVE IS NEVER PARSED, AND THAT IS ENFORCED BY ABSENCE.
 *
 * No table in this feature has a column for it. `price_check_events` has none,
 * `price_check_watches` has none, `price_check_shares` has none. It lives in
 * the form's own state while the person is on the screen and goes nowhere.
 * Section 4.2 of the research file is not a paragraph in a policy; it is a
 * column list, and this is the column that is not in it.
 */

/** How far the ladder has been climbed. The report is drawn from whatever we have. */
export type LadderRung = "state" | "lga" | "area" | "pin" | "hint";

export const LADDER: readonly LadderRung[] = ["state", "lga", "area", "pin", "hint"];

/**
 * Nigeria's bounding box, used to keep a dragged pin inside the country and to
 * refuse a coordinate that arrived from somewhere else.
 *
 * Roughly 4.2 to 13.9 north and 2.6 to 14.7 east, widened by a tenth of a
 * degree on each side so a pin on the actual coastline or the actual border is
 * not refused for being where it is.
 */
export const NIGERIA_BOUNDS = {
  latMin: 4.1,
  latMax: 14.0,
  lngMin: 2.5,
  lngMax: 14.8,
} as const;

/** The middle of the country, for a map with nothing chosen yet. */
export const NIGERIA_CENTRE = { lat: 9.08, lng: 8.68 } as const;

export function withinNigeria(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= NIGERIA_BOUNDS.latMin &&
    lat <= NIGERIA_BOUNDS.latMax &&
    lng >= NIGERIA_BOUNDS.lngMin &&
    lng <= NIGERIA_BOUNDS.lngMax
  );
}

/**
 * THE POINT IS ROUNDED BEFORE IT LEAVES THE SCREEN, and three decimal places
 * is the privacy position rather than a tidy-up.
 *
 * Three decimals is a cell about 110 metres on a side at Nigerian latitudes,
 * so a point moves by at most about 79 metres, measured in `address.test.ts`
 * rather than asserted here. That is 10.5 per cent of the 750 metre first
 * rung: a comparable can move into or out of the set only if it sits within
 * about 79 metres of a rung boundary, which is a real and bounded cost rather
 * than none. The test says so in those words, because an earlier draft of it
 * claimed the cost was nothing and refused itself.
 *
 * What is bought with it is that the row we keep does not name a building.
 * `price_check_watches.lat` is `numeric(9,3)`, so the database enforces the
 * same coarseness on anything that reaches it by another route.
 */
export const STORED_POINT_DECIMALS = 3;

export function coarsenPoint(lat: number, lng: number): { lat: number; lng: number } {
  const factor = 10 ** STORED_POINT_DECIMALS;
  return {
    lat: Math.round(lat * factor) / factor,
    lng: Math.round(lng * factor) / factor,
  };
}

/** How far a rounded point can be from the original. Asserted in the test. */
export function coarseningErrorMetres(lat: number): number {
  const halfCell = 0.5 / 10 ** STORED_POINT_DECIMALS;
  const latMetres = halfCell * 111_320;
  const lngMetres = halfCell * 111_320 * Math.cos((lat * Math.PI) / 180);
  return Math.hypot(latMetres, lngMetres);
}

/** The furthest rung the subject has actually reached. */
export function reachedRung(subject: PriceCheckSubject): LadderRung | null {
  if (subject.hint !== null && subject.hint.trim().length > 0) return "hint";
  if (subject.lat !== null && subject.lng !== null) return "pin";
  if (subject.area !== null && subject.area.trim().length > 0) return "area";
  if (subject.lgaCode !== null && subject.lgaCode.trim().length > 0) return "lga";
  if (subject.stateCode.trim().length > 0) return "state";
  return null;
}

/**
 * Whether the ladder has been climbed far enough for a per property check.
 *
 * A pin, and nothing else. The state and the local government place an AREA
 * report; only a point places a property, and `no_location` is the refusal for
 * a subject that stopped short.
 */
export function canRunPerProperty(subject: PriceCheckSubject): boolean {
  return (
    subject.lat !== null &&
    subject.lng !== null &&
    withinNigeria(subject.lat, subject.lng)
  );
}

/** Whether there is enough to draw an area report at all. */
export function canRunAreaReport(subject: PriceCheckSubject): boolean {
  return subject.stateCode.trim().length > 0;
}

export const DEFAULT_RENT_PERIOD: RentPeriod = "year";

/**
 * A fresh subject, with nothing invented.
 *
 * Every optional fact is null rather than a default. `bedrooms: 0` would be a
 * claim that the property has none, which is what a shop or an office says,
 * and defaulting a house to it would put it in the wrong comparable set
 * silently. Null means nobody has been asked.
 */
export function emptySubject(stateCode = ""): PriceCheckSubject {
  return {
    lat: null,
    lng: null,
    stateCode,
    lgaCode: null,
    area: null,
    city: null,
    propertyType: "apartment",
    intent: "rent",
    rentPeriod: DEFAULT_RENT_PERIOD,
    bedrooms: null,
    bathrooms: null,
    sizeSqm: null,
    hint: null,
    fromListingId: null,
  };
}

/**
 * The subject line: "Three bedroom apartment, Lekki Phase 1, Lagos."
 *
 * Built from parts rather than a template so a locale can order them, and it
 * drops anything the person did not say rather than writing "undefined" or
 * guessing a city from a state.
 */
export function subjectPlaceParts(
  subject: PriceCheckSubject,
  stateName: string | null,
  lgaName: string | null,
): string[] {
  return [subject.area, subject.city, lgaName, stateName]
    .map((part) => part?.trim() ?? "")
    .filter((part) => part.length > 0)
    /* An area whose name repeats the local government reads as a stammer:
       "Lekki, Eti Osa, Lagos" is right and "Lekki, Lekki, Lagos" is not. */
    .filter((part, index, all) => all.findIndex((p) => p.toLowerCase() === part.toLowerCase()) === index);
}
