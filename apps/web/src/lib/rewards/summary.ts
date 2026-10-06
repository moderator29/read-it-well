/** The Rewards Balance summary as the screens use it. Pure. */

export type RewardsSummary = {
  balanceMinor: number;
  availableMinor: number;
  onHoldMinor: number;
  processingMinor: number;
  paidMinor: number;
  pendingCount: number;
  underReviewCount: number;
  qualifiedThisMonth: number;
  rewardMinor: number | null;
  memberMonthlyCap: number | null;
  withdrawalMinMinor: number | null;
};

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : typeof v === "string" && v !== "" ? Number(v) : 0;
  return Number.isFinite(n) ? n : 0;
};
const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : num(v));

export function toRewardsSummary(raw: unknown): RewardsSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const balance = num(r.balance_minor);
  return {
    balanceMinor: balance,
    // What can be withdrawn never exceeds what the ledger says is owed.
    availableMinor: Math.max(0, Math.min(num(r.available_minor), balance)),
    onHoldMinor: num(r.on_hold_minor),
    processingMinor: num(r.processing_minor),
    paidMinor: num(r.paid_minor),
    pendingCount: num(r.pending_count),
    underReviewCount: num(r.under_review_count),
    qualifiedThisMonth: num(r.qualified_this_month),
    rewardMinor: numOrNull(r.reward_minor),
    memberMonthlyCap: numOrNull(r.member_monthly_cap),
    withdrawalMinMinor: numOrNull(r.withdrawal_min_minor),
  };
}

/** Whether the withdraw button may be offered. */
export function canWithdraw(s: RewardsSummary): boolean {
  return s.withdrawalMinMinor !== null && s.availableMinor >= s.withdrawalMinMinor && s.processingMinor === 0;
}
