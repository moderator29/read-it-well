import { QueueSkeleton } from "../_components/QueueSkeleton";

/** The wait on the stops queue. The console's shared queue shape, so the rows land where the real ones will. */
export default function LoadingAdminStops() {
  return <QueueSkeleton label="Loading the stops queue" rows={4} />;
}
