import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSession } from "@/lib/actions/session";
import { DEFAULT_PLACE, isMissingFunction, memberPlace, type Place } from "@/lib/leaderboard/read";
import { createClient } from "@/lib/supabase/server";
import type { Side } from "@/lib/side.constants";
import { parseEntries, type DirEntry } from "./model";

/**
 * The directory read (D76): the side the shell is on, the member's state and
 * Global, in parallel. Not live until the pending d76 migration is applied,
 * and it says so rather than drawing filler.
 */
export type DirectoryRead =
  | { state: "ready"; city: DirEntry[]; global: DirEntry[]; place: Place }
  | { state: "not-live"; place: Place }
  | { state: "error"; place: Place };

export async function readDirectory(side: Side): Promise<DirectoryRead> {
  const session = await resolveSession();
  let db: SupabaseClient;
  try {
    db = (session.state === "signed-in" ? session.supabase : await createClient()) as unknown as SupabaseClient;
  } catch {
    return { state: "error", place: DEFAULT_PLACE };
  }
  const place = await memberPlace(db, session.state === "signed-in" ? session.user.id : null).catch(() => DEFAULT_PLACE);
  const call = (state: string | null) => db.rpc("directory", { p_side: side, p_state: state, p_query: null, p_limit: 120 });
  const [city, global] = await Promise.all([call(place.code), call(null)]);
  if (isMissingFunction(city.error) || isMissingFunction(global.error)) return { state: "not-live", place };
  if (city.error || global.error) return { state: "error", place };
  return { state: "ready", city: parseEntries(city.data, side), global: parseEntries(global.data, side), place };
}
