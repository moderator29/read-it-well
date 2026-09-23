import "server-only";

/**
 * THE ONE FLAG: report storage exists. Request I1 was applied on 23 September
 * (migration 20260923135847: the three tables, their RLS, the private
 * `inspection-photos` bucket and the completion trigger, confirmed read-only
 * on production the same day), so the flag is ON. Setting
 * `VALLO_INSPECTION_REPORTS=0` in the environment turns the report back off
 * in one place without a code change: the rows then draw, are not tickable,
 * and nothing claims to have been saved.
 */
export function reportStorageLive(env: Record<string, string | undefined> = process.env): boolean {
  return env.VALLO_INSPECTION_REPORTS !== "0";
}
