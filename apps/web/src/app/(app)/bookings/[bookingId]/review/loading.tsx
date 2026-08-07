import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on this stay.
 *
 * The stay is read to check it can be reviewed at all. The star row and the text box are the two things that must not move under a thumb already reaching for them.
 */
export default function LoadingReview() {
  return (
    <LoadingShell label="Loading this stay" className="mx-auto w-full max-w-2xl">
      <PageHeaderSkeleton />
      <div className="nf-card p-5">
        <Skeleton width="40%" height="0.8125rem" radius="sm" />
        <Skeleton className="mt-3" height="2.25rem" radius="sm" />
        <Skeleton className="mt-4" height="3.5rem" radius="lg" />
      </div>
    </LoadingShell>
  );
}
