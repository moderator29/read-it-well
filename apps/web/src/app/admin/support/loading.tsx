import { QueueSkeleton } from "../_components/QueueSkeleton";

/**
 * Support tickets.
 *
 * Every queue now settles at the console measure, this one included - it renders
 * open and resolved side by side - so the skeleton widens with it. Matching the
 * narrower default here would slide the whole column outward on arrival.
 */
export default function LoadingSupport() {
  return <QueueSkeleton label="Loading support tickets" rows={4} width="nf-console" />;
}
