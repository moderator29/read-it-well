"use server";

import { revalidatePath } from "next/cache";
import { getDictionary } from "@vallo/i18n";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, resolveSession } from "../actions/session";
import { getLocale } from "../locale";

/**
 * "I FEEL UNSAFE" (V-63), THE SERVER HALF. One call to `public.feel_unsafe`,
 * which checks the caller is a party, files the report as `unsafe` on the
 * four-hour clock, blocks when asked, and, when the caller has written in
 * that thread (or has a confirmed inspection with them), pauses the other
 * person's own inspection requests for 72 hours or until a moderator has
 * looked. The other person is never told who reported them.
 *
 * No phone gate and no rate limit in front of this, deliberately: a person in
 * danger is never slowed by a code, and the database keeps one open report and
 * one hold per pair however often the button is pressed.
 */

const schema = z
  .object({
    conversationId: z.string().uuid().optional(),
    inspectionId: z.string().uuid().optional(),
    block: z.boolean(),
  })
  .refine((v) => Boolean(v.conversationId) !== Boolean(v.inspectionId), { message: "One conversation or one inspection." });

type RpcCaller = { rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: unknown }> };

export async function feelUnsafe(input: unknown): Promise<ActionResult<{ blocked: boolean; held: boolean }>> {
  const copy = getDictionary(await getLocale()).trustVisible.unsafe;
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(copy.signedOut);
  const parsed = validate(schema, input);
  if (!parsed.ok) return fail(copy.failed);
  const { data, error } = await (session.supabase as unknown as RpcCaller).rpc("feel_unsafe", {
    p_conversation: parsed.data.conversationId ?? null,
    p_inspection: parsed.data.inspectionId ?? null,
    p_block: parsed.data.block,
  });
  const status = (data as { status?: unknown } | null)?.status;
  if (error || typeof status !== "string") return fail(copy.failed);
  if (status === "not_a_party") return fail(copy.notAParty);
  if (status === "signed_out") return fail(copy.signedOut);
  if (status !== "filed") return fail(copy.failed);
  revalidatePath("/messages");
  revalidatePath("/inspections");
  return ok({ blocked: parsed.data.block, held: (data as { held?: unknown }).held === true });
}
