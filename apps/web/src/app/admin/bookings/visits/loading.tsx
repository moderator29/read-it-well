import { QueueSkeleton } from "../../_components/QueueSkeleton";

/** The wait on the visits calendar, in the console's shared queue shape. */
export default function LoadingAdminVisits() {
  return <QueueSkeleton label="Loading the visits calendar" rows={5} />;
}
