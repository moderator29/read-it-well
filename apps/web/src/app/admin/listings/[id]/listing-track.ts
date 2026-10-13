import { trackStates, type TrackStepModel } from "@/components/app/status/tracks";

/**
 * WHERE A LISTING STANDS, AS STEPS (reference 7118, "listing approval status").
 *
 * Every step here is a status the listing really has: it is submitted, it is in
 * review (SUBMITTED, UNDER_REVIEW and MORE_INFO_REQUIRED are all "the review is
 * open"), it is decided (APPROVED, or REJECTED where the track stops), and it
 * is live (PUBLISHED, which only a publish decision reaches).
 *
 * TIMES ARE ONLY THE ONES THE RECORD KEEPS. A listing stores when it was
 * submitted, when it was last decided (`reviewed_at`, overwritten by each
 * decision) and when it FIRST went live (`published_at`, kept), and nothing
 * else: not when review began, not when it was approved once it has been
 * published since, and not when it came back to PUBLISHED after a stop. So
 * `submitted` carries `submitted_at`, the step the last decision created
 * carries `reviewed_at`, and every other step carries no time and the track
 * prints none.
 *
 * LIVE IS DATED ONLY WHEN THE RECORD DATES IT. A publish decision writes
 * `reviewed_at` and (the first time) `published_at` in one update, so the two
 * are the same instant exactly when the last decision was that first publish.
 * When they differ, the last decision is something later (a listing that was
 * stopped and came back to PUBLISHED), `reviewed_at` is not the date it went
 * live, and the record has no date for the return, so Live is drawn undated
 * rather than carrying an old date it does not own. Without a `publishedAt` at
 * all (a caller that does not read it) the decision date is used, as before. A DRAFT has not entered the flow,
 * and a SUSPENDED listing's earlier state is not recorded, so neither is drawn:
 * a track that guessed where a suspension happened would be inventing history.
 */
export type ListingStepKey = "submitted" | "review" | "decision" | "live";

export function listingTrack(input: {
  status: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  /** The first time it went live. Optional: see "Live is dated only when the record dates it". */
  publishedAt?: string | null | undefined;
}): TrackStepModel<ListingStepKey>[] | null {
  const { status, submittedAt, reviewedAt, publishedAt } = input;
  let states: ReturnType<typeof trackStates>;
  let decidedAt: string | null = null;
  let liveAt: string | null = null;
  switch (status) {
    case "SUBMITTED":
    case "UNDER_REVIEW":
    case "MORE_INFO_REQUIRED":
      states = trackStates(4, 1, "open");
      break;
    case "APPROVED":
      states = trackStates(4, 3, "open");
      decidedAt = reviewedAt;
      break;
    case "PUBLISHED":
      states = trackStates(4, 3, "complete");
      liveAt = liveDate(reviewedAt, publishedAt);
      break;
    case "REJECTED":
      states = trackStates(4, 2, "failed");
      decidedAt = reviewedAt;
      break;
    default:
      return null;
  }
  return [
    { key: "submitted", at: submittedAt, state: states[0]! },
    { key: "review", at: null, state: states[1]! },
    { key: "decision", at: decidedAt, state: states[2]! },
    { key: "live", at: liveAt, state: states[3]! },
  ];
}

/** The decision's date as the Live date, only when it is the publish itself. */
function liveDate(reviewedAt: string | null, publishedAt: string | null | undefined): string | null {
  if (publishedAt === undefined) return reviewedAt;
  if (!reviewedAt || !publishedAt) return null;
  const decided = Date.parse(reviewedAt);
  const published = Date.parse(publishedAt);
  if (!Number.isFinite(decided) || !Number.isFinite(published)) return null;
  return decided === published ? reviewedAt : null;
}
