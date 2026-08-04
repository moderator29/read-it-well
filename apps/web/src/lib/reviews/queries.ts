import "server-only";

import { formatDate, type Locale } from "@naijafinds/i18n";
import { resolveSession } from "../actions/session";
import { lagosToday } from "../bookings/schema";
import { getListingRepository } from "../listings/repository";
import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";

/**
 * Read side of the reviews loop.
 *
 * The eligibility rules here mirror the reviews_insert_own policy exactly, so
 * the screen and the database agree about who may review what. The database is
 * still the authority: this read exists to explain the answer, never to be the
 * answer. A guest who somehow gets past the screen is refused by RLS anyway.
 *
 * Every failure degrades into a renderable state. Nothing here throws.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A written review as a listing page renders it. */
export type ListingReview = {
  id: string;
  rating: number;
  body: string | null;
  /** Shortened public name, written by the database, never by the client. */
  author: string;
  /** e.g. "4 Aug 2026". */
  when: string;
};

export type ReviewSubject = {
  bookingId: string;
  listingId: string;
  title: string;
  location: string;
  checkOutDisplay: string;
};

export type ReviewRead =
  | { state: "unconfigured" }
  | { state: "signed-out" }
  | { state: "missing" }
  | { state: "unavailable" }
  /** The stay exists but cannot be reviewed, and we say plainly why. */
  | { state: "not-eligible"; subject: ReviewSubject; reason: "cancelled" | "unconfirmed" | "not-finished" }
  | { state: "already-reviewed"; subject: ReviewSubject; review: ListingReview }
  | { state: "ready"; subject: ReviewSubject };

/**
 * Written reviews for a listing, newest first.
 *
 * Read through whatever client the caller has, which for a signed-out visitor
 * is the anon client: reviews_select allows anyone to read reviews of a
 * PUBLISHED listing, which is what makes a listing page's reviews section work
 * before anyone signs in. Returns an empty list rather than throwing, so a
 * reviews read can never take a listing page down.
 */
export async function getListingReviews(
  listingId: string,
  locale: Locale,
  limit = 20,
): Promise<ListingReview[]> {
  if (!isSupabaseConfigured() || !UUID_RE.test(listingId)) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("reviews")
      .select("id, rating, body, author_label, created_at")
      .eq("listing_id", listingId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((row) => ({
      id: row.id,
      rating: row.rating,
      body: row.body,
      author: row.author_label ?? "RentMe guest",
      when: formatDate(new Date(row.created_at), locale),
    }));
  } catch {
    return [];
  }
}

/**
 * Everything the review screen needs for one booking, read under the guest's
 * own RLS client so a booking that is not theirs simply does not come back.
 */
export async function getReviewView(bookingId: string, locale: Locale): Promise<ReviewRead> {
  if (!UUID_RE.test(bookingId)) return { state: "missing" };

  const session = await resolveSession();
  if (session.state === "unconfigured") return { state: "unconfigured" };
  if (session.state === "signed-out") return { state: "signed-out" };

  try {
    const { data: booking, error } = await session.supabase
      .from("bookings")
      .select("id, listing_id, status, check_out")
      .eq("id", bookingId)
      .maybeSingle();

    if (error) return { state: "unavailable" };
    if (!booking) return { state: "missing" };

    // Display data: the platform listing row first, the seed catalogue as the
    // fallback, a plain placeholder after that. Same ladder the trips hub uses.
    const { data: listingRow } = await session.supabase
      .from("listings")
      .select("title, area, city")
      .eq("id", booking.listing_id)
      .maybeSingle();

    const seed = listingRow ? null : await getListingRepository().byId(booking.listing_id);

    const subject: ReviewSubject = {
      bookingId: booking.id,
      listingId: booking.listing_id,
      title: listingRow?.title ?? seed?.title ?? "Your stay",
      location: [listingRow?.area ?? seed?.area, listingRow?.city ?? seed?.city]
        .filter(Boolean)
        .join(", "),
      checkOutDisplay: formatDate(new Date(`${booking.check_out}T12:00:00Z`), locale),
    };

    // An existing review wins over every other state: the guest should see what
    // they wrote, not be told they are ineligible to write it again.
    const { data: existing } = await session.supabase
      .from("reviews")
      .select("id, rating, body, author_label, created_at")
      .eq("booking_id", booking.id)
      .maybeSingle();

    if (existing) {
      return {
        state: "already-reviewed",
        subject,
        review: {
          id: existing.id,
          rating: existing.rating,
          body: existing.body,
          author: existing.author_label ?? "RentMe guest",
          when: formatDate(new Date(existing.created_at), locale),
        },
      };
    }

    if (booking.status === "CANCELLED") {
      return { state: "not-eligible", subject, reason: "cancelled" };
    }
    if (booking.status !== "CONFIRMED") {
      return { state: "not-eligible", subject, reason: "unconfirmed" };
    }
    if (booking.check_out > lagosToday()) {
      return { state: "not-eligible", subject, reason: "not-finished" };
    }

    return { state: "ready", subject };
  } catch {
    return { state: "unavailable" };
  }
}
