import { findNeighbourhood } from "../places/neighbourhoods";

/**
 * V-10: A SEARCH, REDUCED TO A CELL. What a renter asked for, stripped of
 * everything that could say who asked.
 *
 * A cell is a state, a neighbourhood from the closed list (the typed words
 * are read and thrown away), to let or for sale, a bedroom minimum capped at
 * five, a budget BAND and whether the search found fewer than three. The
 * database adds the week and nothing else. A search that names no place, no
 * rooms and no budget is not demand for anything and produces no cell.
 */

export type DemandCell = {
  stateCode: string | null;
  areaKey: string | null;
  market: "rent" | "sale" | "any";
  bedroomsMin: number | null;
  budgetBand: number | null;
  results: number;
};

/** Band edges in kobo: up to N1m, N2m, N3.5m, N5m, N10m, then above. */
export const BUDGET_EDGES_KOBO: readonly number[] = [100_000_000, 200_000_000, 350_000_000, 500_000_000, 1_000_000_000];

export function budgetBand(maxMinor: number | undefined | null): number | null {
  if (maxMinor === undefined || maxMinor === null || !Number.isFinite(maxMinor) || maxMinor <= 0) return null;
  const index = BUDGET_EDGES_KOBO.findIndex((edge) => maxMinor <= edge);
  return index === -1 ? 6 : index + 1;
}

export function demandCell(input: {
  q?: string | undefined;
  intent?: "rent" | "sale" | undefined;
  bedrooms?: number | undefined;
  maxMinor?: number | undefined;
  results: number;
}): DemandCell | null {
  const place = input.q ? findNeighbourhood(input.q) : null;
  const cell: DemandCell = {
    stateCode: place?.stateCode ?? null,
    areaKey: place?.area ?? null,
    market: input.intent ?? "any",
    bedroomsMin: input.bedrooms === undefined ? null : Math.min(5, Math.max(0, Math.trunc(input.bedrooms))),
    budgetBand: budgetBand(input.maxMinor),
    results: Math.max(0, Math.trunc(input.results)),
  };
  if (cell.areaKey === null && cell.bedroomsMin === null && cell.budgetBand === null) return null;
  return cell;
}

/** The tab-local key that stops one search being counted twice in a session. */
export function cellKey(cell: DemandCell): string {
  return [cell.stateCode, cell.areaKey, cell.market, cell.bedroomsMin, cell.budgetBand].join("|");
}
