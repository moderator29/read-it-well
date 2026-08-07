import { QueueSkeleton } from "../_components/QueueSkeleton";

/** The wait on standing and badges. The console's shared queue shape, so the rows land where the real ones will. */
export default function LoadingAdminStanding() {
  return <QueueSkeleton label="Loading standing and badges" rows={4} />;
}
