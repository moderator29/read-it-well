/**
 * The wait, before somewhere can be suggested.
 *
 * This page reads the session and the whole state reference table before it can
 * draw its first field, because the place picker cascades from state to city and
 * cannot be rendered half made. It is reached from the directory's own footer
 * and from the create ring, both of them deliberate taps.
 */
import { Skeleton } from "@/components/ui/Skeleton";

export default function LoadingProposeArea() {
  return (
    <div className="mx-auto w-full max-w-2xl pb-3xl pt-md" aria-busy="true" aria-live="polite">
      <span className="sr-only">Opening the suggestion form</span>

      <div className="mb-lg space-y-sm" aria-hidden="true">
        <Skeleton width="11rem" height="1.75rem" radius="xs" />
        <Skeleton width="18rem" height="0.75rem" radius="xs" />
      </div>

      <div className="nf-panel nf-panel--card block space-y-md p-lg" aria-hidden="true">
        <Skeleton height="2.75rem" radius="md" />
        <div className="grid gap-md sm:grid-cols-2">
          <Skeleton height="2.75rem" radius="md" />
          <Skeleton height="2.75rem" radius="md" />
        </div>
        <Skeleton height="6rem" radius="md" />
        <Skeleton width="11rem" height="2.75rem" radius="md" />
      </div>

      {/* The moderator rules panel underneath. It is static copy and arrives with
          the page, so its shape is held rather than left as a gap that pushes the
          form upward when it lands. */}
      <div className="nf-panel nf-panel--card mt-xl block space-y-sm p-lg" aria-hidden="true">
        <Skeleton width="14rem" height="1rem" radius="xs" />
        <Skeleton height="0.75rem" radius="xs" />
        <Skeleton width="80%" height="0.75rem" radius="xs" />
      </div>
    </div>
  );
}
