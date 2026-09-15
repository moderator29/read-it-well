import type { Dictionary } from "@vallo/i18n";
import type { Listing, PowerBackup, PowerGrid } from "@/lib/listings/types";

/**
 * What a property card says, decided away from how it looks.
 *
 * Two functions, both pure, both tested. They exist apart from `ListingCard`
 * because the decisions in them are product decisions - which facts are worth a
 * scrolling grid, in what order, and what an unanswered question renders as -
 * and those are the things that quietly rot inside a 300 line component.
 */

/** One secondary fact. `numeric` gets tabular figures so columns line up. */
export type CardFact = { key: string; label: string; numeric?: boolean };

/**
 * The market noun, as a reader would say it rather than as the enum spells it.
 *
 * `rental`, `shop`, `office` and `land` are the long-let and sale markets, and
 * calling a plot of land an "apartment type" would be worse than saying
 * nothing. Kept short because this sits in a row of four facts at 12px.
 */
const KIND_NOUN: Record<Listing["kind"], string> = {
  hotel: "Hotel",
  apartment: "Apartment",
  home: "House",
  shortlet: "Shortlet",
  villa: "Villa",
  restaurant: "Restaurant",
  experience: "Experience",
  rental: "To rent",
  shop: "Shop",
  office: "Office",
  land: "Land",
};

/**
 * The secondary row: beds, baths, size, type, availability.
 *
 * THE ORDER IS FIXED and does not depend on which facts a listing happens to
 * have. A grid where one card reads "2 bed · Apartment" and the next reads
 * "Apartment · 3 bed" forces the eye to re-parse every card instead of reading
 * down a column, and that cost is invisible in a screenshot of one card.
 *
 * A ZERO IS NOT A FACT. `bedrooms: 0` on a restaurant means the question does
 * not apply, and "0 bed" is both meaningless and slightly alarming. Absent
 * facts are simply absent; the row shrinks.
 *
 * The row is capped at four. A fifth fact at this size stops being scanned and
 * starts being noise, and the detail page has room for all of them.
 */
export function cardFacts(listing: Listing, t: Dictionary): CardFact[] {
  const facts: CardFact[] = [];

  if (listing.bedrooms > 0) {
    facts.push({
      key: "beds",
      numeric: true,
      label: `${listing.bedrooms} ${listing.bedrooms === 1 ? t.common.bed : t.common.beds}`,
    });
  }

  if (listing.bathrooms > 0) {
    facts.push({
      key: "baths",
      numeric: true,
      label: `${listing.bathrooms} ${listing.bathrooms === 1 ? t.common.bath : t.common.baths}`,
    });
  }

  facts.push({ key: "kind", label: KIND_NOUN[listing.kind] });

  /*
   * AVAILABILITY, and only when it is the useful answer.
   *
   * "Instant" used to be a third badge over the photograph, in brand colour,
   * competing with the verified mark. It is a fact about how booking works, not
   * a trust signal, so it belongs in this row at this weight - and only on the
   * markets where reserving instantly is even possible. A rental is arranged
   * with the agent and inspected before any money moves, so an "instant" mark
   * on one would be a promise the product refuses to keep.
   */
  const reservable = listing.pricePeriod !== "year";
  if (listing.instantBook && reservable) {
    facts.push({ key: "instant", label: t.common.instantBook });
  }

  return facts.slice(0, 4);
}

/* ------------------------------------------------------------------ power */

/** Short enough for a chip. The detail page carries the full sentence. */
const GRID_SHORT: Record<PowerGrid, string> = {
  BAND_A: "Band A",
  MOSTLY_ON: "Light most of the day",
  PATCHY: "Patchy light",
  RARELY: "Little grid light",
  NONE: "No grid supply",
};

const BACKUP_SHORT: Record<PowerBackup, string> = {
  NONE: "",
  GENERATOR: "generator",
  INVERTER: "inverter",
  SOLAR: "solar",
  GENERATOR_INVERTER: "generator and inverter",
};

/**
 * The power line, or nothing.
 *
 * WHY POWER AND NOT WATER, PREPAID METERING OR ESTATE ACCESS. All five are in
 * the schema and no competitor carries any of them, so the temptation is to
 * show all five and win on information. That is how the old card ended up with
 * eleven things on it. For a year-long tenancy power is the question that
 * decides whether a flat is livable at all - a place at ₦4m with no light is
 * not cheaper than one at ₦4.5m on Band A - and the others are things somebody
 * checks once they are already interested. They stay on the detail page.
 *
 * BAND AND BACKUP COMPOSE INTO ONE PHRASE because they are one question with
 * two halves. "Band A" alone leaves open what happens during an outage;
 * "generator" alone leaves open how often it is needed. Two separate chips
 * would read as two unrelated facts and take twice the width.
 *
 * SILENCE RENDERS AS NOTHING. A host who has not answered has not promised
 * anything, and a card has no room for the sentence explaining that. Returning
 * null is the honest option; the detail page states the absence in words.
 */
export function cardUtility(listing: Listing): string | null {
  const utilities = listing.utilities;
  if (!utilities) return null;

  const band = utilities.powerGrid ? GRID_SHORT[utilities.powerGrid] : "";
  const backup = utilities.powerBackup ? BACKUP_SHORT[utilities.powerBackup] : "";

  if (band && backup) return `${band}, ${backup}`;
  if (band) return band;
  /* Backup with no stated band is still worth saying: it is the half of the
     answer that survives an outage, which is the half people ask about. */
  if (backup) return `Backup ${backup}`;
  return null;
}
