import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell } from "@/components/app/ScreenSkeleton";

/**
 * The wait on a safety share (C6, the route sweep). The page reads the share
 * by its token before it can say a word, and the group's prose skeleton stood
 * in for what is a short status: who is where, the times, the state card with
 * its one action, and the footnote. This is that shape, in the page's own
 * column and padding, so the status lands where the boxes were. A trusted
 * contact opening it on mobile data should see the answer arriving, not the
 * shape of an article.
 */
export default function LoadingSafetyShare() {
  return (
    <LoadingShell label="Opening the safety share" className="nf-shell pb-section">
      <div className="mx-auto max-w-xl pt-block">
        <div className="px-lg py-section">
          <Skeleton width="85%" height="1.75rem" radius="sm" />
          <Skeleton className="mt-md" width="65%" height="1rem" radius="sm" />
          <div className="mt-lg rounded-[var(--nf-container-radius)] border border-[var(--nf-border-subtle)] p-md">
            <Skeleton width="90%" height="1rem" radius="sm" />
            <Skeleton className="mt-2xs" width="70%" height="1rem" radius="sm" />
            <Skeleton className="mt-sm" width="7rem" height="2.75rem" radius="pill" />
          </div>
          <Skeleton className="mt-lg" width="75%" height="0.75rem" radius="xs" />
        </div>
      </div>
    </LoadingShell>
  );
}
