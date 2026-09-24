import "server-only";

import { resolveSession } from "../actions/session";

/**
 * V-10: THE DEMAND BOARD'S ONE READ. Through the caller's own client, because
 * `demand_board` decides for itself who may read it (listers and staff) and
 * applies the k = 5 threshold itself. Null is "we could not read it", which
 * the panel says, distinct from an empty board, which it also says.
 */
export type DemandRow = {
  stateCode: string | null;
  areaKey: string;
  market: "rent" | "sale" | "any";
  bedroomsMin: number | null;
  budgetBand: number | null;
  searches: number;
  unmet: number;
  realSupply: number;
};

type Rpc = (fn: "demand_board", args: { p_weeks: number }) => PromiseLike<{ data: unknown; error: unknown }>;

export async function readDemandBoard(weeks = 4): Promise<DemandRow[] | null> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  try {
    const rpc = session.supabase.rpc.bind(session.supabase) as unknown as Rpc;
    const { data, error } = await rpc("demand_board", { p_weeks: weeks });
    if (error || !Array.isArray(data)) return null;
    return (data as Record<string, unknown>[]).map((row) => ({
      stateCode: typeof row.state_code === "string" ? row.state_code : null,
      areaKey: String(row.area_key ?? ""),
      market: row.market === "rent" || row.market === "sale" ? row.market : "any",
      bedroomsMin: row.bedrooms_min === null || row.bedrooms_min === undefined ? null : Number(row.bedrooms_min),
      budgetBand: row.budget_band === null || row.budget_band === undefined ? null : Number(row.budget_band),
      searches: Number(row.searches ?? 0),
      unmet: Number(row.unmet ?? 0),
      realSupply: Number(row.real_supply ?? 0),
    }));
  } catch {
    return null;
  }
}
