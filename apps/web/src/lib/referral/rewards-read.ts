import "server-only";

import { resolveSession } from "@/lib/actions/session";
import { createClient } from "@/lib/supabase/server";
import { reportReadError } from "@/lib/observability/read-error";
import type { RewardsRead, WithdrawActions } from "./rewards";
import { snapshotFrom } from "./rewards-snapshot";

/**
 * THE MEMBER'S REWARDS, READ ON THE SERVER (D51, D62, D85).
 *
 * Four reads through the member's own RLS-bound client, each answering only
 * for the signed-in member, assembled by `snapshotFrom` (pure, tested):
 *
 *   my_rewards_summary()     the live campaign's terms, the programme, the
 *                            figures, the minimum, whether withdrawals open
 *   my_referral_progress()   where each invited person stands, in member
 *                            words (pending migration
 *                            d85_referral_signup_80_invite_and_earn)
 *   rewards_ledger           the member's own entries (column grants: no
 *                            actor, no idempotency key)
 *   rewards_payouts          the member's own payouts (column grants: no
 *                            bank code, recipient or risk signal)
 *
 * The summary is the one read that must answer: without it there are no
 * figures to draw and the read is "failed", never a zero balance. The other
 * three fail soft to empty lists, so a missing progress function (the D85
 * migration not applied yet) still draws the balance.
 */
export interface RewardsSource {
  read(): Promise<RewardsRead>;
}

type Rpc = (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
type Select = {
  from: (table: string) => {
    select: (columns: string) => {
      order: (column: string, opts: { ascending: boolean }) => { limit: (n: number) => PromiseLike<{ data: unknown; error: unknown }> };
    };
  };
};

const list = (res: { data: unknown; error: unknown }): unknown[] => (!res.error && Array.isArray(res.data) ? res.data : []);

export const rewardsSource: RewardsSource = {
  async read() {
    const supabase = await createClient();
    const rpc = supabase.rpc.bind(supabase) as unknown as Rpc;
    const db = supabase as unknown as Select;
    const [summary, progress, ledger, payouts] = await Promise.all([
      rpc("my_rewards_summary"),
      rpc("my_referral_progress", { p_limit: 200 }),
      db.from("rewards_ledger").select("id, kind, amount_minor, referral_id, payout_id, created_at").order("created_at", { ascending: false }).limit(1000),
      db.from("rewards_payouts").select("id, amount_minor, status, created_at, settled_at").order("created_at", { ascending: false }).limit(200),
    ]);
    /* Every refusal is reported; the progress read missing because the D85
       migration is not applied yet (PGRST202) is expected and stays quiet. */
    const progressError = (progress.error as { code?: unknown } | null)?.code === "PGRST202" ? null : progress.error;
    await reportReadError("read.rewards.readMyRewards", summary.error, progressError, ledger.error, payouts.error);
    if (summary.error) return { state: "failed" };
    const snapshot = snapshotFrom({ summary: summary.data, progress: list(progress), ledger: list(ledger), payouts: list(payouts) });
    return snapshot ? { state: "ready", snapshot } : { state: "failed" };
  },
};

/**
 * The quote-and-confirm withdraw flow (`WithdrawFlow`) has no provider behind
 * it: the payout path that exists is `requestRewardsPayout`
 * (`lib/payouts/referral-payout.ts`), which the withdraw page uses through
 * `RewardsPayoutForm` once withdrawals are open. Kept null so nothing offers
 * a fee quote the provider never gave.
 */
export const withdrawActions: WithdrawActions | null = null;

/** The read every rewards route calls. Signed out is answered here; a throw is a failed read, never a crash. */
export async function readMyRewards(source: RewardsSource = rewardsSource): Promise<RewardsRead> {
  try {
    if ((await resolveSession()).state !== "signed-in") return { state: "signed-out" };
    return await source.read();
  } catch {
    return { state: "failed" };
  }
}
