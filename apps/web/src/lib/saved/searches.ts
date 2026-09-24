import {
  KIND_NOUN,
  WATER_LABEL,
  type RawSearchParams,
} from "../listings/search-params";
import {
  parseShelfQuery,
  toShelfHref,
  type ShelfQuery,
} from "@/components/app/search/shelf-query";
import { formatMoney, getDictionary, type Locale } from "@vallo/i18n";

/**
 * A SAVED SEARCH, AS A VALUE. The vocabulary the actions, the list screen, the
 * control on the shelf and the alert job all read, so none of them can hold a
 * different idea of what was saved.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS THE ADDRESS BAR AND NOTHING ELSE.
 *
 * `lib/listings/search-params.ts` already says it: the address bar is the one
 * source of truth for a search, every control writes there, and there is no
 * client state the URL does not describe. A saved search is therefore a stored
 * address, and storing anything richer would mean a second description of the
 * same hunt that could drift from the one the shelf renders.
 *
 * So the row's `query` column holds the address, cleaned: the raw parameters
 * are parsed by the same `parseShelfQuery` the results page uses and written
 * back out by the same `toShelfHref`, which means nothing rubbish can be
 * stored, and the stored form is CANONICAL - one spelling, one order, one set
 * of defaults left out - so the same hunt saved from two different links is
 * the same row rather than two.
 *
 * This module imports the shelf's parser from `components/app/search` rather
 * than copying its six lines, on the same principle: the market parameter has
 * one reader. `lib/ui/data-saver.ts` and `lib/social/posts-queries.ts` already
 * reach that way across.
 *
 * ---------------------------------------------------------------------------
 * TWO PARAMETERS ARE DELIBERATELY DROPPED: `sort` AND `view`.
 *
 * Neither changes WHICH places match, only how they are ordered and whether
 * they are drawn as a list or on the map. Keeping them would mean the same
 * hunt saved from the list and from the map is two rows, with two alert
 * streams telling one person about one property twice. They are display
 * preferences, and the shelf remembers the view in its own cookie already.
 *
 * ---------------------------------------------------------------------------
 * NOTHING HERE IS SERVER-ONLY. The control on the shelf is a client component
 * and it derives the same label from the same parameters, so the words on the
 * button and the words in the row cannot disagree.
 */

/** The stored shape's version, so a later change can be told from this one. */
export const SAVED_SEARCH_VERSION = 1;

/** How many saved searches one account may keep. */
export const SAVED_SEARCH_LIMIT = 30;

/** The longest name a person may give a search. */
export const SAVED_SEARCH_LABEL_MAX = 60;

/** A cleaned address, as a flat record of parameters. */
export type SavedSearchParams = Record<string, string>;

/** One saved search, as every surface reads it. */
export type SavedSearchView = {
  id: string;
  /** What the person called it, or the sentence derived from the filters. */
  label: string;
  /** True when nobody named it and the label above was derived. */
  derivedLabel: boolean;
  /** The canonical parameters, for the chips under the label. */
  params: SavedSearchParams;
  /** Where it opens: an address the results page understands. */
  href: string;
  /** The canonical key this row is unique on, per account. */
  key: string;
  alertEnabled: boolean;
  /** ISO, for the quiet line under the row. */
  createdAt: string;
};

/**
 * The canonical form of a search: its parameters, its key and its address.
 *
 * `key` is the query string with the parameters in `toSearchHref`'s fixed
 * order, which is what makes "the same search" a comparable value. An empty
 * key means nothing was asked at all.
 */
export type CanonicalSearch = {
  params: SavedSearchParams;
  key: string;
  href: string;
  query: ShelfQuery;
};

/** Strip the two display parameters and write the address back out. */
export function canonicalSearch(raw: RawSearchParams): CanonicalSearch {
  const query = parseShelfQuery(raw);
  const stored: ShelfQuery = { ...query, sort: "recommended", view: "list" };
  const href = toShelfHref(stored);
  const key = href.includes("?") ? href.slice(href.indexOf("?") + 1) : "";
  const params: SavedSearchParams = {};
  for (const [name, value] of new URLSearchParams(key)) params[name] = value;
  return { params, key, href, query: stored };
}

/**
 * The stored jsonb, read back defensively.
 *
 * `query` is a jsonb column, so it can hold anything an older build wrote or
 * anything a hand-edited row contains. Every value that is not a string is
 * dropped, and the result is run back through `canonicalSearch`, so a row can
 * only ever produce an address the results page already understands.
 */
export function readStoredSearch(value: unknown): CanonicalSearch {
  const raw: RawSearchParams = {};
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const holder = value as Record<string, unknown>;
    const params = holder.params;
    if (params && typeof params === "object" && !Array.isArray(params)) {
      for (const [name, entry] of Object.entries(params as Record<string, unknown>)) {
        if (typeof entry === "string") raw[name] = entry;
      }
    }
  }
  return canonicalSearch(raw);
}

/** What goes into the `query` column. */
export function storedSearchJson(canonical: CanonicalSearch): {
  v: number;
  params: SavedSearchParams;
} {
  return { v: SAVED_SEARCH_VERSION, params: canonical.params };
}

/* ------------------------------------------------------------ the words */

function moneyClause(query: ShelfQuery, locale: Locale): string | null {
  const { minMinor, maxMinor } = query;
  if (minMinor !== undefined && maxMinor !== undefined) {
    return `${formatMoney(minMinor, locale)} to ${formatMoney(maxMinor, locale)}`;
  }
  if (maxMinor !== undefined) return `under ${formatMoney(maxMinor, locale)}`;
  if (minMinor !== undefined) return `over ${formatMoney(minMinor, locale)}`;
  return null;
}

/**
 * The sentence a search gets when nobody has named it.
 *
 * Built in falling order of importance and trimmed from the back, so a long
 * hunt loses its budget and then its market rather than being cut mid-figure.
 * Money is read straight from the query's integer kobo through `formatMoney`
 * and is never divided here; the address bar is the only boundary that speaks
 * naira, and `lib/listings/search-params.ts` owns that conversion.
 */
export function describeSearch(
  params: SavedSearchParams,
  locale: Locale = "en",
): string {
  const query = parseShelfQuery(params);

  const noun = query.kind ? KIND_NOUN[query.kind].many : "places";
  const beds = query.bedrooms !== undefined ? `${query.bedrooms} bed ` : "";
  const head = `${beds}${noun}`;

  const clauses: string[] = [];
  if (query.q) clauses.push(`in ${query.q}`);
  if (query.intent) clauses.push(query.intent === "sale" ? "for sale" : "to rent");
  const money = moneyClause(query, locale);
  if (money) clauses.push(money);

  while (clauses.length > 0) {
    const line = [head, ...clauses].join(" ");
    if (line.length <= SAVED_SEARCH_LABEL_MAX) return sentence(line);
    clauses.pop();
  }
  return sentence(head).slice(0, SAVED_SEARCH_LABEL_MAX);
}

function sentence(value: string): string {
  return value.length === 0 ? value : value[0]!.toUpperCase() + value.slice(1);
}

/**
 * THE FILTERS THAT ARE ACTUALLY STORED, AS CHIPS.
 *
 * This is the read-back the ONE LAW asks for, in words: the row does not say
 * "saved", it says what was saved, derived from the stored parameters in the
 * same render that drew the row. If a filter is missing from this list it was
 * not stored, and the person can see that without opening the search.
 */
export function summariseSearch(
  params: SavedSearchParams,
  locale: Locale = "en",
): string[] {
  const query = parseShelfQuery(params);
  const chips: string[] = [];

  if (query.q) chips.push(query.q);
  if (query.kind) chips.push(sentence(KIND_NOUN[query.kind].many));
  if (query.intent) chips.push(query.intent === "sale" ? "For sale" : "To rent");
  const money = moneyClause(query, locale);
  if (money) chips.push(sentence(money));
  if (query.bedrooms !== undefined) chips.push(`${query.bedrooms}+ beds`);
  if (query.bathrooms !== undefined) chips.push(`${query.bathrooms}+ baths`);
  if (query.guests !== undefined) chips.push(`Sleeps ${query.guests}`);
  if (query.verifiedOnly) chips.push("Checked listings");
  if (query.instantBook) chips.push("Instant book");
  if (query.powerBackup) chips.push("Backup power");
  if (query.powerBandA) chips.push("Band A feeder");
  for (const source of query.waterSupply) chips.push(WATER_LABEL[source]);
  if (query.landlordAway) chips.push("Landlord lives elsewhere");
  if (query.parkingInside) chips.push("Parking inside the compound");
  if (query.servicedOnly) chips.push("Serviced");
  if (query.gatedEstate) chips.push("Gated estate");
  if (query.maxUpfront !== undefined) {
    chips.push(query.maxUpfront === 12 ? "One year upfront at most" : `${query.maxUpfront} months upfront at most`);
  }
  /* V-66: the shapes and areas, in the words the dictionary uses. */
  for (const shape of query.shapes ?? []) chips.push(getDictionary(locale).shape.unit.shapes[shape]);
  if (query.withBq) chips.push(getDictionary(locale).shape.unit.filterBq);
  for (const area of query.areas ?? []) chips.push(sentence(area));
  for (const code of query.amenities) chips.push(amenityWord(code));

  return chips;
}

/**
 * An amenity code as a person reads it.
 *
 * The codes are lowercase slugs from the `amenities` reference table and the
 * drawer holds its own labelled list, which is a client module this one has no
 * business importing on the server. A slug reads well enough with its hyphens
 * opened out, and it is the stored value rather than a prettier guess at it.
 */
function amenityWord(code: string): string {
  return sentence(code.replace(/[-_]/g, " "));
}
