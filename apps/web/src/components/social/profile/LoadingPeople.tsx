/**
 * The wait on a list of people.
 *
 * Both follow lists make three reads before the first name: the profile whose
 * list it is, the follow edges, and the profiles behind them. Without this,
 * `/u/[handle]/loading.tsx` would serve its cover-and-avatar skeleton to a page
 * that has neither, and the layout would jump the moment the names arrived.
 */
export function LoadingPeople() {
  return (
    <div className="mx-auto max-w-2xl" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading people</span>

      <div className="mb-4 space-y-3" aria-hidden="true">
        <span className="nf-social-skeleton block h-7 w-36 rounded-[var(--nf-radius-xs)]" />
        <span className="nf-social-skeleton block h-3 w-52 rounded-[var(--nf-radius-xs)]" />
      </div>

      <ul className="mt-5 flex flex-col gap-[var(--nf-social-gap)]" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((row) => (
          <li key={row} className="nf-card nf-social-card nf-social-person">
            <span className="nf-social-skeleton nf-social-person__face" />
            <div className="min-w-0 flex-1 space-y-2">
              <span className="nf-social-skeleton block h-4 w-36 rounded-[var(--nf-radius-xs)]" />
              <span className="nf-social-skeleton block h-3 w-24 rounded-[var(--nf-radius-xs)]" />
            </div>
            <span className="nf-social-skeleton block h-10 w-24 rounded-[var(--nf-radius-pill)]" />
          </li>
        ))}
      </ul>
    </div>
  );
}
