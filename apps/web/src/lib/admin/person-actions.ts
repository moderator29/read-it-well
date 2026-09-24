"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, type ActionResult } from "../actions/envelope";
import { requireAdmin, adminRefusal } from "./guard";

/**
 * V-90. A SENIOR REVIEWER UPHOLDS A STOP AS FRAUD, WITH A REASON.
 *
 * The database decides who is senior (super_admin) and writes the person's
 * keys to the deny-list as HMACs; this carries the note.
 */
const INPUT = z.object({ suspensionId: z.string().uuid(), userId: z.string().uuid(), note: z.string().trim().min(10).max(600) });

export async function upholdStopAsFraud(input: { suspensionId: string; userId: string; note: string }): Promise<ActionResult<{ keys: number }>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));
  const parsed = INPUT.safeParse(input);
  if (!parsed.success) return fail("Say what the fraud was, in a sentence of at least ten characters.");
  const { data, error } = await (access.supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { code?: string } | null }>;
  }).rpc("uphold_stop_as_fraud", { p_suspension: parsed.data.suspensionId, p_note: parsed.data.note });
  if (error) {
    if (error.code === "42501") return fail("Only a senior reviewer can uphold a stop as fraud.");
    if (error.code === "23514") return fail("That stop is no longer in force, or the reason is too short.");
    return fail("That did not go through. Nothing has changed. Please try again.");
  }
  revalidatePath(`/admin/people/${parsed.data.userId}`);
  const keys = (data as { keys?: unknown } | null)?.keys;
  return ok({ keys: typeof keys === "number" ? keys : 0 });
}
