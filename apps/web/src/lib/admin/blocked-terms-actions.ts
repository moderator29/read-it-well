"use server";

/**
 * The moderation desk's blocked-terms list: read every term, add or change
 * one, retire one. AR-11.
 *
 * All three go through database functions called with the caller's OWN client,
 * because each decides on auth.uid(): `public.staff_blocked_terms`,
 * `public.staff_blocked_term_put` and `public.staff_blocked_term_retire`
 * (migration 20261006024044). Each checks the moderation scope, and the two
 * writes record an audit_log row in the same transaction. Nothing is ever
 * deleted: a retired term keeps who retired it, when and why.
 */

import { revalidatePath } from "next/cache";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { adminRefusal, requireAdmin } from "./guard";
import { putTermSchema, retireTermSchema } from "./blocked-terms-rules";

const SERVICE_DOWN =
  "The console could not reach the platform data just now. Nothing was changed. Please try again.";

export type BlockedTermRow = {
  term: string;
  category: string;
  action: "hold" | "flag" | "refuse";
  severity: "low" | "medium" | "high";
  reason: string;
  refusal_reason: string | null;
  created_at: string;
  added_by: string | null;
  retired_at: string | null;
  retired_by: string | null;
  retired_reason: string | null;
};

type Rpc = {
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>;
};

/** Every term, live first. */
export async function listBlockedTerms(): Promise<ActionResult<BlockedTermRow[]>> {
  const access = await requireAdmin("moderation");
  if (access.state !== "admin") return fail(adminRefusal(access));
  try {
    const { data, error } = await (access.userClient as unknown as Rpc).rpc("staff_blocked_terms");
    if (error) return fail(error.code === "42501" ? adminRefusal({ state: "not-admin" }) : SERVICE_DOWN);
    return ok((data ?? []) as BlockedTermRow[]);
  } catch {
    return fail(SERVICE_DOWN);
  }
}

/** Add a term, change a live one, or bring a retired one back. */
export async function putBlockedTerm(input: unknown): Promise<ActionResult<null>> {
  const access = await requireAdmin("moderation");
  if (access.state !== "admin") return fail(adminRefusal(access));
  const parsed = validate(putTermSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const v = parsed.data;
  try {
    const { error } = await (access.userClient as unknown as Rpc).rpc("staff_blocked_term_put", {
      p_term: v.term,
      p_category: v.category,
      p_action: v.action,
      p_severity: v.severity,
      p_reason: v.reason,
      p_refusal_reason: v.action === "refuse" ? v.refusalReason : null,
    });
    if (error) {
      if (error.code === "42501") return fail(adminRefusal({ state: "not-admin" }));
      /* The function's own sentences for a shape it refused. */
      if (error.code === "23514" && error.message) return fail(error.message);
      return fail(SERVICE_DOWN);
    }
  } catch {
    return fail(SERVICE_DOWN);
  }
  revalidatePath("/admin/queue");
  return ok(null);
}

/** Retire a live term. It stops matching at once and stays on record. */
export async function retireBlockedTerm(input: unknown): Promise<ActionResult<null>> {
  const access = await requireAdmin("moderation");
  if (access.state !== "admin") return fail(adminRefusal(access));
  const parsed = validate(retireTermSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  try {
    const { error } = await (access.userClient as unknown as Rpc).rpc("staff_blocked_term_retire", {
      p_term: parsed.data.term,
      p_reason: parsed.data.reason,
    });
    if (error) {
      if (error.code === "42501") return fail(adminRefusal({ state: "not-admin" }));
      if (error.code === "P0002") return fail("That term is not on the live list. Refresh to see the current list.");
      if (error.code === "23514" && error.message) return fail(error.message);
      return fail(SERVICE_DOWN);
    }
  } catch {
    return fail(SERVICE_DOWN);
  }
  revalidatePath("/admin/queue");
  return ok(null);
}
