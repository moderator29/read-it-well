import { QueueSkeleton } from "../_components/QueueSkeleton";

/** The wait on the moderation queue. The console's shared queue shape, so the rows land where the real ones will. */
export default function LoadingAdminModeration() {
  return <QueueSkeleton label="Loading the moderation queue" rows={5} />;
}
