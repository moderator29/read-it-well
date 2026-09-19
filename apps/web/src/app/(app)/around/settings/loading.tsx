/**
 * The wait, on the directory of places.
 *
 * `/around/settings` is force-dynamic and makes five reads before it can render a
 * word, because membership is per viewer and the page changes shape when you
 * join one. On a slow Nigerian connection Next holds the previous screen for
 * that whole time, so a tap on Manage places looks like a tap that did nothing.
 *
 * The real layout rather than a spinner, so nothing jumps when the data lands.
 */
export default function LoadingAroundManage() {
  return (
    <div className="mx-auto w-full max-w-3xl pb-4xl pt-md" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading places</span>

      <div className="mb-lg space-y-sm" aria-hidden="true">
        <span className="nf-social-skeleton block h-7 w-32 rounded-[var(--nf-radius-xs)]" />
        <span className="nf-social-skeleton block h-3 w-4/5 rounded-[var(--nf-radius-xs)]" />
      </div>

      <span
        className="nf-social-skeleton mb-sm block h-3 w-24 rounded-[var(--nf-radius-xs)]"
        aria-hidden="true"
      />
      <ul className="flex flex-col gap-xs" aria-hidden="true">
        {[0, 1, 2, 3].map((row) => (
          <li key={row} className="nf-card flex items-start gap-sm p-md">
            <div className="min-w-0 flex-1 space-y-xs">
              <span className="nf-social-skeleton block h-4 w-40 rounded-[var(--nf-radius-xs)]" />
              <span className="nf-social-skeleton block h-3 w-56 rounded-[var(--nf-radius-xs)]" />
            </div>
            <span className="nf-social-skeleton block h-9 w-20 rounded-[var(--nf-radius-control)]" />
          </li>
        ))}
      </ul>
    </div>
  );
}
