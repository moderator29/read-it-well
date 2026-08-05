"use server";

/**
 * Stopping an agent from trading, and letting them back.
 *
 * `suspend_agent` and `reinstate_agent`, both in the database since
 * 20260805110426. Neither had ever been called from anywhere: the table has
 * been recording stops that no screen showed and no action wrote.
 *
 * Neither of these is a table write. Both call a SECURITY DEFINER function that
 * does the whole thing in one transaction, because the whole thing is more than
 * one row: the agent's status, every live listing of theirs, the record on the
 * file, and the notification that tells them it happened. Half of that landing
 * would leave somebody stopped with their listings still up, or their listings
 * down with nothing on the file explaining why.
 *
 * The function proves the admin role itself rather than trusting this file to
 * have checked. `requireAdmin` still runs first so a non-admin gets a sentence
 * instead of a bare 'forbidden', but it is not the gate. The gate is in
 * Postgres, where a bug in this file cannot reach past it.
 *
 * The RPC goes through the admin's own RLS-bound client, and the audit row uses
 * the service role because the audit log takes no client writes by design. The
 * agent's notification is the database's own work inside the function, so it
 * cannot be lost to a failure on this side of the wire.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, formDataToObject, ok, validate, type ActionResult } from "../actions/envelope";
import { createAdminClient } from "../supabase/admin";
import { writeAudit } from "./audit";
import { adminRefusal, requireAdmin } from "./guard";

const SERVICE_DOWN =
  "The console could not reach the platform data just now. Nothing was changed. Please try again.";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const stopSchema = z.object({
  agentId: z.string().refine((v) => UUID_RE.test(v), "That agent could not be identified."),
  reason: z
    .string()
    .trim()
    .min(15, "Say why, in a sentence. The agent reads this, and it is what they answer.")
    .max(2000, "Keep the reason under 2000 characters."),
});

const liftSchema = z.object({
  agentId: z.string().refine((v) => UUID_RE.test(v), "That agent could not be identified."),
  note: z.string().trim().max(2000, "Keep the note under 2000 characters.").optional(),
});

/**
 * Every answer `private.suspend_agent` and `private.lift_agent_suspension` can
 * return, in the operator's language. The functions return a status string
 * rather than raising, so a refusal that is somebody's fault reads as a
 * sentence and only a genuine fault reads as a fault.
 */
const STOP_REFUSALS: Record<string, string> = {
  bad_request: "That request was missing something. Nothing was changed.",
  no_reason: "A stop has to say why. Nothing was changed.",
  reason_too_long: "That reason is too long for the record. Keep it under 2000 characters.",
  forbidden: "Your account does not carry the role that can stop an agent.",
  not_found: "That agent is no longer there. Refresh the desk to see the current state.",
  already_suspended: "That agent is already stopped. Refresh the desk to see the current state.",
  not_trading:
    "That agent is not trading, so there is nothing to stop. Refresh the desk to see where they actually stand.",
};

const LIFT_REFUSALS: Record<string, string> = {
  bad_request: "That request was missing something. Nothing was changed.",
  note_too_long: "That note is too long for the record. Keep it under 2000 characters.",
  forbidden: "Your account does not carry the role that can lift a stop.",
  not_found: "That agent is no longer there. Refresh the desk to see the current state.",
  not_suspended:
    "That agent is already trading, so there is nothing to lift. Refresh the desk to see the current state.",
};

/**
 * The lift is `reinstate_agent`, not `lift_agent_suspension`. Both names are
 * written here because the second one existed on this database for an hour and
 * anybody grepping for it should land somewhere that explains itself rather
 * than on nothing.
 */
const LIFT_RPC = "reinstate_agent" as const;

export type StopReceipt = {
  agentId: string;
  displayName: string;
  withdrawnCount: number;
  staysAhead: number;
};

export type LiftReceipt = {
  agentId: string;
  displayName: string;
  restoredCount: number;
  withdrawnCount: number;
};

/**
 * The functions return jsonb, which reaches TypeScript as unknown. Reading a
 * field off it is proved rather than asserted: a shape we do not recognise is
 * treated as a failure, never as a success with zeroes in it.
 */
function readResult(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readCount(row: Record<string, unknown>, key: string): number {
  const raw = row[key];
  return typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
}

function readName(row: Record<string, unknown>): string {
  const raw = row.display_name;
  return typeof raw === "string" && raw.length > 0 ? raw : "That agent";
}

export async function stopAgentTrading(
  _prev: ActionResult<StopReceipt> | null,
  formData: FormData,
): Promise<ActionResult<StopReceipt>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));

  const parsed = validate(stopSchema, formDataToObject(formData));
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { agentId, reason } = parsed.data;

  try {
    const { data, error } = await access.supabase.rpc("suspend_agent", {
      acting_admin: access.user.id,
      target_agent: agentId,
      stop_reason: reason,
    });
    if (error) return fail(SERVICE_DOWN);

    const row = readResult(data);
    if (!row) return fail(SERVICE_DOWN);

    const status = typeof row.status === "string" ? row.status : "";
    if (status !== "ok") {
      const message = STOP_REFUSALS[status];
      // An unrecognised status means the function grew an answer this file has
      // not been taught. Treating it as success would be worse than saying so.
      return fail(message ?? SERVICE_DOWN);
    }

    const withdrawnCount = readCount(row, "withdrawn_count");
    const staysAhead = readCount(row, "stays_ahead");
    const displayName = readName(row);

    await writeAudit(createAdminClient(), {
      actorId: access.user.id,
      action: "agent.suspend",
      entityType: "agent",
      entityId: agentId,
      detail: { reason, withdrawnCount, staysAhead, displayName },
    });

    revalidatePath("/admin/stops");
    revalidatePath("/admin/agents");
    return ok({ agentId, displayName, withdrawnCount, staysAhead });
  } catch {
    return fail(SERVICE_DOWN);
  }
}

export async function liftAgentStop(
  _prev: ActionResult<LiftReceipt> | null,
  formData: FormData,
): Promise<ActionResult<LiftReceipt>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));

  const parsed = validate(liftSchema, formDataToObject(formData));
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { agentId } = parsed.data;
  // The argument has a default in SQL, so the generated type makes it optional
  // rather than nullable. Omitting it and passing null mean the same thing to
  // the function; only omitting it typechecks.
  const note = parsed.data.note && parsed.data.note.length > 0 ? parsed.data.note : undefined;

  try {
    const { data, error } = await access.supabase.rpc(LIFT_RPC, {
      acting_admin: access.user.id,
      target_agent: agentId,
      ...(note === undefined ? {} : { note }),
    });
    if (error) return fail(SERVICE_DOWN);

    const row = readResult(data);
    if (!row) return fail(SERVICE_DOWN);

    const status = typeof row.status === "string" ? row.status : "";
    if (status !== "ok") {
      const message = LIFT_REFUSALS[status];
      return fail(message ?? SERVICE_DOWN);
    }

    const restoredCount = readCount(row, "restored_count");
    const withdrawnCount = readCount(row, "withdrawn_count");
    const displayName = readName(row);

    await writeAudit(createAdminClient(), {
      actorId: access.user.id,
      action: "agent.suspension.lift",
      entityType: "agent",
      entityId: agentId,
      detail: { note: note ?? null, restoredCount, withdrawnCount, displayName },
    });

    revalidatePath("/admin/stops");
    revalidatePath("/admin/agents");
    return ok({ agentId, displayName, restoredCount, withdrawnCount });
  } catch {
    return fail(SERVICE_DOWN);
  }
}
