"use server";

import { revalidatePath } from "next/cache";
import { fail, ok, type ActionResult } from "../actions/envelope";
import { adminRefusal, requireAdmin } from "./guard";
import { checkNote, isUserId } from "./member-file-rules";

/**
 * A staff note on a person file.
 *
 * The insert goes through the operator's OWN client, so `public.member_notes`'
 * policies decide: only an admin or super admin may write, only as
 * themselves (`author_id = auth.uid()`), and the table's triggers stamp the
 * server's time and write the `member_note.add` audit row. Nothing here
 * writes the audit itself, so a note can never exist without its record.
 * There is no edit and no delete, in the database or here.
 */
export async function addMemberNote(input: { userId: string; body: string }): Promise<ActionResult<null>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));
  if (!isUserId(input?.userId)) return fail("That person could not be identified. Reload their page and try again.");
  const checked = checkNote(input?.body);
  if (!checked.ok) return fail(checked.error, { body: checked.error });

  const { error } = await (access.userClient as unknown as {
    from: (t: string) => { insert: (row: Record<string, unknown>) => PromiseLike<{ error: unknown }> };
  })
    .from("member_notes")
    .insert({ subject_id: input.userId, author_id: access.user.id, body: checked.body });
  if (error) return fail("The note was not saved. Nothing was changed. Try again in a moment.");

  revalidatePath(`/admin/people/${input.userId}`);
  return ok(null);
}
