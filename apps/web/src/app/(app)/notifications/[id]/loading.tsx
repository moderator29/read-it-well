import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";
import "./notification-view.css";

/**
 * The wait, on one notification: the hero Island (object, family, title,
 * when), the lead sentence, the detail card, the one action and the timeline,
 * each reserved in the shape it arrives in, so nothing jumps when it lands.
 */
export default function LoadingNotification() {
  return (
    <LoadingShell label="Loading the notification" className="mx-auto w-full max-w-2xl">
      <PageHeaderSkeleton />
      <div className="nf-nview">
        <div className="nf-island nf-nview__hero">
          <Skeleton width="4.5rem" height="4.5rem" radius="md" />
          <Skeleton width="30%" height="0.75rem" radius="sm" />
          <Skeleton width="80%" height="1.75rem" radius="sm" />
          <Skeleton width="45%" height="0.875rem" radius="sm" />
        </div>
        <Skeleton width="100%" height="4.5rem" radius="lg" />
        <Skeleton width="100%" height="8rem" radius="lg" />
        <Skeleton width="100%" height="3.5rem" radius="md" />
        <Skeleton width="100%" height="9rem" radius="lg" />
      </div>
    </LoadingShell>
  );
}
