import { QueueSkeleton } from "../_components/QueueSkeleton";

/** The audit log. */
export default function LoadingAudit() {
  return <QueueSkeleton label="Loading the audit log" rows={8} />;
}
