import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSession } from "../actions/session";
import { flagIsOn, NEIGHBOURS_FLAG } from "../flags/read";
import { isFlooding, isFloodClear, summarise, type Flooding, type SummaryRow } from "./pulse";

type Rpc = { rpc: (fn: string, args?: object) => Promise<{ data: unknown; error: unknown }> };

/**
 * For the "No flooding reported" filter (V-41): which of these listings pass
 * `isFloodClear`. The lister's answers in reads of 200, the residents'
 * summary once per distinct area, ten at a time. Null when the flag is off or the
 * reads fail, and the filter is then not offered.
 */
export async function floodClearFor(
  listings: { id: string; stateCode?: string | undefined; area?: string | undefined; isDemo?: boolean }[],
): Promise<Map<string, boolean> | null> {
  if (listings.length === 0 || !(await flagIsOn(NEIGHBOURS_FLAG))) return null;
  try {
    const session = await resolveSession();
    if (session.state !== "signed-in") return null;
    /* Untyped, because `flooding` is newer than the generated types; the
       select stays a plain literal so the revoked-columns guard can read it. */
    const supabase = session.supabase as unknown as SupabaseClient;
    /* Every listing on the page, 200 ids a read, so none is silently unjudged. */
    const lister = new Map<string, Flooding | null>();
    const ids = [...new Set(listings.map((l) => l.id))];
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await supabase
        .from("listings")
        .select("id, flooding")
        .in("id", ids.slice(i, i + 200));
      if (error || !data) return null;
      for (const row of data as unknown as { id: string; flooding: unknown }[]) {
        lister.set(row.id, isFlooding(row.flooding) ? row.flooding : null);
      }
    }

    const areas = new Map<string, { state: string; area: string }>();
    for (const l of listings) {
      if (l.stateCode && l.area && l.area.trim()) {
        const key = `${l.stateCode}|${l.area.trim().toLowerCase()}`;
        if (!areas.has(key)) areas.set(key, { state: l.stateCode, area: l.area.trim() });
      }
    }
    const summaries = new Map<string, ReturnType<typeof summarise>>();
    /* Every distinct area, ten calls at a time: no silent cut. */
    const all = [...areas];
    for (let i = 0; i < all.length; i += 10) {
      await Promise.all(
        all.slice(i, i + 10).map(async ([key, a]) => {
          const { data: rows, error: rpcError } = await (supabase as unknown as Rpc).rpc("area_pulse_summary", {
            p_state: a.state,
            p_area: a.area,
          });
          if (!rpcError && Array.isArray(rows)) summaries.set(key, summarise(rows as SummaryRow[]));
        }),
      );
    }

    const out = new Map<string, boolean>();
    for (const l of listings) {
      /* An example is no real home: it never passes (review). */
      if (l.isDemo) {
        out.set(l.id, false);
        continue;
      }
      const key = l.stateCode && l.area ? `${l.stateCode}|${l.area.trim().toLowerCase()}` : "";
      const flood = summaries.get(key)?.kinds.find((k) => k.kind === "flood");
      out.set(l.id, isFloodClear(lister.get(l.id), flood));
    }
    return out;
  } catch {
    return null;
  }
}
