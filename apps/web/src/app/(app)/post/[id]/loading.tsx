/**
 * The wait, on a thread.
 *
 * A thread is almost always arrived at from a link somebody sent, which means
 * the person opening it has no idea whether the tap registered. The shape of
 * the root post and one reply arrives immediately instead.
 */
import { Skeleton } from "@/components/ui/Skeleton";

export default function LoadingThread() {
  return (
    <div className="mx-auto w-full max-w-2xl pb-4xl pt-md" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading this thread</span>

      <div className="mb-lg space-y-sm" aria-hidden="true">
        <Skeleton width="7rem" height="1.75rem" radius="xs" />
        <Skeleton width="10rem" height="0.75rem" radius="xs" />
      </div>

      <div className="flex flex-col gap-[var(--nf-feed-gap)]" aria-hidden="true">
        <div className="nf-card nf-post space-y-sm">
          <Skeleton width="11rem" height="1rem" radius="xs" />
          <Skeleton height="0.75rem" radius="xs" />
          <Skeleton width="80%" height="0.75rem" radius="xs" />
        </div>
        <div className="nf-card nf-post ms-sm space-y-sm">
          <Skeleton width="9rem" height="1rem" radius="xs" />
          <Skeleton width="75%" height="0.75rem" radius="xs" />
        </div>
      </div>
    </div>
  );
}
