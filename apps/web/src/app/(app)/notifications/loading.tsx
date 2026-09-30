import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";
import "./notifications.css";

/**
 * The wait, on notifications.
 *
 * The route reads the signed-in user's own rows and then hands them to a live
 * subscription, so there is always a server round trip before the first item.
 * The rows are reserved in the shape they arrive in: one grouped card, a
 * round plate on the left, two lines, the time on the right. A skeleton
 * that does not match its screen is worse than no skeleton, because it
 * teaches the eye the wrong shape and then corrects it.
 */
export default function LoadingNotifications() {
  return (
    <LoadingShell label="Loading your notifications" className="mx-auto w-full max-w-2xl">
      <PageHeaderSkeleton />

      <div className="nf-list-section__head">
        <Skeleton width="4rem" height="0.875rem" radius="sm" />
        <Skeleton width="1.5rem" height="1.5rem" radius="sm" />
      </div>
      <ul className="nf-list-group">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="nf-list-item">
            <div className="nf-list-row nf-list-row--two">
              <span className="nf-list-row__lead">
                <Skeleton circle width="var(--nf-plate-size-sm)" className="shrink-0" />
              </span>
              <div className="nf-list-row__text">
                <Skeleton width="60%" height="1rem" radius="sm" />
                <Skeleton width="85%" height="0.8125rem" radius="sm" />
              </div>
              <Skeleton width="2.5rem" height="0.75rem" radius="sm" className="shrink-0" />
            </div>
          </li>
        ))}
      </ul>
    </LoadingShell>
  );
}
