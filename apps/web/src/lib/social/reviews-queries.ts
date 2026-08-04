import "server-only";

/**
 * What guests said about the stays in one place.
 *
 * The Reviews chip on a district feed used to hold a paragraph explaining why
 * it could not work. A control that explains its own impossibility is still a
 * dead end, and this is the read that removes it.
 *
 * **The join is on the place, not on a foreign key, and that is honest rather
 * than lazy.** `public.reviews` points at a listing, and a listing carries the
 * city and area strings the whole catalogue is filtered by, which is exactly
 * how `/search` finds a flat in Yaba. An `areas` row carries the same two
 * strings, seeded from the same vocabulary. So "reviews around here" is
 * "reviews of published listings whose city and area match this place", and it
 * is the same answer a person would get by searching the place by hand.
 *
 * `reviews_select` already limits the rows to reviews on published listings
 * plus the reader's own, so a review of a listing that has since been taken
 * down cannot resurface here, and nothing in this file has to remember that.
 *
 * Nothing here throws. A district feed that 500s because one review row has an
 * odd timestamp is worse than a district feed with a quiet chip.
 */

import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import { resolveSession } from "../actions/session";
import { monthYear, type ReviewCard } from "./profile-tabs-queries";

const LISTING_LIMIT = 120;
const REVIEW_LIMIT = 30;

export type { ReviewCard };

/**
 * Reviews of stays in one place, newest first.
 *
 * `area` is the neighbourhood string the listings themselves are filed under,
 * which is not always the place's display name: the UNILAG campus is filed
 * under Akoka, because that is where the flats are. The seed sets both, and
 * this falls back to the name when a place has no area of its own.
 */
export async function getPlaceReviews(place: {
  city: string;
  area: string | null;
  name: string;
}): Promise<ReviewCard[]> {
  if (!isSupabaseConfigured()) return [];

  const areaLabel = place.area?.trim() || place.name.trim();
  if (!areaLabel || !place.city.trim()) return [];

  const session = await resolveSession();
  const supabase = session.state === "signed-in" ? session.supabase : await createClient();

  try {
    const { data: listings, error: listingError } = await supabase
      .from("listings")
      .select("id, title")
      .eq("status", "PUBLISHED")
      .eq("city", place.city)
      .eq("area", areaLabel)
      .limit(LISTING_LIMIT);
    if (listingError || !listings || listings.length === 0) return [];

    const rows = listings as { id: string; title: string }[];
    const titleById = new Map(rows.map((row) => [row.id, row.title]));

    const { data, error } = await supabase
      .from("reviews")
      .select("id, rating, body, created_at, listing_id, author_id")
      .in(
        "listing_id",
        rows.map((row) => row.id),
      )
      .order("created_at", { ascending: false })
      .limit(REVIEW_LIMIT);
    if (error || !data || data.length === 0) return [];

    /* One keyed lookup for the names, not one per review. A guest who never
       claimed a handle is "A guest", never a blank and never their email. */
    const authorIds = [
      ...new Set(data.map((row) => row.author_id).filter((value): value is string => Boolean(value))),
    ];
    const { data: authors } = authorIds.length
      ? await supabase
          .from("social_profiles")
          .select("user_id, display_label, handle")
          .in("user_id", authorIds)
      : { data: [] as never[] };
    const labelById = new Map(
      ((authors ?? []) as { user_id: string; display_label: string | null; handle: string }[]).map(
        (author) => [author.user_id, author.display_label || `@${author.handle}`],
      ),
    );

    return data.map((row) => ({
      id: row.id,
      rating: Number(row.rating ?? 0),
      body: row.body ?? "",
      createdLabel: monthYear(row.created_at),
      listingTitle: titleById.get(row.listing_id) ?? "a stay",
      authorLabel: (row.author_id && labelById.get(row.author_id)) || "A guest",
    }));
  } catch {
    return [];
  }
}
