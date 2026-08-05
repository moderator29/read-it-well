import { QueueSkeleton } from "../_components/QueueSkeleton";

/**
 * Support tickets.
 *
 * The only queue that widens to `max-w-4xl` once its data is in - it renders
 * open and resolved side by side - so the skeleton widens with it. Matching the
 * narrower default here would slide the whole column outward on arrival.
 */
export default function LoadingSupport() {
  return <QueueSkeleton label="Loading support tickets" rows={4} width="max-w-4xl" />;
}
