/**
 * The wait, on a thread.
 *
 * A thread is almost always arrived at from a link somebody sent, which means
 * the person opening it has no idea whether the tap registered. The shape of
 * the root post and one reply arrives immediately instead.
 */
import { Skeleton } from "@/components/ui/Skeleton";
import { State } from "@/components/ui/State";

export default function LoadingThread() {
  return (
    <State kind="loading" title="Loading this thread" className="mx-auto w-full max-w-2xl pb-4xl pt-md">

      <div className="mb-lg space-y-sm" aria-hidden="true">
        <Skeleton width="7rem" height="1.75rem" radius="xs" />
        <Skeleton width="10rem" height="0.75rem" radius="xs" />
      </div>

      <div className="flex flex-col gap-[var(--nf-feed-gap)]" aria-hidden="true">
        <div className="nf-panel nf-panel--card nf-post block space-y-sm">
          <Skeleton width="11rem" height="1rem" radius="xs" />
          <Skeleton height="0.75rem" radius="xs" />
          <Skeleton width="80%" height="0.75rem" radius="xs" />
        </div>
        <div className="nf-panel nf-panel--card nf-post ms-sm block space-y-sm">
          <Skeleton width="9rem" height="1rem" radius="xs" />
          <Skeleton width="75%" height="0.75rem" radius="xs" />
        </div>
      </div>
    </State>
  );
}
