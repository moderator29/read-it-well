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

export type AreaSummary = {
  id: string;
  slug: string;
  name: string;
  kind: AreaKind;
  city: string;
  stateCode: string;
  blurb: string | null;
  status: AreaStatus;
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
  blurb: string | null;
  status: AreaStatus;
  member_count: number;
  post_count: number;
  slow_mode: boolean;
  opened_at: string | null;
};

const AREA_COLUMNS =
  "id, slug, name, kind, city, state_code, blurb, status, member_count, post_count, slow_mode, opened_at";

function toSummary(row: AreaRow): AreaSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    kind: row.kind,
    city: row.city,
    stateCode: row.state_code,
    blurb: row.blurb,
    status: row.status,
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
export async function getArea(slug: string): Promise<AreaDetail | null> {
  if (!isSupabaseConfigured()) return null;

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
