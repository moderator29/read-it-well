import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on the console overview.
 *
 * `admin/layout.tsx` already awaited the admin check and the queue counts before
 * this segment renders, so by the time anyone sees this the rail and header are
 * on screen and only the main column is outstanding. That is exactly the split
 * this file assumes: no chrome here, just the tile wall.
 *
 * It also stands in for any console segment that has no `loading.tsx` of its
 * own, which is the right default - every queue on this console is the same
 * shape of wait.
 */
export default function LoadingAdminOverview() {
  return (
    <LoadingShell label="Loading the console" className="mx-auto w-full max-w-5xl">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Skeleton width="15rem" height="1.75rem" radius="sm" />
          <Skeleton className="mt-2" width="100%" height="0.875rem" radius="sm" />
          <Skeleton className="mt-1.5" width="55%" height="0.875rem" radius="sm" />
        </div>
        <Skeleton width="2.5rem" height="1.375rem" radius="pill" className="shrink-0" />
      </header>

      {/* The queue tiles. Six, because six is what the console shows, and a
          count that changes between the skeleton and the data would reflow the
          whole wall at the moment it arrives. */}
      <ul className="nf-panel-sunken grid grid-cols-2 gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="nf-card flex h-full flex-col gap-2 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <Skeleton width="6rem" height="0.75rem" radius="sm" />
              <Skeleton width="1.25rem" height="1.25rem" radius="sm" />
            </div>
            {/* The count is the biggest thing on the tile at 2rem; a smaller
                placeholder would let the tile shrink and then grow. */}
            <Skeleton width="3.5rem" height="2rem" radius="sm" />
            <Skeleton width="90%" height="0.75rem" radius="sm" />
          </li>
        ))}
      </ul>

      <section className="nf-card mt-4 p-4 sm:p-5">
        <Skeleton width="11rem" height="1.125rem" radius="sm" />
        <div className="mt-3 space-y-2">
          <Skeleton width="100%" height="0.875rem" radius="sm" />
          <Skeleton width="92%" height="0.875rem" radius="sm" />
          <Skeleton width="78%" height="0.875rem" radius="sm" />
        </div>
      </section>
    </LoadingShell>
  );
}
