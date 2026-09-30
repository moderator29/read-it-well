import "server-only";

import { resolveSession } from "../actions/session";

/**
 * THE REVIEWS OF A HOST'S OWN HOTELS (C4, 30 September 2026), read under the
 * host's session.
 *
 * `reviews.accommodation_id`, the reply's `responder_id` and
 * `review_contests` arrive with the migration
 * `20260930084402_host_c4_reviews_reach_a_hotel_and_a_fair_contest.sql`
 * (applied 30 September 2026).
 * Until it is applied the first read fails on the missing column and the
 * page says reviews of hotel stays open soon, which is true: no hotel stay
 * can be reviewed before it.
 *
 * `reviews_select` lets anybody read a visible review of a published hotel,
 * so the read is narrowed to the caller's own accommodations explicitly; the
 * policy is what lets the host also see the ones staff hid.
 */

export type HostReview = {
  id: string;
  accommodationId: string;
  place: string;
  rating: number;
  body: string | null;
  author: string;
  createdAt: string;
  hiddenAt: string | null;
  hiddenNote: string | null;
  reply: { body: string; at: string } | null;
  contest: { status: string; criterion: string; publicNote: string | null; at: string } | null;
};

export type HostReviewsRead =
  | { state: "signed-out" }
  | { state: "not-ready" }
  | { state: "unavailable" }
  | { state: "ok"; reviews: HostReview[]; places: { id: string; name: string }[] };

type Untyped = {
  from: (t: string) => {
    select: (c: string) => {
      in: (col: string, v: string[]) => {
        order: (col: string, o: { ascending: boolean }) => { limit: (n: number) => PromiseLike<{ data: unknown; error: { code?: string } | null }> };
      } & PromiseLike<{ data: unknown; error: { code?: string } | null }>;
    };
  };
};

export async function readHostReviews(): Promise<HostReviewsRead> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return { state: "signed-out" };
  const db = session.supabase;
  try {
    const { data: businesses, error: bizError } = await db
      .from("businesses")
      .select("id, accommodations(id, name)")
      .eq("owner_id", session.user.id)
      .limit(50);
    if (bizError) return { state: "unavailable" };
    const places = ((businesses ?? []) as unknown as { accommodations: { id: string; name: string }[] | null }[]).flatMap(
      (b) => b.accommodations ?? [],
    );
    if (places.length === 0) return { state: "ok", reviews: [], places };

    const u = db as unknown as Untyped;
    const { data, error } = await u
      .from("reviews")
      .select("id, accommodation_id, rating, body, author_label, created_at, hidden_at, hidden_note")
      .in(
        "accommodation_id",
        places.map((p) => p.id),
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      if (error.code === "42703" || error.code === "PGRST204") return { state: "not-ready" };
      return { state: "unavailable" };
    }
    const rows = (data ?? []) as {
      id: string;
      accommodation_id: string;
      rating: number;
      body: string | null;
      author_label: string | null;
      created_at: string;
      hidden_at: string | null;
      hidden_note: string | null;
    }[];
    const ids = rows.map((r) => r.id);
    const [replies, contests] = ids.length
      ? await Promise.all([
          u.from("review_responses").select("review_id, body, updated_at").in("review_id", ids),
          u.from("review_contests").select("review_id, status, criterion, public_note, created_at").in("review_id", ids),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];
    const replyOf = new Map(
      ((replies.data ?? []) as { review_id: string; body: string; updated_at: string }[]).map((r) => [
        r.review_id,
        { body: r.body, at: r.updated_at },
      ]),
    );
    /* The newest contest of each review is the one that stands. */
    const contestOf = new Map<string, HostReview["contest"]>();
    for (const c of ((contests.data ?? []) as {
      review_id: string;
      status: string;
      criterion: string;
      public_note: string | null;
      created_at: string;
    }[]).sort((a, b) => a.created_at.localeCompare(b.created_at))) {
      contestOf.set(c.review_id, { status: c.status, criterion: c.criterion, publicNote: c.public_note, at: c.created_at });
    }
    const placeName = new Map(places.map((p) => [p.id, p.name]));
    return {
      state: "ok",
      places,
      reviews: rows.map((r) => ({
        id: r.id,
        accommodationId: r.accommodation_id,
        place: placeName.get(r.accommodation_id) ?? "Your hotel",
        rating: r.rating,
        body: r.body,
        author: r.author_label ?? "Vallo guest",
        createdAt: r.created_at,
        hiddenAt: r.hidden_at,
        hiddenNote: r.hidden_note,
        reply: replyOf.get(r.id) ?? null,
        contest: contestOf.get(r.id) ?? null,
      })),
    };
  } catch {
    return { state: "unavailable" };
  }
}
