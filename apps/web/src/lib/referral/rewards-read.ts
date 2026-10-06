import "server-only";

import { resolveSession } from "@/lib/actions/session";
import type { RewardsRead, WithdrawActions } from "./rewards";

/**
 * THE MEMBER'S REWARDS, READ ON THE SERVER (D51).
 *
 * ===========================================================================
 * NOT LIVE, PENDING SESSION 2. Searched 6 October on this branch and on
 * `claude/vallo-backend-money-trust`: there is no referral engine, no
 * `money_policy` table, no qualification, no rewards ledger and no payout
 * rail for rewards. So the source below answers "not-live" for every signed
 * in member and calls nothing. It does not guess at a function name, because
 * a call to a function that does not exist is an error logged on every visit.
 *
 * Requests to Session 2, raised in Session 3 C3's Round 3 report:
 *   R-C3-1  one read returning `RewardsSnapshot` (policy from `money_policy`,
 *           the three balance figures, the member's own referrals with first
 *           name, status and dates and NO reason field, the history, any
 *           running campaign, and the payout destination);
 *   R-C3-2  `WithdrawActions`: prepare a withdrawal and read the provider's
 *           fee back, then confirm the prepared one.
 *
 * When they land, replace `rewardsSource.read` and `withdrawActions`, not the
 * interface: every screen already draws all four states.
 * ===========================================================================
 */
export interface RewardsSource {
  read(): Promise<RewardsRead>;
}

export const rewardsSource: RewardsSource = {
  async read() {
    return { state: "not-live" };
  },
};

/** The withdraw flow's two server calls. Null until R-C3-2 exists, and the withdraw screen says so. */
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
