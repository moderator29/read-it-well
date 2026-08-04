import "server-only";

/**
 * What sits under the tabs on a person's page.
 *
 * A normal person and an agent are asked different questions about themselves,
 * so they get different tabs: Posts, Replies, Media and Activity for one,
 * Properties, Stories, Reviews and Activity for the other. This module is the
 * four reads the second set needs, plus the grid the first set's Media tab
 * renders.
 *
 * Every one goes through the caller's own row level security bound client. The
 * interesting consequence is on Activity: `post_reactions_select` publishes
 * `LIKE` rows and keeps every other mark private to its author, so "what this
 * person liked" is a public fact by design and "what they saved" is not. That
 * distinction is the database's, and this file does not restate it.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import { resolveSession } from "../actions/session";
import type { Database } from "../supabase/database.types";
import { signMedia, type PostMediaItem } from "./posts-media";

const LIMIT = 30;

async function reader() {
  const session = await resolveSession();
  const supabase = session.state === "signed-in" ? session.supabase : await createClient();
  const viewerId = session.state === "signed-in" ? session.user.id : null;
  return { supabase, viewerId };
}

/* --------------------------------------------------------------- Properties */

export type PropertyCard = {
  id: string;
  title: string;
  area: string;
  city: string;
  priceMinor: number;
  pricePeriod: "night" | "year";
  bedrooms: number;
  bathrooms: number;
  photoUrl: string | null;
};

/**
 * An agent's live listings.
 *
 * Keyed on the `agents.id` projected onto the social profile, because `agents`
 * itself is readable only by its owner and by an admin, so there is no way to
 * walk from a person to their listings without that projection. When it is
 * absent this answers with an empty list and the profile does not offer the tab
 * at all, rather than offering one that could only ever be empty.
 *
 * `listings_select_published` does the filtering, so a draft or a rejected
 * listing cannot appear here even if this forgot to ask.
 */
export async function getAgentProperties(agentId: string | null): Promise<PropertyCard[]> {
  if (!isSupabaseConfigured() || !agentId) return [];
  const { supabase } = await reader();

  try {
    const { data, error } = await supabase
      .from("listings")
      .select(
        "id, title, area, city, price_per_night_minor, price_period, bedrooms, bathrooms, listing_photos ( storage_path, position )",
      )
      .eq("agent_id", agentId)
      .eq("status", "PUBLISHED")
      .order("published_at", { ascending: false })
      .limit(LIMIT);
    if (error || !data) return [];

    return data.map((row) => {
      const photos = (row.listing_photos ?? []) as { storage_path: string; position: number }[];
      const first = [...photos].sort((a, b) => a.position - b.position)[0];
      return {
        id: row.id,
        title: row.title,
        area: row.area ?? "",
        city: row.city ?? "",
        priceMinor: Number(row.price_per_night_minor ?? 0),
        pricePeriod: row.price_period === "year" ? "year" : "night",
        bedrooms: row.bedrooms ?? 0,
        bathrooms: row.bathrooms ?? 0,
        photoUrl: first ? first.storage_path : null,
      };
    });
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ Reviews */

export type ReviewCard = {
  id: string;
  rating: number;
  body: string;
  createdLabel: string;
  listingTitle: string;
  authorLabel: string;
};

/**
 * What guests said about this agent's places.
 *
 * `reviews_select` already limits this to reviews on published listings plus
 * the reader's own, so a review sitting on a listing that was taken down does
 * not resurface here.
 */
export async function getAgentReviews(agentId: string | null): Promise<ReviewCard[]> {
  if (!isSupabaseConfigured() || !agentId) return [];
  const { supabase } = await reader();

  try {
    const { data: listings } = await supabase
      .from("listings")
      .select("id, title")
      .eq("agent_id", agentId)
      .eq("status", "PUBLISHED")
      .limit(100);
    const rows = (listings ?? []) as { id: string; title: string }[];
    if (rows.length === 0) return [];
    const titleById = new Map(rows.map((l) => [l.id, l.title]));

    const { data, error } = await supabase
      .from("reviews")
      .select("id, rating, body, created_at, listing_id, author_id")
      .in(
        "listing_id",
        rows.map((l) => l.id),
      )
      .order("created_at", { ascending: false })
      .limit(LIMIT);
    if (error || !data) return [];

    const authorIds = [
      ...new Set(data.map((r) => r.author_id).filter((v): v is string => Boolean(v))),
    ];
    const { data: authors } = authorIds.length
      ? await supabase
          .from("social_profiles")
          .select("user_id, display_label, handle")
          .in("user_id", authorIds)
      : { data: [] as never[] };
    const labelById = new Map(
      ((authors ?? []) as { user_id: string; display_label: string | null; handle: string }[]).map(
        (a) => [a.user_id, a.display_label || `@${a.handle}`],
      ),
    );

    return data.map((row) => ({
      id: row.id,
      rating: Number(row.rating ?? 0),
      body: row.body ?? "",
      createdLabel: monthYear(row.created_at),
      listingTitle: titleById.get(row.listing_id) ?? "a stay",
      /* A guest who never claimed a handle is "A guest", not a blank. Naming
         somebody who has no public identity would be inventing one for them. */
      authorLabel: (row.author_id && labelById.get(row.author_id)) || "A guest",
    }));
  } catch {
    return [];
  }
}

/* -------------------------------------------------------------------- Media */

export type MediaTile = {
  postId: string;
  url: string;
  width: number | null;
  height: number | null;
};

/**
 * Every picture this person has posted, as a grid rather than as cards.
 *
 * `social-media` is a private bucket read through `private.can_see_post`, so
 * these are signed URLs with a short life rather than public ones. That is the
 * whole reason a media grid is a different read from a media feed: forty signed
 * URLs in one call, not one call per card.
 */
export async function getProfileMediaGrid(userId: string): Promise<MediaTile[]> {
  if (!isSupabaseConfigured()) return [];
  const { supabase } = await reader();

  try {
    const { data, error } = await supabase
      .from("posts")
      .select("id, created_at, post_media!inner ( storage_path, position, width, height )")
      .eq("author_id", userId)
      .order("created_at", { ascending: false })
      .limit(60);
    if (error || !data) return [];

    const items: PostMediaItem[] = [];
    for (const row of data as unknown as {
      id: string;
      post_media: { storage_path: string; position: number; width: number | null; height: number | null }[];
    }[]) {
      for (const media of [...(row.post_media ?? [])].sort((a, b) => a.position - b.position)) {
        items.push({
          postId: row.id,
          storagePath: media.storage_path,
          width: media.width,
          height: media.height,
        });
      }
    }

    const signed = await signMedia(supabase, items);
    return signed.map((item) => ({
      postId: item.postId,
      url: item.url,
      width: item.width,
      height: item.height,
    }));
  } catch {
    return [];
  }
}

/** "May 2025", for a joined line and a review date. */
export function monthYear(iso: string): string {
  if (!iso || !Number.isFinite(new Date(iso).getTime())) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      month: "long",
      year: "numeric",
      timeZone: "Africa/Lagos",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export type { SupabaseClient, Database };
