import { QueueSkeleton } from "../_components/QueueSkeleton";

/** The wait on the payments desk. The console's shared queue shape, so the rows land where the real ones will. */
export default function LoadingAdminPayments() {
  return <QueueSkeleton label="Loading payment health" rows={3} />;
}
