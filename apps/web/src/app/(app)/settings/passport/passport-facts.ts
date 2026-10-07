import { formatDate, formatNumber, type Locale } from "@vallo/i18n/core";
import type { PassportFacts } from "@/lib/trust/passport";

/**
 * THE PASSPORT'S FACTS, AS DATES WHERE VALLO HOLDS A DATE (V-100, D14/D17,
 * north star "trust facts as dates, never ticks").
 *
 * Pure, so it is tested rather than trusted. A fact appears only when Vallo
 * recorded something behind it: a false, a null or a zero produces NO entry,
 * because an absence is not a fact about a person (the rule `passportLines`
 * already keeps). Where the record has a date, the date is the value; where it
 * has only a count (inspections, tenancies: `my_renter_passport` returns no
 * date for them, request R-W6-3), the count is the value, and no date is made
 * up. Nothing here ever draws a tick.
 */

export const FACT_KEYS = ["identity", "phone", "attended", "tenancies", "since"] as const;
export type FactKey = (typeof FACT_KEYS)[number];

export type FactView = {
  key: FactKey;
  /** ISO timestamp when Vallo holds one for this fact. */
  at: string | null;
  /** A whole count, for the facts that are counts. */
  count: number | null;
};

export function isFactKey(value: string): value is FactKey {
  return (FACT_KEYS as readonly string[]).includes(value);
}

/** The facts with something behind them, in the order a lister reads them. */
export function factViews(facts: PassportFacts | null, phoneConfirmedAt: string | null): FactView[] {
  if (!facts) return [];
  const out: FactView[] = [];
  if (facts.nimcMatchedAt) out.push({ key: "identity", at: facts.nimcMatchedAt, count: null });
  if (facts.phoneConfirmed) out.push({ key: "phone", at: validIso(phoneConfirmedAt), count: null });
  if (facts.inspectionsAttended > 0) out.push({ key: "attended", at: null, count: facts.inspectionsAttended });
  if (facts.tenancies > 0) out.push({ key: "tenancies", at: null, count: facts.tenancies });
  if (facts.memberSince) out.push({ key: "since", at: facts.memberSince, count: null });
  return out;
}

function validIso(value: string | null): string | null {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : null;
}

/** "12 Mar 2026", in Lagos time, the way every other date on the platform is written. */
export function factDate(at: string, locale: Locale): string {
  return formatDate(new Date(at), locale, { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" });
}

/** The value a row or a hero shows: the date if there is one, else the count, else nothing. */
export function factValue(view: FactView, locale: Locale): string | null {
  if (view.at) return factDate(view.at, locale);
  if (view.count !== null) return formatNumber(view.count, locale);
  return null;
}
