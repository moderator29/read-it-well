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
 * submitted and when it was last decided (`reviewed_at`, overwritten by each
 * decision), and nothing else: not when review began, not when it was approved
 * once it has been published since. So `submitted` carries `submitted_at`, the
 * step the last decision created carries `reviewed_at`, and every other step
 * carries no time and the track prints none. A DRAFT has not entered the flow,
 * and a SUSPENDED listing's earlier state is not recorded, so neither is drawn:
 * a track that guessed where a suspension happened would be inventing history.
 */
export type ListingStepKey = "submitted" | "review" | "decision" | "live";

export function listingTrack(input: {
  status: string;
  submittedAt: string | null;
  reviewedAt: string | null;
}): TrackStepModel<ListingStepKey>[] | null {
  const { status, submittedAt, reviewedAt } = input;
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
      liveAt = reviewedAt;
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
