import { QueueSkeleton } from "../../_components/QueueSkeleton";

/** The wait on the reservations queue, in the console's shared queue shape. */
export default function LoadingAdminReservations() {
  return <QueueSkeleton label="Loading the reservations queue" rows={5} />;
}
