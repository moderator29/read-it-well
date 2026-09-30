import { Skeleton } from "@/components/ui/Skeleton";
import { HostHeadSkeleton, HostScreenSkeleton } from "@/components/host/HostScreenSkeleton";

/**
 * The wait, on rooms and nights.
 *
 * The `nf-agent-head` title and its sentence, then `RoomNightsEditor`: the
 * horizon note and one `nf-host-group` card per room type, each a name and
 * meta line, a note, the two figure tiles side by side and the save pill.
 */
export default function LoadingHostRooms() {
  return (
    <HostScreenSkeleton label="Loading your rooms">
      <HostHeadSkeleton />
      <div className="mt-block flex flex-col gap-block" aria-hidden="true">
        <Skeleton width="80%" height="0.8125rem" radius="sm" />
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="nf-panel nf-panel--card block nf-host-group">
            <Skeleton width="55%" height="1.125rem" radius="sm" />
            <Skeleton className="mt-2xs" width="40%" height="0.8125rem" radius="sm" />
            <Skeleton className="mt-row" width="90%" height="0.8125rem" radius="sm" />
            <div className="mt-md grid grid-cols-2 gap-sm">
              <Skeleton height="4.5rem" radius="lg" />
              <Skeleton height="4.5rem" radius="lg" />
            </div>
            <Skeleton className="mt-md" height="3rem" radius="pill" />
          </div>
        ))}
      </div>
    </HostScreenSkeleton>
  );
}
