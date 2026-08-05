import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on notifications.
 *
 * The route reads the signed-in user's own rows and then hands them to a live
 * subscription, so there is always a server round trip before the first item.
 * Rows are reserved with their unread dot, because a list that arrives and then
 * grows a leading dot on half its rows shifts every line of text sideways.
 */
export default function LoadingNotifications() {
  return (
    <LoadingShell label="Loading your notifications" className="mx-auto w-full max-w-2xl">
      <PageHeaderSkeleton />

      <ul className="space-y-2.5">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="nf-card flex items-start gap-3 p-4">
            <Skeleton circle width="2.25rem" className="shrink-0" />
            <div className="min-w-0 flex-1">
              <Skeleton width="60%" height="0.9375rem" radius="sm" />
              <Skeleton className="mt-2" width="85%" height="0.8125rem" radius="sm" />
              <Skeleton className="mt-2" width="25%" height="0.75rem" radius="sm" />
            </div>
            <Skeleton circle width="0.5rem" className="mt-1.5 shrink-0" />
          </li>
        ))}
      </ul>
    </LoadingShell>
  );
}
