import { formatMoney, type Dictionary, type Locale } from "@vallo/i18n";
import { isSupportedType, MINIMUM_COMPARABLES } from "./gate";
import type { AreaAskingRow, ListingIntent, ListingPropertyType, RentPeriod } from "./types";

/**
 * V-74: PRICING GUIDANCE INSIDE THE WIZARD'S PRICING STEP, AS PURE FUNCTIONS.
 *
 * What the lister sees beside the figure they are typing: what similar homes
 * in the same area are ASKING ("Similar 2 bedroom flats in Yaba are advertised
 * at ₦1,300,000 to ₦1,800,000 a year: 9 listings, asking prices"), and beside
 * the fee lines the area's usual agency and legal fee as a share of the rent.
 *
 * THE FIGURES ARE ASKING PRICES AND SAY SO. The range is the middle half (the
 * 25th to the 75th percentile) of `area_asking_summary`'s real, published
 * listings of the same type, bedroom count and intent in the same area, and
 * only where at least five exist, the gate's own minimum. Below that the panel
 * says there are not enough to compare, never a guess. It never names a
 * listing, and the regulated words are never used (the valuation-words check
 * scans this file).
 *
 * WHY THE AREA AND NOT A RADIUS. The source recommendation asks for "within
 * 3 km" from the draft's pin; the wizard has no pin yet (MK-55 makes one
 * mandatory and has not landed). The area report is the Price Check read that
 * needs no pin, and it is what the card and the area pages already print. When
 * the pin lands, the radius gate (`estimate_value`) can replace this read
 * without changing the panel's states.
 */

export type GuideSubject = {
  stateCode: string;
  city: string | null;
  area: string | null;
  propertyType: ListingPropertyType;
  intent: ListingIntent;
  /** Only for a let; the asking figures are yearly. */
  rentPeriod: RentPeriod | null;
  bedrooms: number | null;
};

export type GuideRefusal =
  /** Land, shortlets, hotels: priced another way, and more listings would not fix it. */
  | "unsupported_type"
  /** A monthly or quarterly rent: the asking figures are yearly. */
  | "yearly_only"
  /** No area typed yet on the location step. */
  | "no_area"
  /** Fewer than five similar real listings in the area. */
  | "too_few";

export type FeeNorms = {
  listingCount: number;
  agencyCount: number;
  agencyPct: number | null;
  legalCount: number;
  legalPct: number | null;
};

export type Guide =
  | { kind: "unreachable" }
  | { kind: "refused"; code: GuideRefusal; count: number }
  | {
      kind: "asking";
      lowMinor: number;
      highMinor: number;
      count: number;
      oldestAt: string;
      newestAt: string;
    };

/** Whether the subject can be asked about at all, before any read. */
export function guideRefusalFor(subject: GuideSubject): GuideRefusal | null {
  if (!isSupportedType(subject.propertyType)) return "unsupported_type";
  if (subject.intent === "rent" && subject.rentPeriod !== "year") return "yearly_only";
  if (!subject.area || subject.area.trim() === "" || !subject.stateCode) return "no_area";
  return null;
}

/**
 * The guide from the area report's rows. `rows` null is a read that failed,
 * which is never shown as "not enough listings": that would be a claim about
 * our data made because a query threw.
 */
export function guideFromRows(subject: GuideSubject, rows: readonly AreaAskingRow[] | null): Guide {
  const refusal = guideRefusalFor(subject);
  if (refusal) return { kind: "refused", code: refusal, count: 0 };
  if (rows === null) return { kind: "unreachable" };
  const bedrooms = subject.bedrooms ?? 0;
  const row = rows.find(
    (r) => r.scope === "area" && r.propertyType === subject.propertyType && r.bedrooms === bedrooms,
  );
  if (!row || row.listingCount < MINIMUM_COMPARABLES || !(row.p25Minor > 0) || !(row.p75Minor >= row.p25Minor)) {
    return { kind: "refused", code: "too_few", count: row?.listingCount ?? 0 };
  }
  return {
    kind: "asking",
    lowMinor: row.p25Minor,
    highMinor: row.p75Minor,
    count: row.listingCount,
    oldestAt: row.oldestAt,
    newestAt: row.newestAt,
  };
}

type Copy = Dictionary["frontDoor"]["guide"];

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole));
}

/** "2 bedroom flats", "Shops", "Studio flats": what "similar" means here. */
export function similarNoun(subject: GuideSubject, copy: Copy): string {
  const t = copy.nouns;
  if (subject.propertyType === "shop") return t.shops;
  if (subject.propertyType === "office") return t.offices;
  const noun = subject.propertyType === "home" ? t.houses : t.flats;
  if (subject.bedrooms === 0) return fill(t.studio, { noun });
  if (subject.bedrooms !== null && subject.bedrooms > 0) return fill(t.bedrooms, { count: subject.bedrooms, noun });
  return noun;
}

/** The panel's sentences. Money only through `formatMoney`. */
export function guideLines(
  subject: GuideSubject,
  guide: Guide,
  copy: Copy,
  locale: Locale,
): { headline: string; basis: string | null } {
  if (guide.kind === "unreachable") return { headline: copy.unreachable, basis: null };
  if (guide.kind === "refused") {
    const headline = copy.refusals[guide.code];
    return {
      headline,
      basis: guide.code === "too_few" && guide.count > 0 ? fill(copy.foundOnly, { count: guide.count }) : null,
    };
  }
  const range = fill(subject.intent === "sale" ? copy.rangeSale : copy.rangeRent, {
    similar: similarNoun(subject, copy),
    area: (subject.area ?? "").trim(),
    low: formatMoney(guide.lowMinor, locale),
    high: formatMoney(guide.highMinor, locale),
  });
  return { headline: range, basis: fill(copy.basis, { count: guide.count }) };
}

/** "Agency fees here are usually 10% of the yearly rent (12 listings)", or null. */
export function feeNormLine(kind: "agency" | "legal", norms: FeeNorms | null, copy: Copy): string | null {
  if (!norms) return null;
  const pct = kind === "agency" ? norms.agencyPct : norms.legalPct;
  const count = kind === "agency" ? norms.agencyCount : norms.legalCount;
  if (pct === null || count < MINIMUM_COMPARABLES) return null;
  const shown = Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
  return fill(kind === "agency" ? copy.agencyNorm : copy.legalNorm, { pct: shown, count });
}
