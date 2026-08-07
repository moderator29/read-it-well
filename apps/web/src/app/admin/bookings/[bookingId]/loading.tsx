import { QueueSkeleton } from "../../_components/QueueSkeleton";

/** The wait on one booking's admin record. One card, the console's own shape. */
export default function LoadingAdminBooking() {
  return <QueueSkeleton label="Loading this booking" rows={2} />;
}
