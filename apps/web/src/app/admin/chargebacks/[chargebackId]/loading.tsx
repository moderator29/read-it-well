import { QueueSkeleton } from "../../_components/QueueSkeleton";

/** The wait on one chargeback, in the console's shared queue shape. */
export default function LoadingAdminChargeback() {
  return <QueueSkeleton label="Loading the chargeback" rows={3} />;
}
