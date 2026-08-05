import { QueueSkeleton } from "../_components/QueueSkeleton";

/** Content flags. Cards here carry the quoted body as well as the decision
 *  pair, so the row placeholder runs slightly taller than the other queues. */
export default function LoadingFlags() {
  return <QueueSkeleton label="Loading flags" rows={5} />;
}
