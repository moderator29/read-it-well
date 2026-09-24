"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";

/**
 * V-87: staff record a credential they checked on the public register. The
 * database refuses anybody who is not staff (`public.record_credential`
 * guards inside), so this action only shapes the input and words the answer.
 */

const schema = z
  .object({
    subjectId: z.string().uuid(),
    kind: z.enum(["lasrera", "esvarbon", "cac_director"]),
    number: z.string().trim().min(2, "Enter the number exactly as the register shows it.").max(60),
    company: z.string().trim().max(200).optional(),
  })
  .refine((v) => (v.kind === "cac_director") === Boolean(v.company && v.company.length >= 2), {
    message: "A CAC directorship needs the company name, and only a CAC directorship has one.",
  });

type RpcCaller = { rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: unknown }> };

export async function recordCredential(input: unknown): Promise<ActionResult<{ recorded: true }>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  const parsed = validate(schema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { data, error } = await (session.supabase as unknown as RpcCaller).rpc("record_credential", {
    p_subject: parsed.data.subjectId,
    p_kind: parsed.data.kind,
    p_number: parsed.data.number,
    p_company: parsed.data.kind === "cac_director" ? (parsed.data.company ?? null) : null,
    p_source: "register_by_hand",
  });
  if (error) return fail("The check was not recorded. Try again in a moment.");
  if (data === "forbidden") return fail("Only Vallo staff can record a credential check.");
  if (data !== "recorded") return fail("That does not look like a register number we can record. Check it and try again.");
  revalidatePath("/admin/kyc");
  return ok({ recorded: true });
}
