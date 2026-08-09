import "server-only";

import type { AgentContext } from "./listings-queries";
import { getOwnLadder } from "./verification-queries";

/**
 * Where this agent stands with us, in one word, for their own dashboard.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS SEPARATELY FROM THE VERIFICATION PAGE.
 *
 * `/verification` already answers this question in full: every rung, every
 * reviewer's note, what to send next. It answers it on a page nobody opens
 * unless they already suspect something is wrong.
 *
 * The dashboard is the screen an agent actually lands on, and until now it said
 * nothing at all about verification. So somebody could publish a flat, look at
 * their own listing, see no tick beside it, and have no way to learn whether
 * that meant we were still checking, whether something had failed, or whether
 * the badge simply did not exist. An absence is not a fact; the platform has
 * been caught making that mistake three times already and this was the fourth.
 *
 * ---------------------------------------------------------------------------
 * THE FIVE STANDINGS, AND WHY A FAILED RUNG OUTRANKS A PENDING APPLICATION.
 *
 * Somebody with one rejected document and an application still marked under
 * review needs to hear about the rejection today. Telling them "we are looking
 * at it" would leave them waiting on a decision that has already gone against
 * them, which is the same ordering `/verification` settled on and the reason
 * that page puts a failure above a pending state.
 *
 * `verified` returns null rather than a banner. An agent who has passed does
 * not need a permanent panel congratulating them; the tick on their listings is
 * the message, and a dashboard that keeps talking about verification after it
 * is finished is a dashboard that never stops asking for something.
 */
export type KycStanding =
  /** Nothing on file. They have not started. */
  | { state: "none" }
  /** Documents are in and nobody has decided yet. */
  | { state: "pending" }
  /** A reviewer turned a rung down. Carries their words if there are any. */
  | { state: "failed"; reason: string | null }
  /** Identity passed. No banner: the tick on their listings says it. */
  | { state: "verified" };

export async function getKycStanding(context: AgentContext): Promise<KycStanding | null> {
  if (context.state !== "agent") return null;

  const ladder = await getOwnLadder(context);
  if (ladder.state !== "ok") return null;

  /* Tier is the count of consecutive passed rungs from identity upwards, so one
     or more means a person here has looked at a government document and said
     yes. That is exactly what the listing badge now claims, and reading the
     same number here is what keeps the dashboard and the badge from ever
     telling an agent two different things. */
  if (ladder.ladder.tier >= 1) return { state: "verified" };

  const failed = Object.values(ladder.ladder.rungs).find((rung) => rung.status === "failed");
  if (failed) return { state: "failed", reason: failed.note };

  /*
   * Submitted but undecided, read from the application rather than from the
   * rungs, and that distinction matters: `agent_verification_checks` only holds
   * DECIDED rungs, so "waiting on us" and "never started" are indistinguishable
   * there. They are completely different things to say to somebody, and the
   * application's own status is the column that can tell them apart.
   */
  try {
    const { data } = await context.supabase
      .from("agent_applications")
      .select("status")
      .eq("user_id", context.user.id)
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    const status = (data as { status: string } | null)?.status;
    if (status === "SUBMITTED" || status === "UNDER_REVIEW") return { state: "pending" };
    if (status === "MORE_INFO_REQUIRED") {
      return { state: "failed", reason: "We need something else from you before we can finish." };
    }
  } catch {
    /* A read that fails is not evidence of anything. Falling through to "none"
       shows the way to start rather than inventing a state, and starting again
       is harmless for somebody who is in fact already in the queue. */
  }

  return { state: "none" };
}
