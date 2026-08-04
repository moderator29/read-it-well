"use server";

/**
 * Releasing and removing what the scanner is holding.
 *
 * Four kinds of held thing, two decisions each: let it through, or take it
 * down. Both are ordinary updates on the row's `status` column, and every one
 * of them goes through the admin's own RLS-bound client, so Postgres re-checks
 * the role on each mutation rather than trusting a page that already checked.
 *
 * Notifications are NOT written here. Every one of these four transitions
 * already fans out from a database trigger, which is the right place for it:
 * the notification then follows the row wherever it is changed from, including
 * from SQL at three in the morning, rather than following one code path.
 *
 * The audit line is the only thing the service role does, because the audit log
 * has no insert policy for anybody, deliberately: history that an admin can
 * rewrite proves nothing. It is best effort, and it is written after the
 * decision has already committed, so a failed log line cannot turn a completed
 * removal into an error the operator cannot act on.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { writeAudit } from "./audit";
import { adminRefusal, requireAdmin } from "./guard";
import { createAdminClient } from "../supabase/admin";

const SERVICE_DOWN =
  "The console could not reach the platform data just now. Nothing was changed. Please try again.";
const GONE = "That record is no longer held. Refresh the queue to see the current state.";

export type ModerationTarget = "post" | "story" | "comment" | "bio";
export type ModerationDecision = "RELEASE" | "REMOVE";

const decideSchema = z.object({
  target: z.enum(["post", "story", "comment", "bio"]),
  id: z.string().uuid("That record id is not one we recognise."),
  decision: z.enum(["RELEASE", "REMOVE"]),
  reason: z
    .string()
    .trim()
    .max(400, "Keep the reason under 400 characters.")
    .optional()
    .or(z.literal("")),
});

/**
 * A removal has to say why.
 *
 * The reason is written onto the row and the notification trigger reads it
 * straight back to the author, so this is not paperwork: it is the sentence the
 * person is going to be shown. A takedown with no explanation is the thing that
 * makes people believe a platform is arbitrary.
 */
const REASON_REQUIRED = "Say why this is coming down. The author is shown exactly what you write.";

export async function decideHeldItem(input: {
  target: ModerationTarget;
  id: string;
  decision: ModerationDecision;
  reason?: string;
}): Promise<ActionResult<null>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));

  const parsed = validate(decideSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { target, id, decision } = parsed.data;
  const reason = (parsed.data.reason ?? "").trim();

  if (decision === "REMOVE" && reason.length === 0) {
    return fail(REASON_REQUIRED, { reason: REASON_REQUIRED });
  }

  const status = decision === "RELEASE" ? "LIVE" : "REMOVED";

  try {
    if (target === "bio") {
      // A bio has no hold_reason column: the words themselves are the record,
      // and a removed bio is emptied rather than kept out of sight, because a
      // profile is not a thread and there is nothing to preserve context for.
      const { data, error } = await access.supabase
        .from("social_profiles")
        .update(
          decision === "RELEASE"
            ? { bio_status: "LIVE" }
            : { bio_status: "REMOVED", bio: null },
        )
        .eq("user_id", id)
        .eq("bio_status", "HELD")
        .select("user_id")
        .maybeSingle();

      if (error) return fail(SERVICE_DOWN);
      if (!data) return fail(GONE);
    } else if (target === "post") {
      const { data, error } = await access.supabase
        .from("posts")
        .update({
          status,
          ...(decision === "REMOVE"
            ? { hold_reason: reason, hidden_by: access.user.id, removed_at: new Date().toISOString() }
            : { hold_reason: null, hidden_by: null }),
        })
        .eq("id", id)
        .eq("status", "HELD")
        .select("id")
        .maybeSingle();

      if (error) return fail(SERVICE_DOWN);
      if (!data) return fail(GONE);
    } else if (target === "story") {
      const { data, error } = await access.supabase
        .from("stories")
        .update({
          status,
          ...(decision === "REMOVE"
            ? { hold_reason: reason, hidden_by: access.user.id, removed_at: new Date().toISOString() }
            : { hold_reason: null, hidden_by: null }),
        })
        .eq("id", id)
        .eq("status", "HELD")
        .select("id")
        .maybeSingle();

      if (error) return fail(SERVICE_DOWN);
      if (!data) return fail(GONE);
    } else {
      const { data, error } = await access.supabase
        .from("story_comments")
        .update({
          status,
          ...(decision === "REMOVE" ? { hold_reason: reason } : { hold_reason: null }),
        })
        .eq("id", id)
        .eq("status", "HELD")
        .select("id")
        .maybeSingle();

      if (error) return fail(SERVICE_DOWN);
      if (!data) return fail(GONE);
    }
  } catch {
    return fail(SERVICE_DOWN);
  }

  try {
    await writeAudit(createAdminClient(), {
      actorId: access.user.id,
      action: decision === "RELEASE" ? "moderation.release" : "moderation.remove",
      entityType: target,
      entityId: id,
      detail: { decision, reason: reason.length > 0 ? reason : null },
    });
  } catch {
    // Best effort. The decision has already committed; see the note above.
  }

  revalidatePath("/admin/moderation");
  revalidatePath("/admin");
  return ok(null);
}
