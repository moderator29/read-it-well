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
export default function LoadingAround() {
  return (
    <div
      className="mx-auto w-full max-w-3xl pt-4"
      style={{ paddingBottom: "var(--nf-tabbar-clearance)" }}
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading your feed</span>

      <div className="mb-5 flex items-center gap-4" aria-hidden="true">
        <span className="nf-social-skeleton block h-9 w-9 rounded-full" />
        <span className="nf-social-skeleton block h-7 w-32 rounded-[var(--nf-radius-xs)]" />
      </div>

      {/* The switcher, at its own height, so the first card does not climb into
          the space the chips are about to take. */}
      <div className="mb-4 flex items-center gap-2 overflow-hidden" aria-hidden="true">
        {[28, 20, 24].map((width, index) => (
          <span
            key={index}
            className="nf-social-skeleton block h-9 rounded-[var(--nf-radius-pill)]"
            style={{ width: `${width * 4}px` }}
          />
        ))}
      </div>

      <div className="flex flex-col gap-[var(--nf-feed-gap)]" aria-hidden="true">
        {[0, 1, 2].map((card) => (
          <div key={card} className="nf-card nf-post p-4">
            <div className="flex items-center gap-3">
              <span className="nf-social-skeleton block h-10 w-10 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <span className="nf-social-skeleton block h-3 w-32 rounded-[var(--nf-radius-xs)]" />
                <span className="nf-social-skeleton block h-3 w-20 rounded-[var(--nf-radius-xs)]" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <span className="nf-social-skeleton block h-3 w-full rounded-[var(--nf-radius-xs)]" />
              <span className="nf-social-skeleton block h-3 w-11/12 rounded-[var(--nf-radius-xs)]" />
              <span className="nf-social-skeleton block h-3 w-2/3 rounded-[var(--nf-radius-xs)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
