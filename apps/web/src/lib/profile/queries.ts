import "server-only";

import { resolveSession } from "../actions/session";
import {
  parseSettings,
  splitDisplayName,
  type ResolvedProfileSettings,
} from "./schema";

/**
 * Server reads for the account surfaces.
 *
 * One round trip gives the profile page everything it renders: the row the
 * signup trigger created, the identity block inside settings, and the three
 * activity counters, each counted under the caller's own RLS so a number can
 * only ever be that person's own. Counters degrade to zero rather than
 * failing the page, because a missing count is not worth a blank screen.
 */

export type ProfileView = {
  userId: string;
  email: string;
  displayName: string;
  firstName: string;
  surname: string;
  nickname: string;
  phone: string;
  stateCode: string;
  /** State, local government and occupation resolved to their names. */
  place: PlaceView;
  avatarUrl: string;
  /** ISO timestamp of the profile row, the honest member-since. */
  memberSince: string;
  settings: ResolvedProfileSettings;
  counts: { trips: number; saved: number; reviews: number };
};

export type ProfileState =
  | { state: "unconfigured" }
  | { state: "signed-out" }
  | { state: "signed-in"; profile: ProfileView }
  /** Signed in, but the profile row is missing or unreadable. */
  | { state: "no-row"; email: string };

export async function loadProfileState(): Promise<ProfileState> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return { state: "unconfigured" };
  if (session.state === "signed-out") return { state: "signed-out" };

  const { supabase, user } = session;

  const { data: row, error } = await supabase
    .from("profiles")
    .select(
      "display_name, first_name, surname, nickname, avatar_url, phone, state_code, lga_code, occupation_code, created_at, settings",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error || !row) return { state: "no-row", email: user.email ?? "" };

  const settings = parseSettings(row.settings);
  // Rows created by the signup trigger before the identity columns existed
  // carry only a display_name, so fall back to splitting it.
  const split = splitDisplayName(row.display_name);

  const [stateRow, lgaRow, occupationRow] = await Promise.all([
    row.state_code
      ? supabase.from("states").select("name").eq("code", row.state_code).maybeSingle()
      : Promise.resolve({ data: null }),
    row.lga_code
      ? supabase.from("local_governments").select("name").eq("code", row.lga_code).maybeSingle()
      : Promise.resolve({ data: null }),
    row.occupation_code
      ? supabase.from("occupations").select("name").eq("code", row.occupation_code).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const [trips, saved, reviews] = await Promise.all([
    readCount(
      supabase.from("bookings").select("id", { count: "exact", head: true }).eq("guest_id", user.id),
    ),
    readCount(
      supabase
        .from("saved_items")
        .select("listing_id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ),
    readCount(
      supabase.from("reviews").select("id", { count: "exact", head: true }).eq("author_id", user.id),
    ),
  ]);

  return {
    state: "signed-in",
    profile: {
      userId: user.id,
      email: user.email ?? "",
      displayName: row.display_name ?? "",
      firstName: row.first_name ?? split.firstName,
      surname: row.surname ?? split.surname,
      nickname: row.nickname ?? "",
      phone: row.phone ?? "",
      stateCode: row.state_code ?? "",
      place: {
        stateName: stateRow.data?.name ?? "",
        lgaName: lgaRow.data?.name ?? "",
        occupationName: occupationRow.data?.name ?? "",
      },
      avatarUrl: row.avatar_url ?? "",
      memberSince: row.created_at,
      settings,
      counts: { trips, saved, reviews },
    },
  };
}

/** The three reference answers, resolved to the names a person recognises. */
export type PlaceView = {
  stateName: string;
  lgaName: string;
  occupationName: string;
};

const EMPTY_PLACE_VIEW: PlaceView = { stateName: "", lgaName: "", occupationName: "" };

export type SettingsState =
  | { state: "unconfigured" }
  | { state: "signed-out" }
  | {
      state: "signed-in";
      email: string;
      settings: ResolvedProfileSettings;
      place: PlaceView;
    };

export async function loadSettingsState(): Promise<SettingsState> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return { state: "unconfigured" };
  if (session.state === "signed-out") return { state: "signed-out" };

  const { data: row } = await session.supabase
    .from("profiles")
    .select("settings, state_code, lga_code, occupation_code")
    .eq("id", session.user.id)
    .maybeSingle();

  const [stateRow, lgaRow, occupationRow] = await Promise.all([
    row?.state_code
      ? session.supabase.from("states").select("name").eq("code", row.state_code).maybeSingle()
      : Promise.resolve({ data: null }),
    row?.lga_code
      ? session.supabase
          .from("local_governments")
          .select("name")
          .eq("code", row.lga_code)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    row?.occupation_code
      ? session.supabase
          .from("occupations")
          .select("name")
          .eq("code", row.occupation_code)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    state: "signed-in",
    email: session.user.email ?? "",
    settings: parseSettings(row?.settings ?? {}),
    place: {
      ...EMPTY_PLACE_VIEW,
      stateName: stateRow.data?.name ?? "",
      lgaName: lgaRow.data?.name ?? "",
      occupationName: occupationRow.data?.name ?? "",
    },
  };
}

/** A head count of the caller's own rows. Any failure reads as zero. */
async function readCount(
  query: PromiseLike<{ count: number | null; error: unknown }>,
): Promise<number> {
  try {
    const { count, error } = await query;
    if (error || typeof count !== "number") return 0;
    return count;
  } catch {
    return 0;
  }
}
