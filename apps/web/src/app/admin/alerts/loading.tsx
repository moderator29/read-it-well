import { QueueSkeleton } from "../_components/QueueSkeleton";

/** Trust alerts. The queue an operator opens first, so it is the one where a
 *  blank column is most likely to be read as "nothing is wrong". */
export default function LoadingAlerts() {
  return <QueueSkeleton label="Loading alerts" rows={4} />;
}
