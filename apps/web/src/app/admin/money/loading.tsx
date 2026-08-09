import { QueueSkeleton } from "../_components/QueueSkeleton";

/** The wait on the money console. The console's shared queue shape, so the rows land where the real ones will. */
export default function LoadingAdminMoney() {
  return <QueueSkeleton label="Loading the money console" rows={4} />;
}
