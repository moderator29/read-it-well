"use server";

/**
 * The staff hand on a review contest: keep the review, or hide it behind a
 * public note. It runs `public.decide_review_contest` through the operator's
 * own RLS-bound client, so the database re-checks the moderation scope and
 * the conflict of interest, closes the contest and its report together, and
 * tells the lister and the reviewer. Nothing is ever deleted: a hidden review
 * keeps its row and stops counting toward the rating.
 *
 * The audit row is written with the service-role client, the one extra hand
 * the console keeps for the append-only log (lib/admin/actions.ts).
 */
import { revalidatePath } from "next/cache";
import { fail, ok, type ActionResult } from "../actions/envelope";
import { createAdminClient } from "../supabase/admin";
import { writeAudit } from "./audit";
import { adminRefusal, requireAdmin } from "./guard";
import {
  CONTEST_SERVICE_DOWN,
  checkContestDecision,
  contestRefusal,
  type ContestDecisionInput,
} from "./review-contest-decision";

type Rpc = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
};

export async function decideReviewContest(input: ContestDecisionInput): Promise<ActionResult<null>> {
  const access = await requireAdmin("moderation");
  if (access.state !== "admin") return fail(adminRefusal(access));

  const checked = checkContestDecision(input);
  if (!checked.ok) return fail(checked.error, checked.fieldErrors);
  const { contestId, outcome, publicNote } = checked.data;

  /* The function is newer than the generated types, so it is called
     untyped; its answer is read as data, never trusted as a shape. */
  const db = access.supabase as unknown as Rpc;
  const { data, error } = await db.rpc("decide_review_contest", {
    p_contest: contestId,
    p_outcome: outcome,
    p_public_note: publicNote,
  });
  if (error) return fail(CONTEST_SERVICE_DOWN);
  const status = (data as { status?: unknown } | null)?.status;
  const refusal = contestRefusal(status);
  if (refusal) return fail(refusal);

  try {
    await writeAudit(createAdminClient(), {
      actorId: access.user.id,
      action: "review_contest.decide",
      entityType: "review_contest",
      entityId: contestId,
      detail: { outcome, public_note: publicNote },
    });
  } catch {
    // Best effort, as every console decision: the decision itself stands.
  }

  revalidatePath("/admin/queue");
  revalidatePath("/admin");
  return ok(null);
}
