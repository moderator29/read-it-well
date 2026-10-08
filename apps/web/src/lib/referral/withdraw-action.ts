"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/envelope";
import { requestRewardsPayout, type RewardsPayoutResult } from "@/lib/payouts/referral-payout";

/**
 * THE WITHDRAW FORM'S ONE CALL (D51, D85): the existing Rewards Balance payout
 * path, `requestRewardsPayout`, which resolves the account name with the
 * bank, opens the payout against the append-only ledger (whole referrals, the
 * withdrawal minimum, risk routing), and sends it from the marketing float. It
 * refuses with "not available" while `referral_policy.payouts_enabled` is off
 * or the float key is missing, so this form being reachable can never move
 * money on its own.
 */
export async function withdrawRewards(input: { bankCode: string; accountNumber: string }): Promise<ActionResult<RewardsPayoutResult>> {
  const result = await requestRewardsPayout(input);
  if (result.ok) {
    revalidatePath("/rewards");
    revalidatePath("/rewards/history");
  }
  return result;
}
