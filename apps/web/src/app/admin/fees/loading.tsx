import { QueueSkeleton } from "../_components/QueueSkeleton";

/** The wait on the fee controls. The console's shared queue shape, so the rows land where the real ones will. */
export default function LoadingAdminFees() {
  return <QueueSkeleton label="Loading the fee controls" rows={4} />;
}
