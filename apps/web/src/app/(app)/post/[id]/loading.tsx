/**
 * The wait, on a thread.
 *
 * A thread is almost always arrived at from a link somebody sent, which means
 * the person opening it has no idea whether the tap registered. The shape of
 * the root post and one reply arrives immediately instead.
 */
export default function LoadingThread() {
  return (
    <div className="mx-auto w-full max-w-2xl pb-4xl pt-md" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading this thread</span>

      <div className="mb-lg space-y-sm" aria-hidden="true">
        <span className="nf-social-skeleton block h-7 w-28 rounded-[var(--nf-radius-xs)]" />
        <span className="nf-social-skeleton block h-3 w-40 rounded-[var(--nf-radius-xs)]" />
      </div>

      <div className="flex flex-col gap-[var(--nf-feed-gap)]" aria-hidden="true">
        <div className="nf-card nf-post space-y-sm">
          <span className="nf-social-skeleton block h-4 w-44 rounded-[var(--nf-radius-xs)]" />
          <span className="nf-social-skeleton block h-3 w-full rounded-[var(--nf-radius-xs)]" />
          <span className="nf-social-skeleton block h-3 w-4/5 rounded-[var(--nf-radius-xs)]" />
        </div>
        <div className="nf-card nf-post ms-sm space-y-sm">
          <span className="nf-social-skeleton block h-4 w-36 rounded-[var(--nf-radius-xs)]" />
          <span className="nf-social-skeleton block h-3 w-3/4 rounded-[var(--nf-radius-xs)]" />
        </div>
      </div>
    </div>
  );
}
