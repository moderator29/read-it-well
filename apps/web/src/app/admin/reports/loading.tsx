import { QueueSkeleton } from "../_components/QueueSkeleton";

/** User reports. */
export default function LoadingReports() {
  return <QueueSkeleton label="Loading reports" rows={4} />;
}
