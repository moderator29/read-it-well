import "server-only";

import { requireAdmin } from "../guard";

/**
 * The open review contests behind the reports on a page of the Reports lane,
 * keyed by report id, with what a moderator needs to judge one in place: the
 * review itself (rating and words), the place it is about, the reason the
 * lister chose and their private note.
 *
 * READ ONLY, through the operator's RLS-bound client, never the service role.
 * `review_contests` is readable by admins (`review_contests_staff_select`);
 * an operator it answers nothing for sees the report's ordinary controls, and
 * resolving it there closes the contest as kept (the C4b trigger). Any error
 * reads as "no contests", so the lane never breaks on this.
 */
export type ContestView = {
  id: string;
  reportId: string;
  reviewId: string;
  criterion: string;
  note: string | null;
  rating: number | null;
  body: string | null;
  place: string | null;
  hidden: boolean;
};

type Row = Record<string, unknown>;
type Untyped = {
  from: (t: string) => {
    select: (cols: string) => {
      in: (c: string, v: string[]) => PromiseLike<{ data: Row[] | null; error: unknown }> & {
        eq: (c: string, v: string) => PromiseLike<{ data: Row[] | null; error: unknown }>;
      };
    };
  };
};

const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

export async function getOpenContestsByReport(reportIds: string[]): Promise<Map<string, ContestView>> {
  const out = new Map<string, ContestView>();
  if (reportIds.length === 0) return out;
  const access = await requireAdmin("moderation");
  if (access.state !== "admin") return out;
  const db = access.supabase as unknown as Untyped;
  try {
    const { data: contests, error } = await db
      .from("review_contests")
      .select("id, review_id, report_id, criterion, note")
      .in("report_id", reportIds)
      .eq("status", "open");
    if (error || !contests || contests.length === 0) return out;

    const reviewIds = [...new Set(contests.map((c) => str(c.review_id)).filter((v): v is string => Boolean(v)))];
    const { data: reviews } = await db
      .from("reviews")
      .select("id, rating, body, hidden_at, listing_id, accommodation_id")
      .in("id", reviewIds);
    const reviewOf = new Map((reviews ?? []).map((r) => [str(r.id), r]));

    const listingIds = (reviews ?? []).map((r) => str(r.listing_id)).filter((v): v is string => Boolean(v));
    const placeIds = (reviews ?? []).map((r) => str(r.accommodation_id)).filter((v): v is string => Boolean(v));
    const [listings, places] = await Promise.all([
      listingIds.length ? db.from("listings").select("id, title").in("id", listingIds) : Promise.resolve({ data: [] as Row[] }),
      placeIds.length ? db.from("accommodations").select("id, name").in("id", placeIds) : Promise.resolve({ data: [] as Row[] }),
    ]);
    const nameOf = new Map<string, string>();
    for (const l of listings.data ?? []) if (str(l.id) && str(l.title)) nameOf.set(str(l.id)!, str(l.title)!);
    for (const a of places.data ?? []) if (str(a.id) && str(a.name)) nameOf.set(str(a.id)!, str(a.name)!);

    for (const c of contests) {
      const id = str(c.id);
      const reportId = str(c.report_id);
      const reviewId = str(c.review_id);
      if (!id || !reportId || !reviewId) continue;
      const r = reviewOf.get(reviewId);
      out.set(reportId, {
        id,
        reportId,
        reviewId,
        criterion: str(c.criterion) ?? "",
        note: str(c.note),
        rating: typeof r?.rating === "number" ? r.rating : null,
        body: str(r?.body),
        place: nameOf.get(str(r?.listing_id) ?? str(r?.accommodation_id) ?? "") ?? null,
        hidden: Boolean(r?.hidden_at),
      });
    }
  } catch {
    return new Map();
  }
  return out;
}
