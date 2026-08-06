/**
 * The wait, designed.
 *
 * `/u/[handle]` and `/u/[handle]/edit` are both force-dynamic and both make two
 * or three round trips to Postgres before they can render a single word. On a
 * slow connection Next holds the previous screen for that whole time, so a tap
 * on somebody's handle looks like a tap that did nothing. This is the answer to
 * that: the shape of the page arrives immediately, the content fills in.
 *
 * It is the real layout rather than a spinner, so nothing moves when the data
 * lands: the banner, the avatar sitting over it with the action row bottom
 * aligned beside it, the name block, the meta line, the counts and the tab
 * track are all exactly where they will be. Under reduced motion the shimmer
 * stops on its own, because `.nf-social-skeleton` collapses through the token
 * durations.
 *
 * Nothing here is a number or a word. A skeleton that renders "0 Followers"
 * while it waits has told the reader something false about the person, and
 * they will have read it before the truth arrives.
 */
export default function LoadingProfile() {
  return (
    <div className="mx-auto max-w-2xl" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading this page</span>

      <div className="nf-social-cover">
        <div className="nf-social-cover__art" aria-hidden="true" />
      </div>

      <div className="nf-social-identity" aria-hidden="true">
        <div className="nf-social-avatar nf-social-avatar--ring" />
        <div className="nf-social-identity__actions">
          <span className="nf-social-skeleton block h-11 w-24 rounded-[var(--nf-radius-pill)]" />
          <span className="nf-social-skeleton block h-11 w-11 rounded-[var(--nf-radius-pill)]" />
        </div>
      </div>

      <div className="mt-3.5 space-y-2.5" aria-hidden="true">
        <span className="nf-social-skeleton block h-5 w-40 rounded-[var(--nf-radius-xs)]" />
        <span className="nf-social-skeleton block h-3 w-32 rounded-[var(--nf-radius-xs)]" />
        <span className="nf-social-skeleton mt-5 block h-3 w-full rounded-[var(--nf-radius-xs)]" />
        <span className="nf-social-skeleton block h-3 w-4/5 rounded-[var(--nf-radius-xs)]" />
        <div className="flex gap-5 pt-1.5">
          <span className="nf-social-skeleton block h-3 w-24 rounded-[var(--nf-radius-xs)]" />
          <span className="nf-social-skeleton block h-3 w-24 rounded-[var(--nf-radius-xs)]" />
        </div>
        <div className="flex gap-5 pt-1.5">
          <span className="nf-social-skeleton block h-4 w-20 rounded-[var(--nf-radius-xs)]" />
          <span className="nf-social-skeleton block h-4 w-20 rounded-[var(--nf-radius-xs)]" />
          <span className="nf-social-skeleton block h-4 w-14 rounded-[var(--nf-radius-xs)]" />
        </div>
        <span className="nf-social-skeleton mt-6 block h-11 w-full rounded-[var(--nf-radius-pill)]" />
      </div>
    </div>
  );
}
