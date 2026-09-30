"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { findUserByEmail } from "../supabase/service";
import { isNotInstalled } from "./support-queue";

/**
 * The staff page's two new controls (C10 and C14), both on the caller's own
 * client so the database decides who may: a super admin only, and never on
 * themselves. Each says plainly when its pending migration is not installed
 * yet, and nothing changes.
 */

const WORDS: Record<string, string> = {
  forbidden: "Only a super admin can do this.",
  invalid_target: "Pick somebody other than yourself. A second super admin clears your keys.",
  reason_required: "Say why, in at least ten characters. It goes in the audit log.",
  not_staff: "That person is not on the staff, so they have no console key to clear.",
  signed_out: SIGNED_OUT_MESSAGE,
};

async function caller() {
  const session = await resolveSession();
  if (session.state === "unconfigured") return { error: NOT_CONFIGURED_MESSAGE } as const;
  if (session.state === "signed-out") return { error: SIGNED_OUT_MESSAGE } as const;
  return { session } as const;
}

function statusOf(data: unknown): string {
  return String((data as Record<string, unknown> | null)?.status ?? "");
}

/** C14 break-glass: clear a person's console keys so they enrol a new one at their next visit. */
export async function clearConsoleKeys(input: { userId: string; reason: string }): Promise<ActionResult<{ removed: number }>> {
  const parsed = validate(
    z.object({ userId: z.string().uuid(), reason: z.string().trim().min(10, WORDS.reason_required!).max(500) }),
    input,
  );
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const c = await caller();
  if (c.error !== undefined) return fail(c.error);
  const { data, error } = await c.session.supabase.rpc("admin_clear_console_keys" as never, {
    p_user: parsed.data.userId,
    p_reason: parsed.data.reason,
  } as never);
  if (error) {
    return fail(
      isNotInstalled(error)
        ? "Clearing keys is not switched on yet: its database change is waiting to be applied. Nothing changed."
        : "That did not go through. Nothing changed. Try again.",
    );
  }
  const status = statusOf(data);
  if (status !== "ok") return fail(WORDS[status] ?? "That did not go through.");
  revalidatePath("/admin/staff");
  return ok({ removed: Number((data as { keys_removed?: unknown }).keys_removed) || 0 });
}

/** C10: leave a person out of every figure, or bring them back. */
export async function setInternalAccount(input: { userId: string; internal: boolean; reason: string }): Promise<ActionResult<null>> {
  const parsed = validate(
    z.object({ userId: z.string().uuid(), internal: z.boolean(), reason: z.string().trim().max(200) }),
    input,
  );
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const c = await caller();
  if (c.error !== undefined) return fail(c.error);
  const { data, error } = await c.session.supabase.rpc("admin_set_internal" as never, {
    p_user: parsed.data.userId,
    p_internal: parsed.data.internal,
    p_reason: parsed.data.reason,
  } as never);
  if (error) {
    return fail(
      isNotInstalled(error)
        ? "This switch is not on yet: its database change is waiting to be applied. Staff are already left out."
        : "That did not go through. Nothing changed. Try again.",
    );
  }
  const status = statusOf(data);
  if (status !== "ok") return fail(WORDS[status] ?? "That did not go through.");
  revalidatePath("/admin/staff");
  revalidatePath("/admin/analytics");
  return ok(null);
}

/** C10: mark somebody by their email address (the list only shows who is on it already). */
export async function markInternalByEmail(input: { email: string }): Promise<ActionResult<null>> {
  const parsed = validate(z.object({ email: z.string().trim().email("Enter an email address.").max(320) }), input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const user = await findUserByEmail(parsed.data.email);
  if (!user) return fail("No account uses that email address.");
  return setInternalAccount({ userId: user.id, internal: true, reason: "Marked internal on the staff page" });
}
