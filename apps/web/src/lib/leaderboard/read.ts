import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSession } from "@/lib/actions/session";
import { createClient } from "@/lib/supabase/server";
import { parseRows, type Board, type LeaderRow, type Period } from "./model";

/**
 * THE LEADERBOARD READ, ON THE SERVER (D76).
 *
 * One board and period, read twice in parallel (the member's state, and
 * Global) so the City / Global toggle is instant and the rows can move to
 * their new places on the client.
 *
 * NOT LIVE UNTIL THE MIGRATION IS APPLIED. `public.leaderboard` is in
 * supabase/migrations/20261007151806_d76_leaderboards_and_directory.sql. Until the
 * lead applies it, PostgREST answers "function not found" and this read says
 * `not-live`; the page draws the honest "opens soon" state and never a board
 * of filler.
 */

export type Place = { code: string; name: string };

export type BoardRead =
  | { state: "ready"; city: LeaderRow[]; global: LeaderRow[]; place: Place; signedIn: boolean }
  | { state: "not-live"; place: Place; signedIn: boolean }
  | { state: "error"; place: Place; signedIn: boolean };

/** Lagos when the member has not set a state: the largest market, said plainly as the city shown. */
export const DEFAULT_PLACE: Place = { code: "LA", name: "Lagos" };

const MISSING_FUNCTION = new Set(["PGRST202", "42883"]);

export function isMissingFunction(error: { code?: string | null } | null | undefined): boolean {
  return Boolean(error?.code && MISSING_FUNCTION.has(error.code));
}

/** The member's own state, read through their own RLS-bound profile. */
export async function memberPlace(db: SupabaseClient, userId: string | null): Promise<Place> {
  if (!userId) return DEFAULT_PLACE;
  const social = await db.from("social_profiles").select("state_code").eq("user_id", userId).maybeSingle();
  let code = (social.data as { state_code?: string | null } | null)?.state_code ?? null;
  if (!code) {
    const own = await db.from("profiles").select("state_code").eq("id", userId).maybeSingle();
    code = (own.data as { state_code?: string | null } | null)?.state_code ?? null;
  }
  if (!code) return DEFAULT_PLACE;
  const st = await db.from("states").select("code, name").eq("code", code).maybeSingle();
  const row = st.data as { code?: string; name?: string } | null;
  return row?.code && row.name ? { code: row.code, name: row.name } : DEFAULT_PLACE;
}

export async function readBoard(board: Board, period: Period): Promise<BoardRead> {
  const session = await resolveSession();
  const signedIn = session.state === "signed-in";
  let db: SupabaseClient;
  try {
    db = (signedIn ? session.supabase : await createClient()) as unknown as SupabaseClient;
  } catch {
    return { state: "error", place: DEFAULT_PLACE, signedIn };
  }
  const place = await memberPlace(db, signedIn ? session.user.id : null).catch(() => DEFAULT_PLACE);
  const call = (state: string | null) =>
    db.rpc("leaderboard", { p_board: board, p_state: state, p_period: period, p_limit: 50 });
  const [city, global] = await Promise.all([call(place.code), call(null)]);
  if (isMissingFunction(city.error) || isMissingFunction(global.error)) return { state: "not-live", place, signedIn };
  if (city.error || global.error) return { state: "error", place, signedIn };
  return { state: "ready", city: parseRows(city.data), global: parseRows(global.data), place, signedIn };
}

export type Visibility = { hidden: boolean; businesses: { id: string; name: string; hidden: boolean }[] } | null;

/** What the member can hide. Null when signed out or the read is not live. */
export async function readVisibility(): Promise<Visibility> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  const db = session.supabase as unknown as SupabaseClient;
  const { data, error } = await db.rpc("my_leaderboard_visibility");
  if (error || !Array.isArray(data)) return null;
  let hidden = false;
  const businesses: { id: string; name: string; hidden: boolean }[] = [];
  for (const raw of data as Record<string, unknown>[]) {
    if (raw.subject_kind === "member") hidden = raw.hidden === true;
    else if (raw.subject_kind === "business" && typeof raw.business_id === "string")
      businesses.push({ id: raw.business_id, name: String(raw.name ?? ""), hidden: raw.hidden === true });
  }
  return { hidden, businesses };
}
