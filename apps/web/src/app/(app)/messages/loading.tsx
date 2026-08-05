import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on the inbox.
 *
 * Conversations are read per viewer, so this route is dynamic on every visit.
 * The list is a single divided card rather than separate cards, and each row is
 * an avatar beside two lines - reproduced here at `px-4 py-3.5`, the real row
 * padding, so the first conversation lands where the placeholder sat.
 */
export default function LoadingMessages() {
  return (
    <LoadingShell label="Loading your messages" className="mx-auto w-full max-w-2xl">
      <PageHeaderSkeleton subtitle />

      <ul className="nf-card divide-y divide-[var(--nf-border-subtle)] p-0">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="flex items-start gap-3 px-4 py-3.5">
            <Skeleton circle width="2.5rem" className="shrink-0" />
            <div className="min-w-0 flex-1">
              <Skeleton width="45%" height="0.9375rem" radius="sm" />
              <Skeleton className="mt-2" width="80%" height="0.8125rem" radius="sm" />
            </div>
            <Skeleton width="2.5rem" height="0.75rem" radius="sm" className="shrink-0" />
          </li>
        ))}
      </ul>
    </LoadingShell>
  );
}
