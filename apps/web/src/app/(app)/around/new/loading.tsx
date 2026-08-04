/**
 * The wait, before somewhere can be suggested.
 *
 * This page reads the session and the whole state reference table before it can
 * draw its first field, because the place picker cascades from state to city and
 * cannot be rendered half made. It is reached from the directory's own footer
 * and from the create ring, both of them deliberate taps.
 */
export default function LoadingProposeArea() {
  return (
    <div className="mx-auto w-full max-w-2xl pb-16 pt-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Opening the suggestion form</span>

      <div className="mb-6 space-y-3" aria-hidden="true">
        <span className="nf-social-skeleton block h-7 w-44 rounded-[var(--nf-radius-xs)]" />
        <span className="nf-social-skeleton block h-3 w-72 rounded-[var(--nf-radius-xs)]" />
      </div>

      <div className="nf-card space-y-4 p-5" aria-hidden="true">
        <span className="nf-social-skeleton block h-11 w-full rounded-[var(--nf-radius-md)]" />
        <div className="grid gap-4 sm:grid-cols-2">
          <span className="nf-social-skeleton block h-11 w-full rounded-[var(--nf-radius-md)]" />
          <span className="nf-social-skeleton block h-11 w-full rounded-[var(--nf-radius-md)]" />
        </div>
        <span className="nf-social-skeleton block h-24 w-full rounded-[var(--nf-radius-md)]" />
        <span className="nf-social-skeleton block h-11 w-44 rounded-[var(--nf-radius-pill)]" />
      </div>

      {/* The moderator rules panel underneath. It is static copy and arrives with
          the page, so its shape is held rather than left as a gap that pushes the
          form upward when it lands. */}
      <div className="nf-card mt-8 space-y-3 p-5" aria-hidden="true">
        <span className="nf-social-skeleton block h-4 w-56 rounded-[var(--nf-radius-xs)]" />
        <span className="nf-social-skeleton block h-3 w-full rounded-[var(--nf-radius-xs)]" />
        <span className="nf-social-skeleton block h-3 w-4/5 rounded-[var(--nf-radius-xs)]" />
      </div>
    </div>
  );
}
