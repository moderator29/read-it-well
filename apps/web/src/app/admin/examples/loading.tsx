import { QueueSkeleton } from "../_components/QueueSkeleton";

/** The wait on the example listings. The console's shared queue shape, so the rows land where the real ones will. */
export default function LoadingAdminExamples() {
  return <QueueSkeleton label="Loading the example listings" rows={4} />;
}
