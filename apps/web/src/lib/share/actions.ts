"use server";

import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, resolveSession, SIGNED_OUT_MESSAGE } from "../actions/session";
import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";

/**
 * MINTING A SHARE DOOR (V-07).
 *
 * The OS share sheet used to be handed `window.location.href`, which for a
 * listing is a gated address: every link anybody shared unfurled as a sign-in
 * page. This mints the door instead, `/s/<token>`, whose card a stranger and
 * an unfurler can both read and whose one button carries the listing through
 * sign in.
 *
 * THROUGH THE CALLER'S OWN CLIENT, NOT THE SERVICE ROLE. `create_share_link`
 * reads `auth.uid()` and records the sharer against the door so they alone can
 * revoke it; the service-role client has no uid and would mint an ownerless
 * door nobody could close. The function refuses a listing that is not
 * published (a stay likewise, migration 20260924121000) and a price card
 * that does not exist, so a caller cannot mint a public door onto a draft by
 * posting an id.
 *
 * Sharing the same thing twice returns the same door (the function answers
 * the live token for the same sharer and target), so the counter on it means
 * something.
 *
 * This module exports only async functions, per the server-actions rule.
 */

const shareSchema = z.object({
  kind: z.enum(["listing", "price_area", "stay"]),
  targetId: z.string().uuid(),
});

const SHARE_FAILED =
  "We could not make a link just now. Nothing was shared, so try again in a moment.";

type MintRpc = (
  fn: "create_share_link",
  args: { p_kind: string; p_target: string },
) => PromiseLike<{ data: unknown; error: unknown }>;

export async function createShareLink(input: unknown): Promise<ActionResult<{ path: string }>> {
  const parsed = validate(shareSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  if (!isSupabaseConfigured()) return fail(NOT_CONFIGURED_MESSAGE);

  const session = await resolveSession();
  if (session.state !== "signed-in") return fail(SIGNED_OUT_MESSAGE);

  try {
    const supabase = await createClient();
    const rpc = supabase.rpc.bind(supabase) as unknown as MintRpc;
    const { data, error } = await rpc("create_share_link", {
      p_kind: parsed.data.kind,
      p_target: parsed.data.targetId,
    });
    if (error || typeof data !== "string" || !/^[23456789abcdefghjkmnpqrstvwxyz]{10}$/.test(data)) {
      return fail(SHARE_FAILED);
    }
    return ok({ path: `/s/${data}` });
  } catch {
    return fail(SHARE_FAILED);
  }
}

type RevokeRpc = (fn: "revoke_share_link", args: { p_token: string }) => PromiseLike<{ data: unknown; error: unknown }>;

/**
 * Close one of the caller's own doors (V-07 carry-over). `revoke_share_link`
 * closes only a door the caller minted; somebody else's token changes nothing
 * and is answered as a failure. The next share mints a fresh door.
 */
export async function revokeShareLink(input: unknown): Promise<ActionResult<null>> {
  const parsed = validate(z.object({ token: z.string().regex(/^[23456789abcdefghjkmnpqrstvwxyz]{10}$/) }), input);
  if (!parsed.ok) return fail(SHARE_FAILED);
  const session = await resolveSession();
  if (session.state !== "signed-in") return fail(SIGNED_OUT_MESSAGE);
  try {
    const supabase = await createClient();
    const rpc = supabase.rpc.bind(supabase) as unknown as RevokeRpc;
    const { data, error } = await rpc("revoke_share_link", { p_token: parsed.data.token });
    return error || data !== true ? fail(SHARE_FAILED) : ok(null);
  } catch {
    return fail(SHARE_FAILED);
  }
}
