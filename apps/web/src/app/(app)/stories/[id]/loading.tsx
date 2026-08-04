/**
 * The wait, on a story.
 *
 * `/stories/[id]` is force-dynamic and makes five reads before it can draw
 * anything: the story, the faces behind its likes, its comments, the rail of
 * other stories and the author's profile. It is also the address every story
 * notification links to, so most people arrive here from outside the app with no
 * previous screen to hold, and a blank pause is the whole experience.
 *
 * The stage keeps its full-bleed shape and the headline card keeps its place at
 * the foot, so the picture lands into the frame it was always going to fill
 * rather than pushing the words down the screen when it arrives.
 */
export default function LoadingStory() {
  return (
    <div className="nf-story" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading this story</span>
      <article className="nf-story__stage" aria-hidden="true">
        <div className="nf-social-skeleton nf-story__image" />

        {/* The author row's own space, held empty.
            `.nf-story` pulls itself up under the floating header on purpose so
            the picture reaches the top of the screen, and `.nf-story__top`
            carries the padding that clears it again. Without this element the
            stage's `space-between` had one child, so the headline card sat at
            the top of the screen with its first line cut off by the header. */}
        <div className="nf-story__top">
          <span className="nf-social-skeleton block h-9 w-9 shrink-0 rounded-[var(--nf-radius-pill)]" />
          <span className="nf-social-skeleton block h-3 w-28 rounded-[var(--nf-radius-xs)]" />
        </div>

        <div className="nf-story__foot">
          <div className="nf-story__card space-y-3">
            <span className="nf-social-skeleton block h-4 w-24 rounded-[var(--nf-radius-pill)]" />
            <span className="nf-social-skeleton block h-6 w-4/5 rounded-[var(--nf-radius-xs)]" />
            <span className="nf-social-skeleton block h-3 w-full rounded-[var(--nf-radius-xs)]" />
            <span className="nf-social-skeleton block h-3 w-2/3 rounded-[var(--nf-radius-xs)]" />
          </div>
        </div>
      </article>
    </div>
  );
}
