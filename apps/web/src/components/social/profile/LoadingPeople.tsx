/**
 * The wait on a list of people.
 *
 * Both follow lists make three reads before the first name: the profile whose
 * list it is, the follow edges, and the profiles behind them. Without this,
 * `/u/[handle]/loading.tsx` would serve its cover-and-avatar skeleton to a page
 * that has neither, and the layout would jump the moment the names arrived.
 */
import { Skeleton } from "@/components/ui/Skeleton";

export function LoadingPeople() {
  return (
    <div className="mx-auto max-w-2xl" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading people</span>

      <div className="mb-md space-y-sm" aria-hidden="true">
        <Skeleton width="9rem" height="1.75rem" radius="xs" />
        <Skeleton width="13rem" height="0.75rem" radius="xs" />
      </div>

      <ul className="mt-md flex flex-col gap-[var(--nf-social-gap)]" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((row) => (
          <li key={row} className="nf-panel nf-panel--card nf-social-person flex-row">
            {/* The face's size is given here: without it the skeleton's own
                inline `width: 100%` beat the class's 46px and the disc took
                the whole row, pushing the bars out of the card (audit S7). */}
            <Skeleton circle width="46px" className="nf-social-person__face" />
            <div className="min-w-0 flex-1 space-y-xs">
              <Skeleton width="9rem" height="1rem" radius="xs" />
              <Skeleton width="6rem" height="0.75rem" radius="xs" />
            </div>
            <Skeleton width="6rem" height="2.5rem" radius="md" />
          </li>
        ))}
      </ul>
    </div>
  );
}
