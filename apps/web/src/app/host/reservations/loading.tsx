import { Skeleton } from "@/components/ui/Skeleton";
import { HostHeadSkeleton, HostScreenSkeleton } from "@/components/host/HostScreenSkeleton";

/**
 * The wait, on the table board.
 *
 * The `nf-agent-head` title and its count line, then the board's sections
 * (`mt-block`, an `nf-h4` heading with its count) of table cards: the
 * venue overline, the time, the party line, and the two answer pills.
 */
export default function LoadingHostReservations() {
  return (
    <HostScreenSkeleton label="Loading your tables">
      <HostHeadSkeleton />
      {[2, 1].map((cards, s) => (
        <section key={s} className="mt-block" aria-hidden="true">
          <Skeleton width="9rem" height="1.25rem" radius="sm" />
          <ul className="mt-row flex flex-col gap-row">
            {Array.from({ length: cards }, (_, i) => (
              <li key={i} className="nf-panel nf-panel--card block p-card">
                <Skeleton width="40%" height="0.75rem" radius="sm" />
                <Skeleton className="mt-row" width="65%" height="1.0625rem" radius="sm" />
                <Skeleton className="mt-inline-tight" width="50%" height="0.8125rem" radius="sm" />
                <div className="mt-row flex gap-inline">
                  <Skeleton width="7rem" height="2.75rem" radius="pill" />
                  <Skeleton width="7rem" height="2.75rem" radius="pill" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </HostScreenSkeleton>
  );
}
