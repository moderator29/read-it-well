/**
 * The pure half of the withheld-weight desk: the register's row, and what a
 * row says about itself once the review or report behind it is known.
 */
export type WeightRegisterRow = {
  kind: string;
  subject_id: string;
  reasons: string[] | null;
  stamped_at: string;
};

export type WeightRow = {
  kind: "review" | "report";
  subjectId: string;
  reasons: string[];
  stampedAt: string;
  /** The listing a review is about, when it is still readable. */
  listingTitle: string | null;
  rating: number | null;
  /** What a report is about (listing, post, member), when it is still readable. */
  target: string | null;
  /** The review or report row could not be found: say so, do not invent. */
  gone: boolean;
};

export type WeightLookups = {
  reviews: Map<string, { listingId: string | null; rating: number | null }>;
  reports: Map<string, { target: string | null }>;
  listings: Map<string, string>;
};

export function shapeWeightRows(register: readonly WeightRegisterRow[], lookups: WeightLookups): WeightRow[] {
  const out: WeightRow[] = [];
  for (const row of register) {
    if (row.kind !== "review" && row.kind !== "report") continue;
    const reasons = Array.isArray(row.reasons) ? row.reasons.filter((r) => typeof r === "string") : [];
    if (row.kind === "review") {
      const review = lookups.reviews.get(row.subject_id);
      out.push({
        kind: "review",
        subjectId: row.subject_id,
        reasons,
        stampedAt: row.stamped_at,
        listingTitle: review?.listingId ? (lookups.listings.get(review.listingId) ?? null) : null,
        rating: review?.rating ?? null,
        target: null,
        gone: !review,
      });
    } else {
      const report = lookups.reports.get(row.subject_id);
      out.push({
        kind: "report",
        subjectId: row.subject_id,
        reasons,
        stampedAt: row.stamped_at,
        listingTitle: null,
        rating: null,
        target: report?.target ?? null,
        gone: !report,
      });
    }
  }
  return out;
}
