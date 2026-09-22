import { QueueSkeleton } from "../_components/QueueSkeleton";

/** The wait on the supply desk. The console's shared queue shape, so the rows land where the real ones will. */
export default function LoadingAdminSupply() {
  return <QueueSkeleton label="Loading the supply desk" rows={4} />;
}
