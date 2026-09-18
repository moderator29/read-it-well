import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on /inspections.
 *
 * Two RLS-bound reads before the screen can tell "nothing booked" from "not
 * looked yet". The rows are `InspectionRows`' real geometry: one boxed list,
 * a 2.75rem role mark, a title, a meta line, a pill on the right, at `py-md`.
 * The lede and the OPEN heading are reserved above so the first row lands
 * where its placeholder sat.
 */
export default function LoadingInspections() {
  return (
    <LoadingShell label="Loading your inspections" className="mx-auto w-full max-w-2xl">
      <PageHeaderSkeleton />
      <Skeleton width="88%" height="1rem" radius="sm" />
      <Skeleton className="mt-inline-tight" width="60%" height="1rem" radius="sm" />

      <Skeleton className="mt-block" width="4rem" height="1.1875rem" radius="sm" />
      <Skeleton className="mt-row" width="70%" height="0.9375rem" radius="sm" />

      <ul className="nf-card mt-heading overflow-hidden rounded-[var(--nf-radius-xl)] px-lg sm:px-xl">
        {Array.from({ length: 3 }, (_, i) => (
          <li
            key={i}
            className="flex items-start gap-sm border-t border-[var(--nf-border-subtle)] py-md first:border-t-0"
          >
            <Skeleton width="2.75rem" height="2.75rem" radius="pill" className="shrink-0" />
            <div className="min-w-0 flex-1">
              <Skeleton width="62%" height="1rem" radius="sm" />
              <Skeleton className="mt-inline-tight" width="48%" height="0.90625rem" radius="sm" />
            </div>
            <Skeleton width="5.5rem" height="1.25rem" radius="pill" className="shrink-0" />
          </li>
        ))}
      </ul>
    </LoadingShell>
  );
}
