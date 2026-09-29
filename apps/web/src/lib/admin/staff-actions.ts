"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { findUserByEmail } from "../supabase/service";
import { createAdminClient } from "../supabase/admin";
import { writeAudit } from "./audit";
import { STAFF_SCOPES } from "./guard";
import { STAFF_HANDBOOK_VERSION } from "./staff-handbook";
import { STAFF_POSITIONS } from "./staff-positions";

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
  no_scopes: "Choose a position or at least one access area.",
  invalid_position: "That position is not recognised. Refresh and try again.",
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
  /** Empty means "the position's default bundle". */
  scopes: string[];
  position?: string | null;
  note?: string;
}): Promise<ActionResult<{ scopes: string[] }>> {
  const parsed = validate(
    z
      .object({
        email: z.string().trim().email("Enter the email address on their Vallo account."),
        scopes: z.array(z.enum(STAFF_SCOPES)),
        position: z.enum(STAFF_POSITIONS).nullable().optional(),
        note: z.string().trim().max(500).optional(),
      })
      .refine((v) => v.scopes.length > 0 || Boolean(v.position), {
        message: WORDS.no_scopes!,
        path: ["scopes"],
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
    p_scopes: parsed.data.scopes.length > 0 ? parsed.data.scopes : null,
    p_note: parsed.data.note ?? null,
    p_position: parsed.data.position ?? null,
  } as never);
  if (error) return fail("That did not go through. Nothing changed. Try again.");
  const status = statusOf(data);
  if (status !== "ok") return fail(WORDS[status] ?? "That did not go through.");
  revalidatePath("/admin/staff");
  const granted = (data as { scopes?: unknown }).scopes;
  return ok({ scopes: Array.isArray(granted) ? granted.map(String) : parsed.data.scopes });
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

/* ------------------------------------------------------------ the support team

   Two one-step doors for the team console's Support panel (29 September).
   They add nothing to the authority above: both end in `admin_grant_staff`
   or `admin_revoke_staff` on the caller's own client, which refuse anybody
   but the super admin. What they add is the arithmetic, so "put this person
   on support" never takes away a desk they already had, and "take them off
   support" never takes away the others.

   Least privilege: a person with no access yet is given the Support Agent
   position, whose bundle is the support scope and nothing else. */

type Grant = { scopes: string[] | null; position: string | null; note: string | null; revoked_at: string | null };

async function readGrant(client: unknown, userId: string): Promise<Grant | null | "error"> {
  const db = client as { from: (t: string) => { select: (c: string) => { eq: (c: string, v: string) => { maybeSingle: () => PromiseLike<{ data: unknown; error: unknown }> } } } };
  const { data, error } = await db.from("staff_grants").select("scopes, position, note, revoked_at").eq("user_id", userId).maybeSingle();
  if (error) return "error";
  return (data as Grant | null) ?? null;
}

export async function addToSupport(input: { email: string }): Promise<ActionResult<{ scopes: string[] }>> {
  const parsed = validate(z.object({ email: z.string().trim().email("Enter the email address on their Vallo account.") }), input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const c = await callerClient();
  if (c.error !== undefined) return fail(c.error);
  const target = await findUserByEmail(parsed.data.email);
  if (!target) return fail(WORDS.no_such_user!, { email: WORDS.no_such_user! });
  const prior = await readGrant(c.session.supabase, target.id);
  if (prior === "error") return fail("Their current access could not be read. Nothing changed. Try again.");
  const live = prior && !prior.revoked_at ? prior : null;
  if (live?.scopes?.includes("support")) return fail("They are already on support.");
  const { data, error } = await c.session.supabase.rpc("admin_grant_staff" as never, {
    p_user: target.id,
    /* No live grant: the Support Agent bundle, exactly the support scope.
       A live grant: what they hold plus support, their position kept. */
    p_scopes: live ? [...new Set([...(live.scopes ?? []), "support"])] : null,
    p_note: live?.note ?? null,
    p_position: live ? live.position : "support_agent",
  } as never);
  if (error) return fail("That did not go through. Nothing changed. Try again.");
  const status = statusOf(data);
  if (status !== "ok") return fail(WORDS[status] ?? "That did not go through.");
  revalidatePath("/admin/staff");
  const granted = (data as { scopes?: unknown }).scopes;
  return ok({ scopes: Array.isArray(granted) ? granted.map(String) : ["support"] });
}

export async function removeFromSupport(input: { userId: string; reason: string }): Promise<ActionResult<{ ended: boolean }>> {
  const parsed = validate(
    z.object({ userId: z.string().uuid(), reason: z.string().trim().min(5, WORDS.reason_needed!).max(500) }),
    input,
  );
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const c = await callerClient();
  if (c.error !== undefined) return fail(c.error);
  const prior = await readGrant(c.session.supabase, parsed.data.userId);
  if (prior === "error") return fail("Their current access could not be read. Nothing changed. Try again.");
  if (!prior || prior.revoked_at || !(prior.scopes ?? []).includes("support")) return fail("They are not on support.");
  const rest = (prior.scopes ?? []).filter((s) => s !== "support");

  if (rest.length === 0) {
    /* Support was all they had: end the access, with the reason they read. */
    const ended = await revokeStaff({ userId: parsed.data.userId, reason: parsed.data.reason });
    return ended.ok ? ok({ ended: true }) : fail(ended.error);
  }

  const { data, error } = await c.session.supabase.rpc("admin_grant_staff" as never, {
    p_user: parsed.data.userId,
    p_scopes: rest,
    p_note: prior.note,
    p_position: prior.position === "support_agent" ? null : prior.position,
  } as never);
  if (error) return fail("That did not go through. Nothing changed. Try again.");
  const status = statusOf(data);
  if (status !== "ok") return fail(WORDS[status] ?? "That did not go through.");
  /* The grant function records the change of scopes; the reason is kept
     beside it, because a change of access without a why is not a record. */
  try {
    await writeAudit(createAdminClient(), {
      actorId: c.session.user.id,
      action: "staff.support_removed",
      entityType: "staff_grant",
      entityId: parsed.data.userId,
      detail: { reason: parsed.data.reason, kept: rest.join(",") },
    });
  } catch {
    /* writeAudit raises its own alert when it cannot write. */
  }
  revalidatePath("/admin/staff");
  return ok({ ended: false });
}
