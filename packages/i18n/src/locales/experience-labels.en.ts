/**
 * THE LISTING LABEL MAPS SHARED ACROSS SURFACES (C9, after the route sweep, 6 October 2026).
 *
 * `lib/listings/pricing.ts` and `lib/listings/search-params.ts` held these as
 * English constants, so the listing page, the cards, the move-in ledger, the
 * chat cards and the search shelf printed "/yr", "Fully furnished" and
 * "hotels" to a Hausa, Yoruba or Igbo reader. The words live here now and
 * each surface reads them from its own dictionary; the lib keeps only the
 * keys. Moved word for word: English output is unchanged.
 *
 * The long period suffix ("per year", "asking price") is NOT here: it already
 * lives, translated, at `agentListings.pricing.period`, and every surface
 * reads that one.
 *
 * English only, like every experience-* module: ha, ig and yo fall back to
 * these through `withFallback` until a translator supplies a line, because an
 * invented translation of a new line is worse than none.
 */
export const experienceLabelsEn = {
  /** After a figure on a card or a map pin, where the row is one line. No "sale": a sale has no period and prints no suffix. */
  periodShort: {
    month: "/mo",
    quarter: "/qtr",
    year: "/yr",
    night: "/night",
    guest: "/head",
  },
  /** After a figure in the booking panels and the move-in ledger: "₦450,000 / night". */
  periodSlash: {
    month: "/ month",
    quarter: "/ quarter",
    year: "/ year",
    night: "/ night",
    guest: "/ head",
  },
  /** `listings.furnished`, as a fact on the listing page. */
  furnishing: {
    unfurnished: "Unfurnished",
    semi_furnished: "Semi furnished",
    fully_furnished: "Fully furnished",
  },
  /** `listings.build_condition`, as a fact on the listing page. */
  condition: {
    newly_built: "Newly built",
    renovated: "Renovated",
    old: "Older build",
    off_plan: "Off plan",
  },
  /**
   * Each kind as the shelf counts it, singular and plural: "Explore hotels",
   * "4 plots waiting without them". `anyKind` is the noun when no kind is
   * chosen.
   */
  kinds: {
    hotel: { one: "hotel", many: "hotels" },
    apartment: { one: "apartment", many: "apartments" },
    home: { one: "home", many: "homes" },
    shortlet: { one: "shortlet", many: "shortlets" },
    villa: { one: "villa", many: "villas" },
    restaurant: { one: "restaurant", many: "restaurants" },
    experience: { one: "experience", many: "experiences" },
    rental: { one: "rental", many: "rentals" },
    shop: { one: "shop", many: "shops" },
    office: { one: "office", many: "offices" },
    land: { one: "plot", many: "plots" },
  },
  anyKind: { one: "place", many: "places" },
  /** A state after a city on the listing page: "Yaba, Lagos, Lagos State". The FCT does not take the suffix. */
  state: "{state} State",
  stateFct: "the FCT",
};
