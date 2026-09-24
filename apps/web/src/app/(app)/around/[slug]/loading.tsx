/**
 * The wait, inside one place.
 *
 * Three sequential round trips before the first word: the area, the viewer's
 * standing in it, and the feed. This holds their shape so the page fills in
 * rather than appearing all at once after a silence.
 */
import { Skeleton } from "@/components/ui/Skeleton";
import { State } from "@/components/ui/State";

export default function LoadingArea() {
  return (
    <State kind="loading" title="Loading this place" className="mx-auto w-full max-w-3xl pb-4xl pt-md">

      <div className="mb-lg space-y-sm" aria-hidden="true">
        <Skeleton width="13rem" height="1.75rem" radius="xs" />
        <Skeleton width="9rem" height="0.75rem" radius="xs" />
      </div>

      <div className="nf-panel nf-panel--card mb-md block space-y-sm p-lg" aria-hidden="true">
        <Skeleton height="0.75rem" radius="xs" />
        <Skeleton width="75%" height="0.75rem" radius="xs" />
        <div className="flex gap-lg pt-xs">
          <Skeleton width="4rem" height="2rem" radius="xs" />
          <Skeleton width="4rem" height="2rem" radius="xs" />
          <Skeleton width="6rem" height="2rem" radius="xs" />
        </div>
      </div>

      <div className="flex flex-col gap-[var(--nf-feed-gap)]" aria-hidden="true">
        {[0, 1].map((card) => (
          <div key={card} className="nf-panel nf-panel--card nf-post block space-y-sm">
            <Skeleton width="11rem" height="1rem" radius="xs" />
            <Skeleton height="0.75rem" radius="xs" />
            <Skeleton width="83.3333%" height="0.75rem" radius="xs" />
          </div>
        ))}
      </div>
    </State>
  );
}
