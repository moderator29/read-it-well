import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on the terms.
 *
 * Mirrors the reading surface: the header, the last-updated line, the
 * contents card as a stack of rows, then the first sections as prose lines
 * with a heading each, so the text lands where the boxes were.
 */
export default function LoadingLegalTerms() {
  return (
    <LoadingShell label="Loading the terms" className="mx-auto w-full max-w-3xl pb-3xl pt-md">
      <PageHeaderSkeleton subtitle />
      <Skeleton width="11rem" height="0.8125rem" radius="sm" className="mt-sm" />
      <div className="nf-panel nf-panel--card block mt-lg p-md">
        <Skeleton width="4.5rem" height="0.75rem" radius="sm" />
        <div className="mt-xs space-y-3xs">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} height="2.75rem" radius="md" />
          ))}
        </div>
      </div>
      <div className="mt-xl space-y-xl">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i}>
            <Skeleton width="45%" height="1.125rem" radius="sm" />
            <Skeleton className="mt-sm" width="100%" height="0.875rem" radius="sm" />
            <Skeleton className="mt-xs" width="96%" height="0.875rem" radius="sm" />
            <Skeleton className="mt-xs" width="72%" height="0.875rem" radius="sm" />
          </div>
        ))}
      </div>
    </LoadingShell>
  );
}
