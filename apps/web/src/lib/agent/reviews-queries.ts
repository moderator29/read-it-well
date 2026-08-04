import "server-only";

import { formatDate, type Locale } from "@naijafinds/i18n";
import { getAgentContext } from "./listings-queries";

/**
 * Read side of the host reviews console.
 *
 * Guests have been able to review a completed stay since the reviews write
 * path shipped, and the rating went straight onto the public listing page. The
 * host could see it there, alongside every visitor, with no way to answer and
 * no way to tell which ones were still unanswered. /agent/reviews was an
 * eleven-line coming-soon stub.
 *
 * Everything reads through the agent's own RLS-bound client. reviews_select
 * now carries an owner clause, so a host sees reviews of their own listings
 * even while a listing is paused, and sees nothing about anyone else's.
 *
 * Nothing here throws. Every failure degrades into a renderable state.
 */

export type AgentReview = {
  id: string;
  listingId: string;
  listingTitle: string;
  rating: number;
  body: string | null;
  /** Shortened public name, written by the database, never by the client. */
  author: string;
  /** e.g. "4 Aug 2026". */
  when: string;
  /** Sort key, kept out of the display path. */
  createdAt: string;
  /** The host's own answer, when they have written one. */
  response: { body: string; when: string } | null;
};

export type AgentReviewsSummary = {
  total: number;
  /** Mean rating across every review, to one decimal. Zero when there are none. */
  average: number;
  /** How many still have no answer from the host. */
  unanswered: number;
  /** How many stars, per star, newest included. Index 0 is one star. */
  distribution: [number, number, number, number, number];
};

export type AgentReviewsRead =
  | { state: "unconfigured" }
  | { state: "signed-out" }
  | { state: "not-agent" }
  | { state: "unavailable" }
  | { state: "ready"; reviews: AgentReview[]; summary: AgentReviewsSummary };

type ReviewRow = {
  id: string;
  listing_id: string;
  rating: number;
  body: string | null;
  author_label: string | null;
  created_at: string;
};

/** How many reviews one console read pulls. */
const REVIEW_LIMIT = 200;

export async function getAgentReviews(locale: Locale): Promise<AgentReviewsRead> {
  const context = await getAgentContext();
  if (context.state === "unconfigured") return { state: "unconfigured" };
  if (context.state === "signed-out") return { state: "signed-out" };
  if (context.state === "not-agent") return { state: "not-agent" };

  try {
    // The agent's listings first, because a review carries a listing id and a
    // host wants to read the title. One query, then one keyed read, never a
    // round trip per review.
    const { data: listings, error: listingsError } = await context.supabase
      .from("listings")
      .select("id, title")
      .eq("agent_id", context.agent.id);
    if (listingsError) return { state: "unavailable" };

    const titles = new Map<string, string>();
    for (const row of listings ?? []) titles.set(row.id, row.title);

    if (titles.size === 0) {
      return {
        state: "ready",
        reviews: [],
        summary: { total: 0, average: 0, unanswered: 0, distribution: [0, 0, 0, 0, 0] },
      };
    }

    const { data, error } = await context.supabase
      .from("reviews")
      .select("id, listing_id, rating, body, author_label, created_at")
      .in("listing_id", [...titles.keys()])
      .order("created_at", { ascending: false })
      .limit(REVIEW_LIMIT);
    if (error) return { state: "unavailable" };

    const rows = (data ?? []) as ReviewRow[];

    // Answers in one read, keyed by the review they belong to.
    const answers = new Map<string, { body: string; when: string }>();
    if (rows.length > 0) {
      const { data: responses } = await context.supabase
        .from("review_responses")
        .select("review_id, body, updated_at")
        .in(
          "review_id",
          rows.map((r) => r.id),
        );
      for (const row of responses ?? []) {
        answers.set(row.review_id, {
          body: row.body,
          when: formatDate(new Date(row.updated_at), locale),
        });
      }
    }

    const reviews: AgentReview[] = rows.map((row) => ({
      id: row.id,
      listingId: row.listing_id,
      listingTitle: titles.get(row.listing_id) ?? "Your listing",
      rating: row.rating,
      body: row.body,
      author: row.author_label ?? "RentMe guest",
      when: formatDate(new Date(row.created_at), locale),
      createdAt: row.created_at,
      response: answers.get(row.id) ?? null,
    }));

    const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0];
    let sum = 0;
    for (const review of reviews) {
      sum += review.rating;
      const index = Math.min(5, Math.max(1, review.rating)) - 1;
      distribution[index] = (distribution[index] ?? 0) + 1;
    }

    return {
      state: "ready",
      reviews,
      summary: {
        total: reviews.length,
        average: reviews.length > 0 ? Math.round((sum / reviews.length) * 10) / 10 : 0,
        unanswered: reviews.filter((r) => r.response === null).length,
        distribution,
      },
    };
  } catch {
    return { state: "unavailable" };
  }
}
