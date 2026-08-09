import { QueueSkeleton } from "../_components/QueueSkeleton";

/** The wait on the escrow console. The console's shared queue shape, so the rows land where the real ones will. */
export default function LoadingAdminEscrow() {
  return <QueueSkeleton label="Loading the escrow console" rows={4} />;
}
