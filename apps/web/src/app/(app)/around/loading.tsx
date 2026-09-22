/**
 * The wait, on the feed.
 *
 * `/around` is force-dynamic and resolves the session, the places somebody is
 * in and a page of posts before it can render a word. On a slow Nigerian
 * connection Next holds the previous screen for that whole time, so a tap on
 * Around looks like a tap that did nothing.
 *
 * The real layout rather than a spinner: a header row, the place switcher, and
 * three post-shaped cards, so nothing jumps when the posts land.
 */
import { Skeleton } from "@/components/ui/Skeleton";

export default function LoadingAround() {
  return (
    <div
      className="mx-auto w-full max-w-3xl pt-md"
      style={{ paddingBottom: "var(--nf-tabbar-clearance)" }}
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading your feed</span>

      <div className="mb-md flex items-center gap-md" aria-hidden="true">
        <Skeleton circle width="2.25rem" />
        <Skeleton width="8rem" height="1.75rem" radius="xs" />
      </div>

      {/* The switcher, at its own height, so the first card does not climb into
          the space the chips are about to take. */}
      <div className="mb-md flex items-center gap-xs overflow-hidden" aria-hidden="true">
        {[28, 20, 24].map((width, index) => (
          /* A SKELETON IS THE SHAPE IT STANDS IN FOR. These were capsules
             while every button they replace is now a rounded rectangle, so
             the page visibly reshaped the moment it loaded, which is the one
             thing a skeleton exists to prevent. The shape law does not reach
             a skeleton directly, because a skeleton is not a control and the
             tenth rule correctly stays silent on a span; it reaches it
             through what it is a picture of. */
          <Skeleton key={index} height="2.25rem" radius="md" width={`${width * 4}px`} />
        ))}
      </div>

      <div className="flex flex-col gap-[var(--nf-feed-gap)]" aria-hidden="true">
        {[0, 1, 2].map((card) => (
          <div key={card} className="nf-card nf-post p-md">
            <div className="flex items-center gap-sm">
              <Skeleton circle width="2.5rem" />
              <div className="min-w-0 flex-1 space-y-xs">
                <Skeleton width="8rem" height="0.75rem" radius="xs" />
                <Skeleton width="5rem" height="0.75rem" radius="xs" />
              </div>
            </div>
            <div className="mt-md space-y-xs">
              <Skeleton height="0.75rem" radius="xs" />
              <Skeleton width="91.6667%" height="0.75rem" radius="xs" />
              <Skeleton width="66.6667%" height="0.75rem" radius="xs" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
