import { Skeleton } from "@/components/ui/Skeleton";
import { AgentScreenSkeleton } from "@/components/agent/AgentScreenSkeleton";
import "@/app/(app)/notifications/notifications.css";

/**
 * The wait, on the agent's notifications (R3-17: one of the four agent screens
 * that waited on the generic rows in `app/agent/loading.tsx`).
 *
 * The page is the member notification centre inside the agent shell, so this
 * is that centre's own shape (`app/(app)/notifications/loading.tsx`): the
 * page head, the day's section head with its count, then rows of a plate
 * beside two lines and the time at the end, inside the agent frame.
 */
export default function LoadingAgentNotifications() {
  return (
    <AgentScreenSkeleton label="Loading your notifications">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-md">
          <Skeleton width="11rem" height="1.75rem" radius="sm" />
        </div>
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
      </div>
    </AgentScreenSkeleton>
  );
}
