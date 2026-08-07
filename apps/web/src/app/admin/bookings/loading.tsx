import { QueueSkeleton } from "../_components/QueueSkeleton";

/** The wait on the bookings queue. The console's shared queue shape, so the rows land where the real ones will. */
export default function LoadingAdminBookings() {
  return <QueueSkeleton label="Loading the bookings queue" rows={5} />;
}
