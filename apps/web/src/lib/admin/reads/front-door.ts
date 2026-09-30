import "server-only";

import { UNAVAILABLE, adminReader, type Read } from "./shared";

/**
 * A6 and A5. THE FRONT DOOR DESK'S READS.
 *
 * `admin_funnel_summary` (distinct visits per step, split by locale and
 * surface, plus accounts created and confirmed from auth) and
 * `admin_referral_counts` (confirmed sign-ups by invite code). Both are
 * admin-only definers in the pending migrations; until they are applied the
 * calls fail and the desk says the data is not there yet, rather than zero.
 */
export type FunnelRow = { step: string; locale: string | null; surface: string | null; visits: number };
export type ReferralRow = { code: string; firstName: string | null; confirmed: number };

type Rpc = (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;

export async function getFunnel(days: 7 | 30): Promise<Read<FunnelRow[]>> {
  const db = await adminReader();
  if (!db) return UNAVAILABLE;
  try {
    const { data, error } = await (db.rpc as unknown as Rpc)("admin_funnel_summary", { p_days: days });
    if (error || !Array.isArray(data)) return UNAVAILABLE;
    return {
      state: "ok",
      data: (data as { step: string; locale: string | null; surface: string | null; visits: number | string }[]).map((r) => ({
        step: r.step,
        locale: r.locale,
        surface: r.surface,
        visits: Number(r.visits),
      })),
    };
  } catch {
    return UNAVAILABLE;
  }
}

export async function getReferralCounts(days: number): Promise<Read<ReferralRow[]>> {
  const db = await adminReader();
  if (!db) return UNAVAILABLE;
  try {
    const { data, error } = await (db.rpc as unknown as Rpc)("admin_referral_counts", { p_days: days });
    if (error || !Array.isArray(data)) return UNAVAILABLE;
    return {
      state: "ok",
      data: (data as { code: string; first_name: string | null; confirmed: number | string }[]).map((r) => ({
        code: r.code,
        firstName: r.first_name,
        confirmed: Number(r.confirmed),
      })),
    };
  } catch {
    return UNAVAILABLE;
  }
}
