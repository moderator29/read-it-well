import { QueueSkeleton } from "../_components/QueueSkeleton";

/** The wait on the chargebacks desk, in the console's shared queue shape. */
export default function LoadingAdminChargebacks() {
  return <QueueSkeleton label="Loading the chargebacks desk" rows={4} />;
}
