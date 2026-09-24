import "server-only";

import { resolveSession } from "../actions/session";
import { flagIsOn, NEIGHBOURS_FLAG } from "../flags/read";
import { isFlooding, isFloodClear, summarise, type Flooding, type SummaryRow } from "./pulse";

type Rpc = { rpc: (fn: string, args?: object) => Promise<{ data: unknown; error: unknown }> };

/**
 * For the "No flooding reported" filter (V-41): which of these listings pass
 * `isFloodClear`. The lister's answers in one read, the residents' summary
 * once per distinct area (thirty at most). Null when the flag is off or the
 * reads fail, and the filter is then not offered.
 */
export async function floodClearFor(
  listings: { id: string; stateCode?: string | undefined; area?: string | undefined }[],
): Promise<Map<string, boolean> | null> {
  if (listings.length === 0 || !(await flagIsOn(NEIGHBOURS_FLAG))) return null;
  try {
    const session = await resolveSession();
    if (session.state !== "signed-in") return null;
    const supabase = session.supabase;
    const { data, error } = await supabase
      .from("listings")
      .select("id, flooding" as never)
      .in("id", listings.map((l) => l.id).slice(0, 500));
    if (error || !data) return null;
    const lister = new Map<string, Flooding | null>();
    for (const row of data as unknown as { id: string; flooding: unknown }[]) {
      lister.set(row.id, isFlooding(row.flooding) ? row.flooding : null);
    }

    const areas = new Map<string, { state: string; area: string }>();
    for (const l of listings) {
      if (l.stateCode && l.area && l.area.trim()) {
        const key = `${l.stateCode}|${l.area.trim().toLowerCase()}`;
        if (!areas.has(key)) areas.set(key, { state: l.stateCode, area: l.area.trim() });
      }
    }
    const summaries = new Map<string, ReturnType<typeof summarise>>();
    await Promise.all(
      [...areas].slice(0, 30).map(async ([key, a]) => {
        const { data: rows, error: rpcError } = await (supabase as unknown as Rpc).rpc("area_pulse_summary", {
          p_state: a.state,
          p_area: a.area,
        });
        if (!rpcError && Array.isArray(rows)) summaries.set(key, summarise(rows as SummaryRow[]));
      }),
    );

    const out = new Map<string, boolean>();
    for (const l of listings) {
      const key = l.stateCode && l.area ? `${l.stateCode}|${l.area.trim().toLowerCase()}` : "";
      const flood = summaries.get(key)?.kinds.find((k) => k.kind === "flood");
      out.set(l.id, isFloodClear(lister.get(l.id), flood));
    }
    return out;
  } catch {
    return null;
  }
}
