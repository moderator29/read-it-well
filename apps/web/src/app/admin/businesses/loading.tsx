import { QueueSkeleton } from "../_components/QueueSkeleton";

/** Host applications. Each card is a decision that puts a venue in front of
 *  guests or holds it back, and the queue is worked in sittings, so the
 *  skeleton pays for itself the same way the listings one does. */
export default function LoadingBusinessReview() {
  return <QueueSkeleton label="Loading host applications" rows={4} />;
}
