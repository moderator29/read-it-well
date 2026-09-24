import "server-only";

import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import { callLandlordRpc } from "./rpc";
import { readBriefs, readBuildings, readPitches, type BuildingUnit, type MandateBrief, type MandatePitch } from "./portfolio";

/**
 * V-42 reads. Each is separate and fails soft: `null` means "could not read",
 * which the page says in words, and an empty list means there is nothing.
 */

export async function readMyBuildings(): Promise<BuildingUnit[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const db = await createClient();
    const { data, error } = await callLandlordRpc(db, "my_buildings", {});
    return error ? null : readBuildings(data);
  } catch {
    return null;
  }
}

export async function readMandateBriefs(): Promise<MandateBrief[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const db = await createClient();
    const { data, error } = await callLandlordRpc(db, "mandate_briefs", {});
    return error ? null : readBriefs(data);
  } catch {
    return null;
  }
}

/** Pitches for each of these invitations, keyed by invitation. A failed read is simply absent. */
export async function readPitchesFor(invitationIds: readonly string[]): Promise<Map<string, MandatePitch[]>> {
  const out = new Map<string, MandatePitch[]>();
  if (!isSupabaseConfigured() || invitationIds.length === 0) return out;
  try {
    const db = await createClient();
    const results = await Promise.all(
      invitationIds.slice(0, 30).map(async (id) => [id, await callLandlordRpc(db, "mandate_pitches_for", { p_invitation: id })] as const),
    );
    for (const [id, { data, error }] of results) {
      if (!error) out.set(id, readPitches(data));
    }
  } catch {
    /* absent */
  }
  return out;
}
