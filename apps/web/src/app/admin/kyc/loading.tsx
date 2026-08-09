import { QueueSkeleton } from "../_components/QueueSkeleton";

/** The wait on the verification queue. The console's shared queue shape, so the rows land where the real ones will. */
export default function LoadingAdminKyc() {
  return <QueueSkeleton label="Loading the verification queue" rows={4} />;
}
