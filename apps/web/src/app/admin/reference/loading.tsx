import { QueueSkeleton } from "../_components/QueueSkeleton";

/** The wait on the reference data. The console's shared queue shape, so the rows land where the real ones will. */
export default function LoadingAdminReference() {
  return <QueueSkeleton label="Loading the reference data" rows={5} />;
}
