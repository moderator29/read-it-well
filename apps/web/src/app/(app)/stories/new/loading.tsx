/**
 * The wait, before the story composer.
 *
 * The page cannot draw the form until it knows which places this person has
 * actually joined, because only an ACTIVE place may be offered: `stories_insert_self`
 * refuses anything else, and a place in the picker that the database will refuse
 * is a refusal wearing a control. That is a session read and a membership read
 * before the first field, and it is reached from the create ring, where the tap
 * is deliberate and the wait is felt.
 */
export default function LoadingNewStory() {
  return (
    <div className="mx-auto w-full max-w-2xl pb-24 pt-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Opening the story composer</span>

      <div className="mb-6 space-y-3" aria-hidden="true">
        <span className="nf-social-skeleton block h-7 w-40 rounded-[var(--nf-radius-xs)]" />
        <span className="nf-social-skeleton block h-3 w-64 rounded-[var(--nf-radius-xs)]" />
      </div>

      <div className="nf-card nf-social-card space-y-4 p-5" aria-hidden="true">
        {/* The picture comes first in the real composer, and it is the tallest
            thing on the page, so the skeleton keeps its proportion. */}
        <span className="nf-social-skeleton block aspect-[4/5] w-full rounded-[var(--nf-radius-lg)]" />
        <span className="nf-social-skeleton block h-11 w-full rounded-[var(--nf-radius-md)]" />
        <span className="nf-social-skeleton block h-11 w-full rounded-[var(--nf-radius-md)]" />
        <span className="nf-social-skeleton block h-24 w-full rounded-[var(--nf-radius-md)]" />
        <span className="nf-social-skeleton block h-11 w-40 rounded-[var(--nf-radius-pill)]" />
      </div>
    </div>
  );
}
