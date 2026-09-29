import "server-only";

import { requireAdmin } from "../guard";

/**
 * THE BADGE TIER, READ AND NEVER DERIVED. `public.person_badge` (commit
 * 5f19539b) is the one source: `{ user_id, tier }`, tier being gold or
 * platinum, precedence decided once in `public.badge_tier`. This reads it for
 * the people a desk draws and returns only what it says. A failed read returns
 * no tiers: a missing badge is recoverable, a wrong one is not.
 *
 * The view is not in the generated types yet, so it goes through one narrow
 * untyped door.
 */
export type BadgeTier = "gold" | "platinum";

type Untyped = {
  from(table: string): {
    select(columns: string): { in(column: string, values: string[]): PromiseLike<{ data: unknown[] | null; error: unknown }> };
  };
};

/** Rows of `person_badge` into a map of the tiers it states. Pure, for the test. */
export function tiersFromRows(rows: readonly unknown[]): Record<string, BadgeTier> {
  const out: Record<string, BadgeTier> = {};
  for (const row of rows) {
    const r = row as Record<string, unknown>;
    const id = typeof r.user_id === "string" ? r.user_id : null;
    const tier = r.tier === "gold" || r.tier === "platinum" ? r.tier : null;
    if (id && tier) out[id] = tier;
  }
  return out;
}

export async function getBadgeTiers(userIds: readonly (string | null | undefined)[]): Promise<Record<string, BadgeTier>> {
  const ids = [...new Set(userIds.filter((x): x is string => typeof x === "string" && x.length > 0))];
  if (ids.length === 0) return {};
  const access = await requireAdmin("operations");
  if (access.state !== "admin") return {};
  const db = access.supabase as unknown as Untyped;
  try {
    const out: Record<string, BadgeTier> = {};
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await db.from("person_badge").select("user_id, tier").in("user_id", ids.slice(i, i + 200));
      if (error) return {};
      Object.assign(out, tiersFromRows(data ?? []));
    }
    return out;
  } catch {
    return {};
  }
}
