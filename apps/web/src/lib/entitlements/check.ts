/**
 * ENTITLEMENTS (handoff 7.13, D3). The one check every gated feature calls.
 *
 * Plans and their features are dated rows (`public.entitlement_plans`,
 * `public.entitlement_plan_features`); the answer comes from
 * `public.entitlement_check`, which takes the member's own plan in force or
 * else the default plan. Today the default ('free') grants everything that
 * is free today and none of the paid keys. FAILS CLOSED: an unknown key, an
 * error or an unreadable answer is `false`.
 */

export const FEATURE_KEYS = [
  "listing_create",
  "listing_analytics",
  "saved_search_alerts",
  "team_members",
  "listing_boost",
  "listing_spotlight",
  "listing_featured",
  "listing_prime",
  "business_pro",
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export function isFeatureKey(value: string): value is FeatureKey {
  return (FEATURE_KEYS as readonly string[]).includes(value);
}

type RpcCaller = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
};

export async function hasEntitlement(db: RpcCaller, userId: string, feature: FeatureKey): Promise<boolean> {
  if (!isFeatureKey(feature) || !userId) return false;
  try {
    const { data, error } = await db.rpc("entitlement_check", { p_user: userId, p_feature: feature });
    return !error && data === true;
  } catch {
    return false;
  }
}
