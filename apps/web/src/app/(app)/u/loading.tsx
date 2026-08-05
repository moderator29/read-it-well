import { Skeleton } from "@/components/ui/Skeleton";

/**
 * The wait, on the people directory.
 *
 * `/u` is force-dynamic and every search is a full round trip, because the form
 * is a plain GET and the query lives in the address rather than in a client
 * bundle. That is the right trade on a Nigerian mobile connection and it has one
 * cost: Next holds the previous screen for the whole read, so pressing Search
 * looks like pressing nothing.
 *
 * The search row is drawn as the shape it is about to become - a field and a
 * Search button beside it, not one full-width pill - because a skeleton whose
 * proportions are merely approximate moves the page at the exact moment the real
 * control arrives and somebody has already reached for it.
 *
 * Every slab here is the `Skeleton` primitive. They were hand-assembled spans
 * carrying `.nf-social-skeleton` plus a height, a width and a radius each - one
 * material for this screen and a different one for the rest of the app, which is
 * visible the moment a reader crosses between them. The primitive owns the
 * sweep, the radius scale and the reduced-motion stop, once.
 */
export default function LoadingPeopleDirectory() {
  return (
    <div className="mx-auto w-full max-w-2xl pb-24 pt-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Looking for people</span>

      <div className="mb-6 space-y-3">
        <Skeleton width="7rem" height="1.75rem" radius="sm" />
        <Skeleton width="12rem" height="0.75rem" radius="sm" />
      </div>

      {/* The field takes `--nf-radius-lg` from `.nf-field`; the Search button
          beside it is a pill, at the same 48px height the row is set to. */}
      <div className="mt-1 flex items-start gap-2">
        <Skeleton className="min-w-0 flex-1" height="3rem" radius="lg" />
        <Skeleton className="shrink-0" width="6.25rem" height="3rem" radius="pill" />
      </div>

      <Skeleton className="mt-5" width="10rem" height="0.75rem" radius="sm" />

      {/* The slabs hide themselves, but the LIST does not: without this a
          screen reader is told "list, 5 items" about five empty rows. The
          announcement belongs to the live region at the top, which says what is
          actually happening. */}
      <ul className="mt-3 flex flex-col gap-[var(--nf-social-gap)]" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((row) => (
          <li key={row} className="nf-card nf-social-card nf-people__row">
            {/* Sized by hand rather than borrowing `.nf-people__avatar`, which
                fills itself with the brand gradient and would render a solid
                blue disc where a face is about to be. */}
            <Skeleton circle width="46px" className="shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton width="8rem" height="1rem" radius="sm" />
              <Skeleton width="11rem" height="0.75rem" radius="sm" />
            </div>
            <Skeleton width="6rem" height="2.5rem" radius="pill" className="shrink-0" />
          </li>
        ))}
      </ul>
    </div>
  );
}
