import "server-only";

/**
 * Where an agent stands on the verification ladder, read by the agent.
 *
 * The mirror of `lib/admin/verification-queries.ts`, and the half that was
 * missing. The table has carried an `agent_verification_checks_select_own`
 * policy since it was created, so a host has always been allowed to read their
 * own rungs; nothing ever asked. An admin could move somebody up the one ladder
 * that decides how much of the platform they can use, and the only way the host
 * found out was somebody telling them over the phone.
 *
 * Read through the caller's own RLS-bound client, never the service role. The
 * policy is the whole access rule, so this file does not restate it and cannot
 * drift from it: a bug here fails closed rather than showing one agent another
 * agent's identity checks.
 *
 * The tier is taken from `agents.verification_tier` rather than recomputed from
 * the rows. `private.agent_tier` owns that arithmetic, including the part that
 * is easy to get wrong: the tier is the count of rungs passed with NO GAP below
 * them, so a passed in-person check sitting above a missing identity check
 * promotes nobody. Deriving it a second time here would be a second
 * implementation of a rule that has to agree with the badge on every listing.
 */

import type { AgentContext } from "./listings-queries";
import {
  asTier,
  VERIFICATION_RUNGS,
  type VerificationRung,
  type VerificationTier,
} from "../trust/verification";

/** One rung, as the agent who was judged on it sees it. */
export type OwnRung = {
  kind: VerificationRung;
  status: "passed" | "failed";
  /**
   * What the reviewer wrote. Shown to the agent in full.
   *
   * This is the single most useful field on the page and the reason the phone
   * call happened: a failed rung with a reason is something a host can act on
   * this afternoon, and a failed rung without one is a locked door.
   */
  note: string | null;
  decidedAt: string;
};

export type OwnLadder = {
  tier: VerificationTier;
  /** Every rung that has a decision. A rung nobody has looked at is absent. */
  rungs: Partial<Record<VerificationRung, OwnRung>>;
};

export type OwnLadderRead =
  | { state: "ok"; ladder: OwnLadder }
  /** Not an agent, not configured, or the read failed. The page says so. */
  | { state: "unavailable" };

function isRung(value: string): value is VerificationRung {
  return (VERIFICATION_RUNGS as readonly string[]).includes(value);
}

export async function getOwnLadder(context: AgentContext): Promise<OwnLadderRead> {
  if (context.state !== "agent") return { state: "unavailable" };

  try {
    const { data, error } = await context.supabase
      .from("agent_verification_checks")
      .select("kind, status, note, decided_at")
      .eq("agent_id", context.agent.id);

    if (error) return { state: "unavailable" };

    const rungs: Partial<Record<VerificationRung, OwnRung>> = {};
    for (const row of data ?? []) {
      const record = row as {
        kind: string;
        status: string;
        note: string | null;
        decided_at: string;
      };
      // A kind or status the check constraints do not allow cannot arrive from
      // the database, so anything unrecognised means the vocabulary here and the
      // vocabulary there have diverged. Skipped rather than rendered, because a
      // rung this page cannot describe is one it must not claim to explain.
      if (!isRung(record.kind)) continue;
      if (record.status !== "passed" && record.status !== "failed") continue;

      rungs[record.kind] = {
        kind: record.kind,
        status: record.status,
        note: record.note,
        decidedAt: record.decided_at,
      };
    }

    return {
      state: "ok",
      ladder: { tier: asTier(context.agent.verificationTier), rungs },
    };
  } catch {
    return { state: "unavailable" };
  }
}
