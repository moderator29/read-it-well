import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on notifications.
 *
 * The route reads the signed-in user's own rows and then hands them to a live
 * subscription, so there is always a server round trip before the first item.
 * The rows are reserved in the shape they arrive in: one card, a glyph tile
 * on the left rail, two lines, the time and the dot on the right. A skeleton
 * that does not match its screen is worse than no skeleton, because it
 * teaches the eye the wrong shape and then corrects it.
 */
export default function LoadingNotifications() {
  return (
    <LoadingShell label="Loading your notifications" className="mx-auto w-full max-w-2xl">
      <PageHeaderSkeleton />

      <div className="nf-notif__head">
        <Skeleton width="4rem" height="1.25rem" radius="sm" />
        <Skeleton width="1.5rem" height="1.5rem" radius="pill" />
      </div>
      <ul className="nf-card nf-notif__list">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="nf-notif__row">
            <Skeleton width="2.75rem" height="2.75rem" radius="md" className="shrink-0" />
            <div className="nf-notif__body">
              <Skeleton width="60%" height="1rem" radius="sm" />
              <Skeleton className="mt-inline-tight" width="85%" height="0.8125rem" radius="sm" />
            </div>
            <Skeleton circle width="0.625rem" className="shrink-0" />
          </li>
        ))}
      </ul>
    </LoadingShell>
  );
}
