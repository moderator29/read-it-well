import { z } from "zod";
import { getListingRepository } from "@/lib/listings/repository";
import type { Listing, ListingKind } from "@/lib/listings/types";
/*
 * THE SIDE LAW, FROM THE ONE PLACE THAT DECIDES IT.
 *
 * Both href call sites (here and in compare_listings) used to hardcode
 * `/listing/<id>` for every row the catalogue returned, so every hotel,
 * shortlet, villa and restaurant the concierge found opened in the PROPERTY
 * shell: property dock, property chrome, and a Book Inspection footer under a
 * room sold by the night (R2-3, R3 F-03). `lib/listings/href.ts` already
 * answers this for `ListingCard`, and the answer is a function of `kind` and
 * nothing else, so the assistant imports it rather than carrying a second copy
 * that can drift.
 */
import { hrefForListing, marketFactsOf } from "@/lib/listings/href";
import type { AssistantListingItem } from "../types";
import { priceLine } from "./listing-facts";
import { defineTool, TOOL_FRAMES } from "./types";

/**
 * Every market the model may search, named for it.
 *
 * This is the full `ListingKind` union rather than a subset. It used to omit
 * shop, office and land, which meant somebody asking the concierge for a plot
 * in Epe or a shop in Aba got a search with no category on it and whatever the
 * free text happened to catch. Those three are the commercial and land market
 * and they are exactly the ones a person cannot browse casually, so they are
 * the ones an assistant is most useful for.
 */
export const LISTING_KINDS = [
  "rental",
  "apartment",
  "home",
  "shortlet",
  "villa",
  "hotel",
  "restaurant",
  "experience",
  "shop",
  "office",
  "land",
] as const satisfies readonly ListingKind[];

/**
 * Written as an instruction rather than as data, because the model has to do
 * something specific with it and "exampleOnly: true" invites paraphrase. It
 * also states the prohibition, since the tempting move from here is to
 * describe the examples helpfully. Sent as the fence's `note`, outside `data`.
 */
export const EXAMPLE_ONLY_NOTE =
  "The only properties matching this search are example listings that Vallo uses to illustrate the catalogue. They do not exist and cannot be booked, inspected or paid for. Tell the person plainly that there is nothing real matching this yet, and that the places they may see while browsing are examples. Do NOT describe, name, price or recommend any of them.";

export const NO_MATCH_NOTE = "No listings matched. Suggest widening the search.";

const input = z.object({
  query: z.string().optional(),
  city: z.string().optional(),
  kind: z.enum(LISTING_KINDS).optional(),
  maxPricePerNightNaira: z.number().optional(),
  bedrooms: z.number().optional(),
});

/** Run the catalogue search server-side; the model only ever sees real rows. */
export async function runListingSearch(raw: z.output<typeof input>): Promise<{
  items: AssistantListingItem[];
  forModel: Omit<AssistantListingItem, "photo">[];
  /** True when the only rows matching this search were example listings. */
  exampleOnly: boolean;
}> {
  const repo = getListingRepository();

  const query = raw.query?.trim() ? raw.query.trim() : undefined;
  const city = raw.city?.trim() ? raw.city.trim().toLowerCase() : undefined;
  const kind: ListingKind | undefined = raw.kind;
  const maxNaira =
    raw.maxPricePerNightNaira !== undefined && Number.isFinite(raw.maxPricePerNightNaira)
      ? raw.maxPricePerNightNaira
      : undefined;
  const bedrooms = raw.bedrooms !== undefined && Number.isFinite(raw.bedrooms) ? raw.bedrooms : undefined;

  const narrow = (rows: Listing[]): Listing[] =>
    rows.filter((l) => {
      if (city && !l.city.toLowerCase().includes(city) && !l.state.toLowerCase().includes(city)) {
        return false;
      }
      if (maxNaira !== undefined) {
        /* Zero is "we were not told", not "free", so an unpriced listing is
           not an answer to a budget question. This is the same ruling
           `matchesFacts` already makes for the search page, said here because
           this filter is hand written rather than shared. */
        if (l.priceMinor <= 0) return false;
        if (l.priceMinor > Math.round(maxNaira * 100)) return false;
      }
      if (bedrooms !== undefined && l.bedrooms < bedrooms) return false;
      return true;
    });

  /*
   * EXAMPLE LISTINGS ARE NOT ANSWERS, AND THIS IS THE FIFTH SURFACE.
   *
   * The example-listing sweep sealed the sitemap, the structured data, the
   * Open Graph card and email. It missed this one, because the assistant is
   * not a page and nobody thinks of a chat reply as a publication. It is the
   * worst of the five: the others show a property, this one RECOMMENDS one, in
   * a sentence, with a naira price and a link, to somebody who asked for help.
   *
   * The database refuses every transaction against these rows, so a person
   * following that recommendation reaches a wall the assistant sent them to.
   */
  let rows = narrow(await repo.search({ q: query, kind, excludeDemo: true }));
  if (rows.length === 0 && query) {
    // Free text over-restricted; keep the structured filters and drop it.
    rows = narrow(await repo.search({ kind, excludeDemo: true }));
  }

  /*
   * Why the empty case is not simply empty.
   *
   * Today the catalogue is 42 example properties and no real ones, so
   * excluding them correctly returns nothing for almost any question. "I found
   * nothing" would be true and would also be a worse answer than the truth,
   * because the search page visibly shows results for the same query and the
   * assistant would look broken rather than careful.
   *
   * So when the exclusion is what emptied the result, say so. The model can
   * then explain that the places shown in search are examples rather than
   * pretending the catalogue is bare, and it never has to be trusted to
   * remember a caveat about a row it was handed.
   */
  const exampleOnly = rows.length === 0 && narrow(await repo.search({ kind })).length > 0;

  const top = rows
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
    .slice(0, 5);

  /*
   * What the model is given about each place.
   *
   * This used to be seven fields, and the concierge could therefore only ever
   * say "here is a hotel in Lagos for this much, rated 4.4". Everything that
   * makes an answer worth reading was sitting on the row and being dropped:
   * which part of the city it is in, how many people that rating is built on,
   * whether it is open right now, whether anybody here has checked it, and
   * where the facts came from.
   *
   * Every field below is read off a real row and none is inferred. Absent
   * values are OMITTED rather than sent as nulls or empty strings, because a
   * key with nothing behind it invites a model to describe the nothing.
   */
  const forModel = top.map((l) => ({
    id: l.id,
    title: l.title,
    /* Area first: "Victoria Island, Lagos" is an answer, "Lagos" is a
       postcode. It is the single most useful thing we were throwing away. */
    ...(l.area && l.area !== l.city ? { area: l.area } : {}),
    city: l.city,
    state: l.state,
    kind: l.kind,
    price: priceLine(l),
    rating: l.rating,
    /* A rating with no count behind it is not evidence. 4.9 from two people
       and 4.4 from twelve hundred are different claims, and the model cannot
       weigh them without this. */
    reviewCount: l.reviewCount,
    /* The three facts the result card shows under the price, each read off
       the row and omitted when the lister stated nothing: a zero bedroom
       count on a restaurant is "does not apply", not a fact. */
    ...(l.bedrooms > 0 ? { bedrooms: l.bedrooms } : {}),
    ...(l.bathrooms > 0 ? { bathrooms: l.bathrooms } : {}),
    ...(l.sizeSqm !== undefined && l.sizeSqm > 0 ? { sizeSqm: l.sizeSqm } : {}),
    /* Facts the source actually stated: "Open now", "Hotel", light and water
       where a first-party host answered. Never a guess. */
    ...(l.amenities.length > 0 ? { facts: l.amenities.slice(0, 6) } : {}),
    /*
     * How far up the ladder the person behind this listing has climbed.
     *
     * This used to also carry a provenance field, because discovery held
     * third-party stock that nobody at Vallo had checked and the model had to
     * be able to say so. There is no third-party stock any more: every row
     * here was listed by a person on this platform, so the only question left
     * is how much of that person we have verified, which is what this flag
     * answers.
     */
    verified: l.verified,
    /* UX-25: an example says so, so the model can say it too. */
    ...(l.isDemo ? { example: true } : {}),
    href: hrefForListing(l.kind, l.id, marketFactsOf(l)),
  }));
  const items: AssistantListingItem[] = forModel.map((entry, i) => {
    const photo = top[i]?.photos[0];
    return photo ? { ...entry, photo } : { ...entry };
  });
  return { items, forModel, exampleOnly };
}

export const searchListingsTool = defineTool({
  name: "search_listings",
  description:
    "Search Vallo's catalogue of property listed by people on Vallo: rentals, property for sale, land, shops and offices, and shortlets, hotels and homes let by their owners, across Nigeria. Nothing comes from an outside feed; a result marked as an example cannot be rented, bought or booked, and you say so. Returns up to five listings with formatted naira prices, ratings and in-app links. Always call this before recommending any property.",
  input,
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Free text matched against title, area, city and state.",
      },
      city: {
        type: "string",
        description:
          "Restrict to one city, e.g. Lagos, Abuja, Port Harcourt, Ibadan, Enugu or Calabar.",
      },
      kind: {
        type: "string",
        enum: [...LISTING_KINDS],
        description:
          "Restrict to one category. Use rental for annual and monthly tenancies, land for plots, shop and office for commercial space, and shortlet for a place let by the night.",
      },
      maxPricePerNightNaira: {
        type: "number",
        description:
          "Upper price bound in naira, in whatever period the listing is priced by: per year for a tenancy, per night for a shortlet. This bounds the rent or asking price alone and does not account for caution deposit, agency, legal or agreement fees.",
      },
      bedrooms: {
        type: "number",
        description: "Minimum number of bedrooms.",
      },
    },
    additionalProperties: false,
  },
  mode: "read",
  workspaces: TOOL_FRAMES,
  async run(_ctx, args) {
    const { items, forModel, exampleOnly } = await runListingSearch(args);
    if (forModel.length > 0) return { data: forModel, listings: items };
    return { data: { results: [] }, note: exampleOnly ? EXAMPLE_ONLY_NOTE : NO_MATCH_NOTE, listings: items };
  },
});
