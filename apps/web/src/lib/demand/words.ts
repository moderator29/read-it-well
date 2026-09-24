import { formatMoneyGlance, type Dictionary, type Locale } from "@vallo/i18n";
import { BUDGET_EDGES_KOBO } from "./cell";
import type { DemandRow } from "./queries";

/**
 * One demand cell in a sentence a lister reads in a second: what was looked
 * for, how often, how often it came up short, and what Vallo holds that fits.
 * Money only through `formatMoneyGlance`; the budget is a band edge, never a
 * figure anybody typed.
 */

type Copy = Dictionary["frontDoor"]["demand"];

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole));
}

export function demandWhat(row: Pick<DemandRow, "areaKey" | "market" | "bedroomsMin" | "budgetBand">, copy: Copy, locale: Locale): string {
  const rooms =
    row.bedroomsMin === null ? copy.anyRooms : row.bedroomsMin === 0 ? copy.studio : fill(copy.rooms, { count: row.bedroomsMin });
  const market = row.market === "sale" ? copy.toBuy : row.market === "rent" ? copy.toRent : copy.either;
  const edge = row.budgetBand === null ? null : BUDGET_EDGES_KOBO[row.budgetBand - 1] ?? null;
  const budget =
    row.budgetBand === null
      ? ""
      : edge === null
        ? fill(copy.budgetOver, { amount: formatMoneyGlance(BUDGET_EDGES_KOBO[BUDGET_EDGES_KOBO.length - 1]!, locale) })
        : fill(row.market === "sale" ? copy.budgetSale : copy.budgetRent, { amount: formatMoneyGlance(edge, locale) });
  return fill(copy.what, { rooms, market, area: row.areaKey, budget }).replace(/\s+,/g, ",").replace(/\s{2,}/g, " ").trim();
}

export function demandCounts(row: Pick<DemandRow, "searches" | "unmet" | "realSupply">, copy: Copy): string {
  const supply =
    row.realSupply === 0 ? copy.noneMatch : row.realSupply === 1 ? copy.oneMatches : fill(copy.manyMatch, { count: row.realSupply });
  return fill(copy.counts, { searches: row.searches, unmet: row.unmet, supply });
}
