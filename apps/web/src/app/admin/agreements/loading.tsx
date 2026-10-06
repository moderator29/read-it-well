import { QueueSkeleton } from "../_components/QueueSkeleton";

/** The wait on the agreements queue: the console's queue shape, so the rows land where the real ones will (it fell back to the overview's strip and cards before). */
export default function LoadingAgreements() {
  return <QueueSkeleton label="Loading the agreements queue" rows={4} />;
}
