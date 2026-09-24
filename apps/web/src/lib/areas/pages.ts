import { MINIMUM_COMPARABLES } from "../price-check/gate";
import { publicAreaName } from "../share/public-text";
import { nairaDecimal } from "../listings/syndication";
import type { AreaAskingRow, AreaShare } from "../price-check/types";

/**
 * V-82: THE PUBLIC AREA PRICE PAGES, AS PURE FUNCTIONS.
 *
 * ---------------------------------------------------------------------------
 * WHAT THESE PAGES ARE, AND WHAT THEY MAY NEVER BE.
 *
 * The founder closed the catalogue on 23 September, which is his call and
 * costs Vallo every search a Nigerian types as "2 bedroom flat Yaba price".
 * `/areas/<state>/<area>` answers that search with a statement about a market
 * and nothing else: what similar homes in that area are ASKING, by type and
 * bedrooms, with the count and the dates behind every figure. No listing, no
 * photograph, no agent, no address. It cannot be mistaken for inventory, so
 * it does not reopen what the ruling closed.
 *
 * ---------------------------------------------------------------------------
 * A PAGE EXISTS ONLY WHERE THE FLOOR IS MET, AND OTHERWISE IT IS A 404.
 *
 * Not a thin page with "no data yet" on it: a thin page is an indexable claim
 * that we cover an area we do not. The floor is Price Check's own
 * `MINIMUM_COMPARABLES` of REAL listings, applied three times:
 *
 *   1. `public.area_price_pages` clamps its minimum to five in SQL, excludes
 *      examples by predicate, and never returns an address-shaped area.
 *   2. `qualifyingPages` below refuses any row under the same floor or with a
 *      name `safeAreaName` rejects, so a widened function cannot widen this.
 *   3. `resolveAreaPage` answers null for any slug pair not in that list, and
 *      the route calls `notFound()` on null. The sitemap is built from the
 *      same list, so the two cannot disagree.
 *
 * TODAY THERE ARE ZERO PAGES, BECAUSE EVERY LISTING IS AN EXAMPLE. That is
 * the correct output and the tests assert it.
 */

/** One row of `public.area_price_pages`. */
export type AreaPageRow = {
  stateCode: string;
  stateName: string;
  area: string;
  listingCount: number;
  newestAt: string | null;
};

export type AreaPage = AreaPageRow & { stateSlug: string; areaSlug: string; path: string };

/** A URL segment a person can read: "Lekki Phase 1" is `lekki-phase-1`. */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Rows from the database, parsed defensively. Bigints arrive as strings. */
export function areaPageRowFromRow(row: Record<string, unknown>): AreaPageRow | null {
  const stateCode = typeof row.state_code === "string" ? row.state_code : null;
  const stateName = typeof row.state_name === "string" ? row.state_name : null;
  const area = typeof row.area === "string" ? row.area.trim() : null;
  const count = Number(row.listing_count);
  if (!stateCode || !stateName || !area || !Number.isFinite(count)) return null;
  return {
    stateCode,
    stateName,
    area,
    listingCount: Math.trunc(count),
    newestAt: typeof row.newest_at === "string" ? row.newest_at : null,
  };
}

/**
 * The pages that may exist, from whatever the database said.
 *
 * The floor is re-applied here on purpose (see the header): the page count is
 * a promise to a search engine and it is checked where it is kept.
 */
export function qualifyingPages(rows: readonly AreaPageRow[]): AreaPage[] {
  const seen = new Set<string>();
  const out: AreaPage[] = [];
  for (const row of rows) {
    if (row.listingCount < MINIMUM_COMPARABLES) continue;
    const name = publicAreaName(row.area);
    if (name === null) continue;
    const stateSlug = slugify(row.stateName);
    const areaSlug = slugify(name);
    if (stateSlug === "" || areaSlug === "") continue;
    const path = `/areas/${stateSlug}/${areaSlug}`;
    /* Two spellings that slug alike are one page; the bigger count wins
       because the database returns them largest first. */
    if (seen.has(path)) continue;
    seen.add(path);
    out.push({ ...row, area: name, stateSlug, areaSlug, path });
  }
  return out;
}

/** The page for a slug pair, or null, which the route turns into a 404. */
export function resolveAreaPage(
  stateSlug: string,
  areaSlug: string,
  pages: readonly AreaPage[],
): AreaPage | null {
  const s = stateSlug.toLowerCase();
  const a = areaSlug.toLowerCase();
  return pages.find((page) => page.stateSlug === s && page.areaSlug === a) ?? null;
}

/**
 * One asking row as the shape `shareLines` already knows how to word, so the
 * area page and the share card say the same thing in the same words. The
 * range is the interquartile range (p25 to p75), which is what the share card
 * prints, and the count travels with it.
 */
export function rowAsShare(page: AreaPage, row: AreaAskingRow): AreaShare {
  return {
    id: `${page.path}#${row.propertyType}-${row.bedrooms}`,
    scope: "area_and_type",
    stateCode: page.stateCode,
    lgaCode: null,
    area: page.area,
    propertyType: row.propertyType,
    listingIntent: "rent",
    bedrooms: row.bedrooms,
    lowMinor: row.p25Minor,
    midMinor: row.medianMinor,
    highMinor: row.p75Minor,
    listingCount: row.listingCount,
    oldestAt: row.oldestAt,
    newestAt: row.newestAt,
    createdAt: row.newestAt,
  };
}

/**
 * The structured data for an area page: a `Dataset`, NEVER an `Offer`.
 *
 * An Offer is a claim that something can be bought at a price, and a rich
 * result built from one would put an asking figure beside a property that the
 * page does not show. A Dataset is what the page is: a count of listings and a
 * range, dated, with its method in the description.
 */
export function areaDatasetJsonLd(
  page: AreaPage,
  rows: readonly AreaAskingRow[],
  origin: string,
  description: string,
): Record<string, unknown> {
  const dates = rows.flatMap((row) => [row.oldestAt, row.newestAt]).filter(Boolean).sort();
  const first = dates[0];
  const last = dates[dates.length - 1];
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `Asking rents in ${page.area}, ${page.stateName}`,
    description,
    url: `${origin.replace(/\/+$/, "")}${page.path}`,
    creator: { "@type": "Organization", name: "Vallo" },
    spatialCoverage: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: page.area,
        addressRegion: page.stateName,
        addressCountry: "NG",
      },
    },
    ...(first && last ? { temporalCoverage: `${first.slice(0, 10)}/${last.slice(0, 10)}` } : {}),
    variableMeasured: rows.map((row) => ({
      "@type": "PropertyValue",
      name: `${row.bedrooms} bedroom ${row.propertyType}, yearly asking rent`,
      unitCode: "NGN",
      minValue: nairaDecimal(row.p25Minor),
      maxValue: nairaDecimal(row.p75Minor),
      description: `Interquartile range of ${row.listingCount} listings`,
    })),
  };
}

/**
 * The asking rows a public page may print: only a type and bedroom count with
 * at least the Price Check minimum behind it. `area_asking_summary` answers
 * from three, which is right for the signed-in area report and too few for a
 * page any crawler can index, so the public page applies the stricter floor.
 */
export function publicAskingRows<T extends { listingCount: number }>(rows: readonly T[]): T[] {
  return rows.filter((row) => row.listingCount >= MINIMUM_COMPARABLES);
}
