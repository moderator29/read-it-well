import "server-only";

import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import { resolveSession } from "../actions/session";
import { readPersonBadges, type BadgeTier } from "../trust/badge-tier";

/**
 * ACCOUNTS TO FOLLOW, VALLO'S WAY: the agents, agencies, landlords, hotels and
 * restaurants doing published work in the member's city (or everywhere),
 * ranked by verified and by how much they have published. One read, the
 * `social_follow_suggestions` function (pending migration
 * `p2_social_follow_suggestions`), serves the feed's block and the social
 * search page.
 *
 * Until that function is applied the read fails and this answers
 * `unavailable`, and both surfaces draw nothing rather than a guess: a
 * suggestion is never invented, and a location is never assumed. The caller
 * passes the city it already holds (the member's place) or nothing.
 */
export const FOLLOW_KINDS = ["agent", "agency", "landlord", "hotel", "restaurant"] as const;
export type FollowKind = (typeof FOLLOW_KINDS)[number];

export function isFollowKind(value: string | null | undefined): value is FollowKind {
  return Boolean(value) && (FOLLOW_KINDS as readonly string[]).includes(value as string);
}

export type FollowSuggestion = {
  userId: string;
  handle: string;
  displayLabel: string;
  avatarUrl: string;
  kind: FollowKind;
  city: string | null;
  verified: boolean;
  /** The published badge (`person_badge`), never inferred from `verified`. */
  tier: BadgeTier;
};

export type FollowSuggestions =
  | { state: "unavailable" }
  | { state: "ready"; signedIn: boolean; people: FollowSuggestion[]; more: boolean };

export async function readFollowSuggestions(input: {
  city?: string | null;
  kind?: FollowKind | null;
  query?: string | null;
  limit?: number;
  offset?: number;
}): Promise<FollowSuggestions> {
  if (!isSupabaseConfigured()) return { state: "unavailable" };
  const limit = Math.min(Math.max(input.limit ?? 6, 1), 50);
  try {
    const session = await resolveSession();
    const supabase = session.state === "signed-in" ? session.supabase : await createClient();
    const { data, error } = await (
      supabase as unknown as {
        rpc: (fn: string, args: object) => Promise<{ data: unknown; error: unknown }>;
      }
    ).rpc("social_follow_suggestions", {
      p_city: input.city?.trim() || null,
      p_kind: input.kind ?? null,
      p_query: input.query?.trim().slice(0, 40) || null,
      /* One more than shown, so "Show more" is only offered when there is more. */
      p_limit: limit + 1,
      p_offset: Math.max(input.offset ?? 0, 0),
    });
    if (error || !Array.isArray(data)) return { state: "unavailable" };
    const rows = (data as {
      user_id: string;
      handle: string;
      display_label: string | null;
      avatar_path: string | null;
      kind: string;
      city: string | null;
      verified: boolean | null;
    }[]).filter((row) => isFollowKind(row.kind));
    const shown = rows.slice(0, limit);
    /* The mark on a name is the published badge and nothing else, read the
       way every other surface reads it; `verified` only ranks. */
    const tiers = await readPersonBadges(supabase, shown.map((row) => row.user_id));
    return {
      state: "ready",
      signedIn: session.state === "signed-in",
      more: rows.length > limit,
      people: shown.map((row) => ({
        tier: tiers.get(row.user_id) ?? "none",
        userId: row.user_id,
        handle: row.handle,
        displayLabel: row.display_label || `@${row.handle}`,
        avatarUrl: row.avatar_path ?? "",
        kind: row.kind as FollowKind,
        city: row.city,
        verified: Boolean(row.verified),
      })),
    };
  } catch {
    return { state: "unavailable" };
  }
}
