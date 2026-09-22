import type { Dictionary } from "@vallo/i18n";
import type { Listing, PowerBackup, PowerGrid } from "@/lib/listings/types";
import { PERIOD_SUFFIX_SHORT } from "@/lib/listings/pricing";

/**
 * What a property card says, decided away from how it looks.
 *
 * Four functions, all pure, all tested. They exist apart from `ListingCard`
 * because the decisions in them are product decisions - which facts are worth a
 * scrolling grid, in what order, what an unanswered question renders as, and
 * which of the three money stories on a row is the one to lead with - and those
 * are the things that quietly rot inside a 300 line component.
 */

/** One secondary fact. `numeric` gets tabular figures so columns line up. */
export type CardFact = { key: string; label: string; numeric?: boolean };

/* ------------------------------------------------------------------ price */

/**
 * The figure a card leads with, and what sits under it.
 *
 * WHY THIS IS A DECISION AND NOT A FIELD. `PRODUCT.md` section 5 states the
 * product rule in one sentence: "the card leads with the total move-in cost and
 * the rent is the secondary line", and the reason is the whole argument for
 * this platform. A Lagos tenancy advertised at 4.5m a year is routinely 7m at
 * the door once caution, agency, legal and agreement fees are counted, every
 * competitor leads with the 4.5m, and the column holding the 7m
 * (`total_move_in_cost_minor`) is a first-class indexed column on `listings`.
 * Before this function the card printed `priceMinor` and the string `moveIn`
 * appeared nowhere in it, so the one surface where the comparison actually
 * happens was the one surface that hid the answer.
 *
 * WHEN THE MOVE-IN TOTAL DOES NOT LEAD. Three cases, and all three are the
 * honest answer rather than a fallback:
 *
 *   A SALE has no move-in total and never will. The asking price is the figure
 *   and `moveInCostMinor` is not carried on a sale row at all.
 *
 *   A NIGHTLY OR PER-HEAD RATE is not a tenancy. Nobody pays agency and legal
 *   fees for two nights in a shortlet, and the period suffix is what the reader
 *   is comparing.
 *
 *   A TENANCY WHOSE LISTER NAMED NOTHING keeps the rent as its lead. 24 of the
 *   64 rows in the catalogue are in this state. Printing a zero or a guessed
 *   total would be worse than printing the rent, because a stated zero and an
 *   unstated fee are different promises.
 *
 * `approximate` carries `moveInCostStated === false` through to the surface, so
 * a total summed from the parts the lister happened to name is printed as a
 * floor ("from") rather than as a flat figure. `pricing.ts` computes that
 * distinction and says in as many words that the caller is told which of the
 * two it received; this is the caller honouring it.
 */
export type CardPrice =
  | {
      lead: "moveIn";
      /** The move-in total in kobo, as the lister stated or as the parts sum. */
      minor: number;
      /** True when the figure is a floor built from the named parts. */
      approximate: boolean;
      /** The rent beneath it, in kobo, with its own period suffix. */
      rentMinor: number;
      rentSuffix: string;
    }
  | { lead: "headline"; minor: number; suffix: string }
  /** No real figure anywhere on the row. The card says so in words. */
  | { lead: "none" };

export function cardPrice(listing: Listing): CardPrice {
  const headline = listing.priceMinor > 0;
  const period = listing.pricePeriod;
  const suffix = period ? PERIOD_SUFFIX_SHORT[period] : PERIOD_SUFFIX_SHORT.sale;

  /* A tenancy is the only thing that HAS a move-in total: `pricePeriod` of
     night or guest is occupancy priced by the stay, and a sale carries no
     period at all. Tested against the period rather than against `kind`,
     because `listing_intent` cannot distinguish four markets with two values
     and the period is the column that can. */
  const tenancy = period === "year" || period === "month" || period === "quarter";
  const moveIn = listing.moveInCostMinor ?? 0;

  if (listing.intent !== "sale" && tenancy && moveIn > 0) {
    return {
      lead: "moveIn",
      minor: moveIn,
      approximate: listing.moveInCostStated !== true,
      rentMinor: listing.priceMinor,
      rentSuffix: suffix,
    };
  }

  if (!headline) return { lead: "none" };
  return { lead: "headline", minor: listing.priceMinor, suffix };
}

/* ----------------------------------------------------------------- market */

/**
 * WHAT MARKET THIS IS. Four answers, and the card had none of them.
 *
 * A sale and a tenancy were indistinguishable on the grid. "₦520m" and
 * "₦2.8m/yr" sat side by side with nothing saying one was a purchase, because
 * `PERIOD_SUFFIX_SHORT.sale` is deliberately the empty string and the only
 * other statement of the market was inside the title, which the heading clamps
 * away at "Five bedroom villa for sale i...". The detail page has said this
 * correctly the whole time through `MARKET_PILL`; the card was the outlier.
 *
 * WHY IT IS DERIVED AND NOT READ. `listing_intent` is a two-value enum and this
 * platform runs four markets, which `PRODUCT.md` section 5 names as a known
 * rough edge: a nightly stay and an annual tenancy are both `rent`, and a
 * restaurant table is too. The period is the column that can tell them apart,
 * so the answer is composed from both, in one place, rather than re-derived by
 * each surface the way the document says it currently is.
 *
 * It is a LABEL and never a colour. Rule 13: a sale and a let must be
 * distinguishable by the word, because a reader who cannot see hue is entitled
 * to the same answer as one who can.
 *
 * IT RETURNS A KEY, NOT A WORD, so the four markets are named once in the
 * dictionary and read in Yoruba, Hausa and Igbo as well as English. A function
 * that returned "For sale" would have been the fifth place on this platform
 * where a market noun is written in English inside a component.
 */
export type CardMarket = keyof Dictionary["landing"]["card"]["market"];

export function cardMarket(listing: Listing): CardMarket {
  if (listing.intent === "sale") return "sale";
  if (listing.pricePeriod === "night") return "night";
  if (listing.pricePeriod === "guest") return "head";
  return "rent";
}

/**
 * The property noun, as a reader would say it rather than as the enum spells it.
 *
 * `shop`, `office` and `land` are the commercial and land markets, and calling
 * a plot of land an "apartment type" would be worse than saying nothing. Kept
 * short because this sits in a row of four facts at 12px.
 *
 * `rental` IS NULL, and that is the one entry worth explaining. It used to read
 * "To rent", which is not a kind of building at all: it is the market, and the
 * market now has its own label above. Leaving both in would have printed "To
 * rent" twice on every tenancy card. There is no honest building noun for
 * `rental` - the schema uses it for a flat, a house and a duplex alike - so the
 * fact is omitted and the beds and baths carry the shape instead.
 */
const KIND_NOUN: Record<Listing["kind"], string | null> = {
  hotel: "Hotel",
  apartment: "Apartment",
  home: "House",
  shortlet: "Shortlet",
  villa: "Villa",
  restaurant: "Restaurant",
  experience: "Experience",
  rental: null,
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

  /*
   * PARKING, because `GOVERNING-01` draws it as the third count on a featured
   * card and because in Lagos it is the fact people ask about third.
   *
   * Only when the lister declared a number: an undeclared parking count is not
   * "no parking", and this row has never printed a fact nobody stated. It
   * comes before the category noun, which is the softest of the four and is
   * the one that falls off the end of `slice(0, 4)` when a listing states all
   * of them.
   */
  if (listing.parkingSpaces !== undefined && listing.parkingSpaces > 0) {
    facts.push({
      key: "parking",
      numeric: true,
      label: (listing.parkingSpaces === 1
        ? t.directHome.parkingOne
        : t.directHome.parkingMany
      ).replace("{count}", String(listing.parkingSpaces)),
    });
  }

  const noun = KIND_NOUN[listing.kind];
  if (noun) facts.push({ key: "kind", label: noun });

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
