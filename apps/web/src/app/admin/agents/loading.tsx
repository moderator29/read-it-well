import { QueueSkeleton } from "../_components/QueueSkeleton";

/**
 * Agent applications. Two reads before render - the waiting queue and the
 * recently decided list - and each card carries a decision pair, which is why
 * the shared shape draws buttons rather than stopping at text.
 */
export default function LoadingAgentApplications() {
  return <QueueSkeleton label="Loading agent applications" rows={4} />;
}
