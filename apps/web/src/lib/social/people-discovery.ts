import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSession } from "../actions/session";
import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import { readPersonBadges, type BadgeTier } from "../trust/badge-tier";
import { parseEntries, type DirEntry } from "../directory/model";
import { readFollowSuggestions, type FollowSuggestion } from "./follow-suggestions";
import {
  ROW_LIMIT,
  directoryRow,
  mostFollowedRow,
  realCount,
  visibleRows,
  type DiscoveryRow,
  type FollowedProfile,
  type ProfileFacts,
} from "./people-discovery-model";

/**
 * What the people page reads, in one place.
 *
 * Every part is its own try: a directory function that is missing, a profile
 * read that fails, or a suggestions read that is not applied hides ITS section
 * and leaves the others, rather than blanking the page or drawing a guess.
 *
 * Reads, all through the viewer's own RLS-bound client (or the anonymous one):
 *   public.directory(side)            the directory's ranked entries
 *   social_profiles                   follower_count, handle, avatar, side
 *   person_badge                      the published badge, via readPersonBadges
 *   follows                           whether the viewer already follows
 *   social_follow_suggestions(...)    the "People to follow" list
 * Nothing here writes, and nothing is invented.
 */
export type PeopleDiscovery =
  | { state: "unavailable" }
  | {
      state: "ready";
      signedIn: boolean;
      rows: DiscoveryRow[];
      suggestions: FollowSuggestion[];
    };

type Rpc = { rpc: (fn: string, args: object) => Promise<{ data: unknown; error: unknown }> };

type ProfileRow = {
  user_id: string;
  handle: string;
  display_label: string | null;
  avatar_path: string | null;
  follower_count: number | null;
  supply_role: string | null;
};

const PROFILE_COLUMNS = "user_id, handle, display_label, avatar_path, follower_count, supply_role";

async function readEntries(db: SupabaseClient, side: "property" | "stays"): Promise<DirEntry[]> {
  try {
    const { data, error } = await (db as unknown as Rpc).rpc("directory", {
      p_side: side,
      p_state: null,
      p_query: null,
      p_limit: 120,
    });
    if (error) return [];
    return parseEntries(data, side);
  } catch {
    return [];
  }
}

export async function readPeopleDiscovery(input: { city?: string | null } = {}): Promise<PeopleDiscovery> {
  if (!isSupabaseConfigured()) return { state: "unavailable" };
  try {
    const session = await resolveSession();
    const db = (session.state === "signed-in" ? session.supabase : await createClient()) as unknown as SupabaseClient;
    const viewerId = session.state === "signed-in" ? session.user.id : null;

    const [property, stays, followed] = await Promise.all([
      readEntries(db, "property"),
      readEntries(db, "stays"),
      db
        .from("social_profiles")
        .select(PROFILE_COLUMNS)
        .gt("follower_count", 0)
        .order("follower_count", { ascending: false })
        .limit(ROW_LIMIT)
        .then(
          (r) => (r.error || !r.data ? [] : (r.data as unknown as ProfileRow[])),
          () => [] as ProfileRow[],
        ),
    ]);

    /* One read for the handles the directory named, so a card can carry its
       follower count, face and side without a read per card. */
    const handles = Array.from(
      new Set(property.filter((e) => (e.kind === "agent" || e.kind === "landlord") && e.ref).map((e) => e.ref as string)),
    ).slice(0, 120);
    let named: ProfileRow[] = [];
    if (handles.length > 0) {
      try {
        const { data } = await db.from("social_profiles").select(PROFILE_COLUMNS).in("handle", handles);
        named = (data ?? []) as unknown as ProfileRow[];
      } catch {
        named = [];
      }
    }

    const everyone = [...named, ...followed];
    const ids = Array.from(new Set(everyone.map((p) => p.user_id)));
    const [tiers, following] = await Promise.all([
      ids.length > 0 ? readPersonBadges(db, ids).catch(() => new Map<string, BadgeTier>()) : new Map<string, BadgeTier>(),
      (async () => {
        const set = new Set<string>();
        if (!viewerId || ids.length === 0) return set;
        try {
          const { data } = await db
            .from("follows")
            .select("followee_id")
            .eq("follower_id", viewerId)
            .in("followee_id", ids);
          for (const row of (data ?? []) as { followee_id: string }[]) set.add(row.followee_id);
        } catch {
          /* Nobody followed is the safe answer to a read that failed. */
        }
        return set;
      })(),
    ]);

    const factsOf = (p: ProfileRow): ProfileFacts => ({
      userId: p.user_id,
      followers: realCount(p.follower_count) ?? 0,
      tier: tiers.get(p.user_id) ?? "none",
      viewerFollows: following.has(p.user_id),
      isViewer: p.user_id === viewerId,
      avatarUrl: p.avatar_path || null,
      displayLabel: p.display_label,
    });
    const byHandle = new Map<string, ProfileFacts>();
    for (const p of named) byHandle.set(p.handle, factsOf(p));

    const popular: FollowedProfile[] = followed.map((p) => ({
      ...factsOf(p),
      handle: p.handle,
      supplyRole: p.supply_role === "owner" ? "owner" : p.supply_role === "agent" ? "agent" : null,
    }));

    const rows = visibleRows([
      directoryRow("top-landlords", property, byHandle),
      directoryRow("top-agents", property, byHandle),
      directoryRow("top-hotels", stays, byHandle),
      mostFollowedRow(popular),
    ]);

    let suggested = await readFollowSuggestions({ city: input.city ?? null, limit: 12 });
    if (suggested.state === "ready" && suggested.people.length === 0 && input.city) {
      suggested = await readFollowSuggestions({ city: null, limit: 12 });
    }

    return {
      state: "ready",
      signedIn: viewerId !== null,
      rows,
      suggestions: suggested.state === "ready" ? suggested.people : [],
    };
  } catch {
    return { state: "unavailable" };
  }
}
