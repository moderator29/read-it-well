/**
 * The wait, on the people directory.
 *
 * `/u` is force-dynamic and every search is a full round trip, because the form
 * is a plain GET and the query lives in the address rather than in a client
 * bundle. That is the right trade on a Nigerian mobile connection and it has one
 * cost: Next holds the previous screen for the whole read, so pressing Search
 * looks like pressing nothing.
 *
 * The search field is drawn as itself rather than as a grey bar, because it is
 * the one control somebody wants back first and it does not depend on the read.
 */
export default function LoadingPeopleDirectory() {
  return (
    <div className="mx-auto w-full max-w-2xl pb-24 pt-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Looking for people</span>

      <div className="mb-6 space-y-3" aria-hidden="true">
        <span className="nf-social-skeleton block h-7 w-28 rounded-[var(--nf-radius-xs)]" />
        <span className="nf-social-skeleton block h-3 w-48 rounded-[var(--nf-radius-xs)]" />
      </div>

      <span
        className="nf-social-skeleton block h-12 w-full rounded-[var(--nf-radius-pill)]"
        aria-hidden="true"
      />

      <span
        className="nf-social-skeleton mt-5 block h-3 w-40 rounded-[var(--nf-radius-xs)]"
        aria-hidden="true"
      />

      <ul className="mt-3 flex flex-col gap-[var(--nf-social-gap)]" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((row) => (
          <li key={row} className="nf-card nf-social-card nf-people__row">
            {/* Sized by hand rather than borrowing `.nf-people__avatar`, which
                fills itself with the brand gradient and would render a solid
                blue disc where a face is about to be. */}
            <span className="nf-social-skeleton block h-[46px] w-[46px] shrink-0 rounded-[var(--nf-radius-pill)]" />
            <div className="min-w-0 flex-1 space-y-2">
              <span className="nf-social-skeleton block h-4 w-32 rounded-[var(--nf-radius-xs)]" />
              <span className="nf-social-skeleton block h-3 w-44 rounded-[var(--nf-radius-xs)]" />
            </div>
            <span className="nf-social-skeleton block h-10 w-24 rounded-[var(--nf-radius-pill)]" />
          </li>
        ))}
      </ul>
    </div>
  );
}
