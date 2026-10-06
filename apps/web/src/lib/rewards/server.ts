import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isReferralStatus, type ReferralStatus } from "../referral/lifecycle";
import { toRewardsSummary, type RewardsSummary } from "./summary";

/**
 * THE MEMBER'S REWARDS BALANCE, READ (D51). Never called a wallet.
 *
 * Both reads go through security-definer functions in
 * `b4_referral_rewards_engine.sql` that answer only for the signed-in member;
 * neither names who was referred beyond a first name. Null or empty when
 * signed out or when the migration is not applied yet.
 */

type Rpc = (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;

export async function myRewardsSummary(): Promise<RewardsSummary | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase.rpc as unknown as Rpc)("my_rewards_summary");
    return error ? null : toRewardsSummary(data);
  } catch {
    return null;
  }
}

export type MyReferral = {
  id: string;
  status: ReferralStatus;
  firstName: string | null;
  rewardMinor: number | null;
  attributedAt: string;
  qualifiedAt: string | null;
};

export async function myReferrals(limit = 50): Promise<MyReferral[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase.rpc as unknown as Rpc)("my_referrals", { p_limit: limit });
    if (error || !Array.isArray(data)) return [];
    return (data as Record<string, unknown>[])
      .filter((r) => isReferralStatus(r.status))
      .map((r) => ({
        id: String(r.id),
        status: r.status as ReferralStatus,
        firstName: typeof r.first_name === "string" ? r.first_name.slice(0, 40) : null,
        rewardMinor: typeof r.reward_minor === "number" ? r.reward_minor : null,
        attributedAt: String(r.attributed_at),
        qualifiedAt: typeof r.qualified_at === "string" ? r.qualified_at : null,
      }));
  } catch {
    return [];
  }
}
