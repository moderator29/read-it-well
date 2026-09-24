import { formatMoney, formatDate, type Dictionary, type Locale } from "@vallo/i18n";
import { findNeighbourhood, NEIGHBOURHOODS } from "../places/neighbourhoods";
import { nairaToKobo } from "../listings/search-params";

/**
 * V-95: THE BRIEF, AS PURE FUNCTIONS.
 *
 * A brief is facts only, never free text: to let or to buy, a kind of home,
 * a bedroom minimum, a ceiling in kobo, a month, and one to three
 * neighbourhoods from the closed list (so a lister can be matched to it, and
 * so it carries no address). `briefLine` words it the same way for the renter
 * and for the lister who may answer it. Money only through `formatMoney`.
 */

export const BRIEF_PROPERTY_TYPES = ["apartment", "home", "shop", "office", "land"] as const;
export type BriefPropertyType = (typeof BRIEF_PROPERTY_TYPES)[number];

export type BriefView = {
  id: string;
  stateCode: string;
  areas: string[];
  intent: "rent" | "sale";
  propertyType: BriefPropertyType | null;
  bedroomsMin: number | null;
  maxMinor: number | null;
  moveFrom: string | null;
  createdAt: string;
  expiresAt: string;
  closedAt?: string | null;
};

export type BriefDraft = {
  stateCode: string;
  areas: string[];
  intent: "rent" | "sale";
  propertyType: BriefPropertyType | null;
  bedroomsMin: number | null;
  maxMinor: number | null;
};

/** The neighbourhoods a brief may name in a state, in the list's order. */
export function briefAreasFor(stateCode: string): string[] {
  return NEIGHBOURHOODS.filter((n) => n.stateCode === stateCode)
    .map((n) => n.area)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * A draft brief from a saved or current search's parameters: the place is
 * taken only from the closed list (the typed words are read and dropped).
 */
export function briefDraftFrom(params: Record<string, string | undefined>): BriefDraft {
  const place = params.q ? findNeighbourhood(params.q) : null;
  const bedrooms = params.beds !== undefined ? Number(params.beds) : NaN;
  const max = params.max !== undefined ? Number(params.max) : NaN;
  return {
    stateCode: place?.stateCode ?? "LA",
    areas: place ? [place.area] : [],
    intent: params.market === "buy" || params.market === "sale" ? "sale" : "rent",
    propertyType: null,
    bedroomsMin: Number.isInteger(bedrooms) && bedrooms >= 0 && bedrooms <= 10 ? bedrooms : null,
    /* The search's ceiling is naira in the address bar; a brief keeps kobo. */
    maxMinor: Number.isFinite(max) && max > 0 ? nairaToKobo(max) : null,
  };
}

type Copy = Dictionary["frontDoor"]["briefs"];

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole));
}

/** "2+ bedroom flat to rent in Yaba or Surulere, up to ₦3,000,000, from November 2026". */
export function briefLine(brief: Pick<BriefView, "areas" | "intent" | "propertyType" | "bedroomsMin" | "maxMinor" | "moveFrom">, copy: Copy, locale: Locale): string {
  const noun = brief.propertyType ? copy.types[brief.propertyType] : copy.types.any;
  const rooms =
    brief.bedroomsMin === null || brief.propertyType === "shop" || brief.propertyType === "office" || brief.propertyType === "land"
      ? noun
      : brief.bedroomsMin === 0
        ? fill(copy.studio, { noun })
        : fill(copy.rooms, { count: brief.bedroomsMin, noun });
  const where = brief.areas.length <= 1 ? (brief.areas[0] ?? "") : `${brief.areas.slice(0, -1).join(", ")} ${copy.or} ${brief.areas[brief.areas.length - 1]}`;
  const parts = [fill(brief.intent === "sale" ? copy.toBuy : copy.toRent, { what: rooms, where })];
  if (brief.maxMinor !== null) parts.push(fill(copy.upTo, { amount: formatMoney(brief.maxMinor, locale) }));
  if (brief.moveFrom) {
    parts.push(fill(copy.from, { month: formatDate(new Date(`${brief.moveFrom}T12:00:00+01:00`), locale, { month: "long", year: "numeric", timeZone: "Africa/Lagos" }) }));
  }
  return parts.join(", ");
}
