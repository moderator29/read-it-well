import { QueueSkeleton } from "../_components/QueueSkeleton";

/** Listing review. Every card is a decision that puts supply live or holds it
 *  back, so the queue is worked in long sittings and pays for the skeleton
 *  many times over. */
export default function LoadingListingReview() {
  return <QueueSkeleton label="Loading listings for review" rows={5} />;
}
