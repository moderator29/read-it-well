import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on verification.
 *
 * This route reads the agent context AND the verification ladder before it can
 * decide whether to show a status panel or the flow, so the whole screen waits
 * on two round trips. What is reserved is the shape they share: the step
 * header, the progress bar at its real 6px, a heading pair, and the first card.
 */
export default function LoadingVerification() {
  return (
    <LoadingShell label="Loading verification" className="mx-auto max-w-xl">
      <div className="flex items-center gap-3">
        <Skeleton width="2.5rem" height="2.5rem" radius="pill" className="shrink-0" />
        <Skeleton width="6rem" height="1rem" radius="sm" />
      </div>
      <Skeleton height="0.375rem" radius="pill" className="mt-3" />
      <Skeleton width="12rem" height="2rem" radius="sm" className="mt-6" />
      <Skeleton width="min(24rem, 100%)" height="1rem" radius="sm" className="mt-2.5" />
      <Skeleton height="12rem" radius="xl" className="mt-6" />
    </LoadingShell>
  );
}
