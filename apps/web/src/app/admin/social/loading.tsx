import { QueueSkeleton } from "../_components/QueueSkeleton";

/** The wait on the social queue. The console's shared queue shape, so the rows land where the real ones will. */
export default function LoadingAdminSocial() {
  return <QueueSkeleton label="Loading the social queue" rows={4} />;
}
