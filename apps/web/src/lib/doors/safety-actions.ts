"use server";

import { z } from "zod";
import { fail, ok, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { callLandlordRpc } from "../landlord/rpc";
import { readSafetyShare } from "./safety";

/**
 * V-62. THE RENTER MAKES THE LINK; THE RENTER SENDS IT.
 *
 * Vallo never messages the contact. `safety_share_create` checks the caller is
 * the person going to a confirmed inspection, revokes any earlier link and
 * returns a fresh token (stored only as its sha256). The page then reads the
 * share back once, so the words the renter sends ("Ada is at a property
 * inspection in Ikoyi") are the same words the page will show, drawn from the
 * same row and never from the address.
 */

const ID = z.string().uuid();
const FAILED = "failed";

export type SafetyShareMade = { token: string; firstName: string | null; area: string | null };

export async function createSafetyShare(input: { inspectionId: string }): Promise<ActionResult<SafetyShareMade>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  const id = ID.safeParse(input.inspectionId);
  if (!id.success) return fail(FAILED);

  const { data, error } = await callLandlordRpc(session.supabase, "safety_share_create", {
    p_inspection: id.data,
    p_minutes: 60,
  });
  const token = (data as { token?: unknown } | null)?.token;
  if (error || typeof token !== "string") return fail(FAILED);

  const read = await callLandlordRpc(session.supabase, "safety_share_read", { p_token: token });
  const view = read.error ? null : readSafetyShare(read.data);
  return ok({
    token,
    firstName: view?.state === "live" ? view.firstName : null,
    area: view?.state === "live" ? view.area : null,
  });
}

export async function markSafetyDone(input: { inspectionId: string }): Promise<ActionResult<{ done: boolean }>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  const id = ID.safeParse(input.inspectionId);
  if (!id.success) return fail(FAILED);

  const { data, error } = await callLandlordRpc(session.supabase, "safety_share_done", { p_inspection: id.data });
  if (error) return fail(FAILED);
  return ok({ done: typeof data === "number" && data > 0 });
}

export async function stopSafetyShare(input: { inspectionId: string }): Promise<ActionResult<null>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  const id = ID.safeParse(input.inspectionId);
  if (!id.success) return fail(FAILED);
  const { error } = await callLandlordRpc(session.supabase, "safety_share_stop", { p_inspection: id.data });
  return error ? fail(FAILED) : ok(null);
}
