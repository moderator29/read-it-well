import "server-only";

/**
 * Around: reading places.
 *
 * Every read here goes through the caller's own RLS-bound client, so the
 * database decides what a person may see rather than a `where` clause we
 * remembered to write. Signed out, the anonymous client sees exactly the ACTIVE
 * and PAUSED places the `areas_select` policy allows and nothing else, which is
 * the whole point of putting the rule in a policy.
 *
 * These functions never throw. A place that cannot be read is `null` and a list
 * that cannot be read is empty, because a discovery surface that 500s because
 * one row is wrong is worse than one that is briefly thin.
 */

import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import { resolveSession } from "../actions/session";
import type { AreaKind, AreaRole, AreaStatus } from "./areas-schema";
import type { OpenPlace, PlaceWithin } from "./places-schema";

export type AreaSummary = {
  id: string;
  slug: string;
  name: string;
  kind: AreaKind;
  city: string;
  stateCode: string;
  /** The neighbourhood string the listings themselves are filed under, which
      is not always the display name: the UNILAG campus is filed under Akoka,
      because that is where the flats are. */
  area: string | null;
  blurb: string | null;
  status: AreaStatus;
  /** Set when this place IS a local government, and null when it is finer. */
  lgaCode: string | null;
  /** The local government this place sits inside. Set on every place. */
  withinLgaCode: string | null;
  memberCount: number;
  postCount: number;
  slowMode: boolean;
  openedAt: string | null;
};

export type AreaViewerState = {
  signedIn: boolean;
  member: boolean;
  role: AreaRole | null;
  /** A pending moderator application, so the page never offers to apply twice. */
  moderatorApplicationStatus: "PENDING" | null;
};

export type AreaDetail = {
  area: AreaSummary;
  viewer: AreaViewerState;
  moderators: { userId: string; handle: string | null; displayName: string | null }[];
};

/** One proposal a person made, so they can see where it got to. */
export type AreaProposal = {
  id: string;
  slug: string;
  name: string;
  city: string;
  status: AreaStatus;
  decisionNote: string | null;
  createdAt: string;
};

type AreaRow = {
  id: string;
  slug: string;
  name: string;
  kind: AreaKind;
  city: string;
  state_code: string;
  area: string | null;
  blurb: string | null;
  status: AreaStatus;
  lga_code: string | null;
  within_lga_code: string | null;
  member_count: number;
  post_count: number;
  slow_mode: boolean;
  opened_at: string | null;
};

const AREA_COLUMNS =
  "id, slug, name, kind, city, state_code, area, blurb, status, lga_code, within_lga_code, member_count, post_count, slow_mode, opened_at";

function toSummary(row: AreaRow): AreaSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    kind: row.kind,
    city: row.city,
    stateCode: row.state_code,
    area: row.area,
    blurb: row.blurb,
    status: row.status,
    lgaCode: row.lga_code,
    withinLgaCode: row.within_lga_code,
    memberCount: row.member_count,
    postCount: row.post_count,
    slowMode: row.slow_mode,
    openedAt: row.opened_at,
  };
}

/**
 * Every open place, busiest first. Busiest rather than newest because a
 * directory sorted by newest sends the first visitor to the emptiest room.
 */
export async function listOpenAreas(): Promise<AreaSummary[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("areas")
    .select(AREA_COLUMNS)
    .in("status", ["ACTIVE", "PAUSED"])
    .order("member_count", { ascending: false })
    .order("name", { ascending: true })
    .limit(120);
  if (error || !data) return [];
  return (data as AreaRow[]).map(toSummary);
}

/** The places this account is in. Empty when signed out, never an error. */
export async function listMyAreas(): Promise<AreaSummary[]> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return [];

  const { data, error } = await session.supabase
    .from("area_members")
    .select(`area_id, role, areas!inner(${AREA_COLUMNS})`)
    .eq("user_id", session.user.id)
    .order("joined_at", { ascending: false })
    .limit(60);
  if (error || !data) return [];

  return (data as unknown as { areas: AreaRow }[])
    .map((row) => row.areas)
    .filter((area): area is AreaRow => Boolean(area))
    .map(toSummary);
}

/** Places this account suggested, with the answer we gave. */
export async function listMyProposals(): Promise<AreaProposal[]> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return [];

  const { data, error } = await session.supabase
    .from("areas")
    .select("id, slug, name, city, status, decision_note, created_at")
    .eq("created_by", session.user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    city: row.city,
    status: row.status as AreaStatus,
    decisionNote: row.decision_note,
    createdAt: row.created_at,
  }));
}

/**
 * One place, plus what this viewer is to it. Returns null when the slug does
 * not resolve under the caller's own policy, which covers both "no such place"
 * and "proposed by somebody else and not yours to see". The route renders the
 * same not-found either way, deliberately: distinguishing them would tell a
 * stranger that a private proposal exists.
 */
export async function getArea(slug: string): Promise<AreaDetail | null | "unconfigured"> {
  if (!isSupabaseConfigured()) return "unconfigured";

  const session = await resolveSession();
  const supabase =
    session.state === "signed-in" ? session.supabase : await createClient();

  const { data, error } = await supabase
    .from("areas")
    .select(AREA_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;

  const area = toSummary(data as AreaRow);

  const viewer: AreaViewerState = {
    signedIn: session.state === "signed-in",
    member: false,
    role: null,
    moderatorApplicationStatus: null,
  };

  if (session.state === "signed-in") {
    const [membership, application] = await Promise.all([
      session.supabase
        .from("area_members")
        .select("role")
        .eq("area_id", area.id)
        .eq("user_id", session.user.id)
        .maybeSingle(),
      session.supabase
        .from("area_moderator_applications")
        .select("status")
        .eq("area_id", area.id)
        .eq("user_id", session.user.id)
        .eq("status", "PENDING")
        .maybeSingle(),
    ]);
    if (membership.data) {
      viewer.member = true;
      viewer.role = membership.data.role as AreaRole;
    }
    if (application.data) viewer.moderatorApplicationStatus = "PENDING";
  }

  // Who looks after this place, so a member can see there is somebody here.
  const { data: mods } = await supabase
    .from("area_members")
    .select("user_id, role")
    .eq("area_id", area.id)
    .eq("role", "MODERATOR")
    .limit(8);

  let moderators: AreaDetail["moderators"] = [];
  const modIds = (mods ?? []).map((m) => m.user_id);
  if (modIds.length > 0) {
    const { data: profiles } = await supabase
      .from("social_profiles")
      .select("user_id, handle")
      .in("user_id", modIds);
    const handles = new Map((profiles ?? []).map((p) => [p.user_id, p.handle]));
    moderators = modIds.map((id) => ({
      userId: id,
      handle: handles.get(id) ?? null,
      displayName: null,
    }));
  }

  return { area, viewer, moderators };
}

/**
 * Which of the 774 doors already stand open.
 *
 * A place whose `lga_code` is set IS that local government, so this one read
 * tells the picker which chips can be walked straight into and which one needs
 * somebody to open it. It matters that this is separate from the geography
 * read: the country is memoised for an hour and this changes the moment
 * anybody walks through a door, so caching them together would show a person a
 * closed door they had just opened themselves.
 *
 * Signed out this returns exactly the ACTIVE and PAUSED places the `areas_select`
 * policy allows, which is the correct answer rather than a reduced one: an open
 * place is public, and reading one has never needed an account.
 */
export async function listOpenLgaPlaces(): Promise<OpenPlace[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("areas")
    .select("lga_code, slug, name, status, member_count, post_count")
    .not("lga_code", "is", null)
    .in("status", ["ACTIVE", "PAUSED"])
    /* 774 is the ceiling this can ever reach, because `lga_code` is unique. */
    .limit(800);
  if (error || !data) return [];

  return data
    .filter((row): row is typeof row & { lga_code: string } => Boolean(row.lga_code))
    .map((row) => ({
      lgaCode: row.lga_code,
      slug: row.slug,
      name: row.name,
      status: row.status as AreaStatus,
      memberCount: row.member_count,
      postCount: row.post_count,
    }));
}

/**
 * The finer places inside one local government.
 *
 * `areas.within_lga_code` is set on every place, including on the local
 * government's own row, which is why the local government itself is excluded by
 * id rather than by a status test. Lekki Phase 1 and Ikeja GRA are inside
 * Eti-Osa and Ikeja respectively, UNILAG is inside Lagos Mainland, and somebody
 * standing in the local government should be offered all of them: the door they
 * came through is the coarse one, and the room they actually live in is usually
 * finer than it.
 */
export async function listPlacesWithinLga(
  lgaCode: string,
  excludeAreaId: string,
): Promise<PlaceWithin[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("areas")
    .select("id, slug, name, kind, status, member_count, post_count")
    .eq("within_lga_code", lgaCode)
    .neq("id", excludeAreaId)
    .in("status", ["ACTIVE", "PAUSED"])
    .order("member_count", { ascending: false })
    .order("name", { ascending: true })
    .limit(24);
  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    kind: row.kind,
    status: row.status as AreaStatus,
    memberCount: row.member_count,
    postCount: row.post_count,
  }));
}

/**
 * The local government a finer place sits inside, when that door is already
 * open. Lekki Phase 1 is inside Eti-Osa, and somebody standing in Lekki should
 * be one tap from everything else in Eti-Osa.
 *
 * Null when nobody has opened the local government yet, because opening it is a
 * write and a link that silently creates a place is not a link. That person can
 * still reach it from the picker on `/around/manage`, which is where opening
 * belongs.
 */
export async function getLgaDoor(
  lgaCode: string,
): Promise<{ slug: string; name: string; status: AreaStatus } | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("areas")
    .select("slug, name, status")
    .eq("lga_code", lgaCode)
    .in("status", ["ACTIVE", "PAUSED"])
    .maybeSingle();
  if (error || !data) return null;
  return { slug: data.slug, name: data.name, status: data.status as AreaStatus };
}

/** The states a person can put a place in, for the propose form. */
export async function listStates(): Promise<{ code: string; name: string }[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("states")
    .select("code, name")
    .order("name", { ascending: true });
  if (error || !data) return [];
  return data;
}
