"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { STAFF_SCOPES } from "./guard";

/**
 * Adds an internal note about a member. The database decides everything that
 * matters (staff only, never about yourself, a restriction only to a scope you
 * hold, append-only, audited); this only words its answer.
 */
const WORDS: Record<string, string> = {
  forbidden: "Only Vallo staff who have acknowledged the handbook can write notes.",
  no_such_member: "That account no longer exists.",
  own_account: "You cannot write a note about your own account.",
  length: "Write between 3 and 2,000 characters.",
  invalid_scope: "You can only restrict a note to a desk you hold.",
};

export async function addMemberNote(input: {
  subjectId: string;
  body: string;
  scope?: string | null;
  /** The page to refresh afterwards (a console path). */
  path: string;
}): Promise<ActionResult<null>> {
  const parsed = validate(
    z.object({
      subjectId: z.string().uuid(),
      body: z.string().trim().min(3, WORDS.length!).max(2000, WORDS.length!),
      scope: z.enum(STAFF_SCOPES).nullable().optional(),
      path: z.string().regex(/^\/admin(\/[A-Za-z0-9/_-]*)?$/),
    }),
    input,
  );
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  const { data, error } = await (session.supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
  }).rpc("staff_add_member_note", {
    p_subject: parsed.data.subjectId,
    p_body: parsed.data.body,
    p_scope: parsed.data.scope ?? null,
  });
  if (error) return fail("That note did not save. Try again.");
  const status = String((data as { status?: unknown } | null)?.status ?? "");
  if (status !== "ok") return fail(WORDS[status] ?? "That note did not save. Try again.");
  revalidatePath(parsed.data.path);
  return ok(null);
}
