import { QueueSkeleton } from "../_components/QueueSkeleton";

/** The wait on the referral desk, in the console's shared queue shape. */
export default function LoadingAdminReferrals() {
  return <QueueSkeleton label="Loading referrals" rows={3} />;
}
