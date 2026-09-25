"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { findUserByEmail } from "../supabase/service";
import { STAFF_SCOPES } from "./guard";
import { STAFF_HANDBOOK_VERSION } from "./staff-handbook";

/**
 * TRACK K: THE STAFF DOORS.
 *
 * All three call a database function with the caller's OWN client, so the
 * function decides on auth.uid() and never on anything this file passes:
 * only a super admin can grant or revoke (`admin_grant_staff`,
 * `admin_revoke_staff`), and a person can only acknowledge the handbook for
 * themselves. The app adds nothing to that authority; it only words the
 * answers.
 */

const WORDS: Record<string, string> = {
  forbidden: "Only the founder's super admin account can change staff access.",
  invalid_target: "Pick somebody other than yourself.",
  no_such_user: "No account uses that email address.",
  already_admin: "That account is already an admin, which covers every desk.",
  invalid_scope: "One of the access areas is not recognised. Refresh and try again.",
  no_scopes: "Choose at least one access area.",
  reason_needed: "Say why access is ending, in at least five characters. The person reads it.",
  not_staff: "That account holds no staff access.",
  stale_version: "The handbook changed while you were reading. Refresh and read it again.",
  signed_out: SIGNED_OUT_MESSAGE,
};

async function callerClient() {
  const session = await resolveSession();
  if (session.state === "unconfigured") return { error: NOT_CONFIGURED_MESSAGE } as const;
  if (session.state === "signed-out") return { error: SIGNED_OUT_MESSAGE } as const;
  return { session } as const;
}

function statusOf(data: unknown): string {
  return String((data as Record<string, unknown> | null)?.status ?? "");
}

export async function acknowledgeHandbook(input: { version: string }): Promise<ActionResult<null>> {
  const parsed = validate(z.object({ version: z.string().max(20) }), input);
  if (!parsed.ok) return fail(parsed.error);
  if (parsed.data.version !== STAFF_HANDBOOK_VERSION) return fail(WORDS.stale_version!);
  const c = await callerClient();
  if (c.error !== undefined) return fail(c.error);
  const { data, error } = await c.session.supabase.rpc("staff_acknowledge_handbook" as never, {
    p_version: parsed.data.version,
  } as never);
  if (error) return fail("That did not go through. Try again in a moment.");
  const status = statusOf(data);
  if (status !== "ok") return fail(WORDS[status] ?? "That did not go through.");
  revalidatePath("/admin", "layout");
  return ok(null);
}

export async function grantStaff(input: {
  email: string;
  scopes: string[];
  note?: string;
}): Promise<ActionResult<{ scopes: string[] }>> {
  const parsed = validate(
    z.object({
      email: z.string().trim().email("Enter the email address on their Vallo account."),
      scopes: z.array(z.enum(STAFF_SCOPES)).min(1, "Choose at least one access area."),
      note: z.string().trim().max(500).optional(),
    }),
    input,
  );
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const c = await callerClient();
  if (c.error !== undefined) return fail(c.error);
  const target = await findUserByEmail(parsed.data.email);
  if (!target) return fail(WORDS.no_such_user!, { email: WORDS.no_such_user! });
  const { data, error } = await c.session.supabase.rpc("admin_grant_staff" as never, {
    p_user: target.id,
    p_scopes: parsed.data.scopes,
    p_note: parsed.data.note ?? null,
  } as never);
  if (error) return fail("That did not go through. Nothing changed. Try again.");
  const status = statusOf(data);
  if (status !== "ok") return fail(WORDS[status] ?? "That did not go through.");
  revalidatePath("/admin/staff");
  return ok({ scopes: parsed.data.scopes });
}

export async function revokeStaff(input: { userId: string; reason: string }): Promise<ActionResult<null>> {
  const parsed = validate(
    z.object({ userId: z.string().uuid(), reason: z.string().trim().min(5, WORDS.reason_needed!).max(500) }),
    input,
  );
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const c = await callerClient();
  if (c.error !== undefined) return fail(c.error);
  const { data, error } = await c.session.supabase.rpc("admin_revoke_staff" as never, {
    p_user: parsed.data.userId,
    p_reason: parsed.data.reason,
  } as never);
  if (error) return fail("That did not go through. Nothing changed. Try again.");
  const status = statusOf(data);
  if (status !== "ok") return fail(WORDS[status] ?? "That did not go through.");
  revalidatePath("/admin/staff");
  return ok(null);
}
