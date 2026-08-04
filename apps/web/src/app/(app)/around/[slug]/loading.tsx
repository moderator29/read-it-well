/**
 * The wait, inside one place.
 *
 * Three sequential round trips before the first word: the area, the viewer's
 * standing in it, and the feed. This holds their shape so the page fills in
 * rather than appearing all at once after a silence.
 */
export default function LoadingArea() {
  return (
    <div className="mx-auto w-full max-w-3xl pb-24 pt-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading this place</span>

      <div className="mb-6 space-y-3" aria-hidden="true">
        <span className="nf-social-skeleton block h-7 w-52 rounded-[var(--nf-radius-xs)]" />
        <span className="nf-social-skeleton block h-3 w-36 rounded-[var(--nf-radius-xs)]" />
      </div>

      <div className="nf-card mb-5 space-y-3 p-5" aria-hidden="true">
        <span className="nf-social-skeleton block h-3 w-full rounded-[var(--nf-radius-xs)]" />
        <span className="nf-social-skeleton block h-3 w-3/4 rounded-[var(--nf-radius-xs)]" />
        <div className="flex gap-7 pt-2">
          <span className="nf-social-skeleton block h-8 w-16 rounded-[var(--nf-radius-xs)]" />
          <span className="nf-social-skeleton block h-8 w-16 rounded-[var(--nf-radius-xs)]" />
          <span className="nf-social-skeleton block h-8 w-24 rounded-[var(--nf-radius-xs)]" />
        </div>
      </div>

      <div className="flex flex-col gap-[var(--nf-feed-gap)]" aria-hidden="true">
        {[0, 1].map((card) => (
          <div key={card} className="nf-card nf-post space-y-3">
            <span className="nf-social-skeleton block h-4 w-44 rounded-[var(--nf-radius-xs)]" />
            <span className="nf-social-skeleton block h-3 w-full rounded-[var(--nf-radius-xs)]" />
            <span className="nf-social-skeleton block h-3 w-5/6 rounded-[var(--nf-radius-xs)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
