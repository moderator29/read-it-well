"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { nairaToMinor } from "./portfolio";
import { callLandlordRpc } from "./rpc";

/**
 * V-42. THE DOORS: an owner invites, withdraws and awards; a verified agent
 * pitches. Every rule (who owns the unit, who may see a brief, the band, the
 * note length) is decided inside the database; these only carry the words.
 */

const ID = z.string().uuid();

async function session() {
  const s = await resolveSession();
  if (s.state === "unconfigured") return { error: NOT_CONFIGURED_MESSAGE } as const;
  if (s.state === "signed-out") return { error: SIGNED_OUT_MESSAGE } as const;
  return { supabase: s.supabase } as const;
}

export async function inviteAgents(input: { listingId: string; min: string; max: string }): Promise<ActionResult<{ told: number }>> {
  const s = await session();
  if ("error" in s) return fail(s.error ?? "failed");
  const id = ID.safeParse(input.listingId);
  const min = nairaToMinor(input.min);
  const max = nairaToMinor(input.max);
  if (!id.success) return fail("failed");
  if (min === null || max === null || max < min || max > min * 3) return fail("band");
  const { data, error } = await callLandlordRpc(s.supabase, "mandate_invite", { p_listing: id.data, p_min_minor: min, p_max_minor: max });
  if (error) return fail(error.code === "23514" ? "band" : "failed");
  revalidatePath("/agent/portfolio");
  const told = (data as { agents_told?: unknown } | null)?.agents_told;
  return ok({ told: typeof told === "number" ? told : 0 });
}

export async function withdrawInvitation(input: { invitationId: string }): Promise<ActionResult<null>> {
  const s = await session();
  if ("error" in s) return fail(s.error ?? "failed");
  const id = ID.safeParse(input.invitationId);
  if (!id.success) return fail("failed");
  const { error } = await callLandlordRpc(s.supabase, "mandate_withdraw", { p_invitation: id.data });
  if (error) return fail("failed");
  revalidatePath("/agent/portfolio");
  return ok(null);
}

export async function awardMandate(input: { pitchId: string }): Promise<ActionResult<null>> {
  const s = await session();
  if ("error" in s) return fail(s.error ?? "failed");
  const id = ID.safeParse(input.pitchId);
  if (!id.success) return fail("failed");
  const { error } = await callLandlordRpc(s.supabase, "mandate_award", { p_pitch: id.data });
  if (error) return fail("failed");
  revalidatePath("/agent/portfolio");
  return ok(null);
}

export async function pitchForMandate(input: { invitationId: string; note: string }): Promise<ActionResult<null>> {
  const s = await session();
  if ("error" in s) return fail(s.error ?? "failed");
  const id = ID.safeParse(input.invitationId);
  if (!id.success) return fail("failed");
  const note = input.note.trim();
  if (note.length < 10) return fail("short");
  const { error } = await callLandlordRpc(s.supabase, "mandate_pitch", { p_invitation: id.data, p_note: note.slice(0, 600) });
  if (error) return fail(error.code === "23514" ? "short" : "failed");
  revalidatePath("/agent/portfolio");
  return ok(null);
}
