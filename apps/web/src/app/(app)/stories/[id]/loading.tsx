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
import { Skeleton } from "@/components/ui/Skeleton";
import { State } from "@/components/ui/State";

export default function LoadingStory() {
  return (
    <State kind="loading" title="Loading this story" className="nf-story">
      <article className="nf-story__stage" aria-hidden="true">
        {/* This one keeps `.nf-story__image` because the CLASS is the
            geometry: the stage's own aspect and object fit, which no width and
            height on a primitive can stand in for. The MATERIAL comes from the
            primitive, so the sweep and the reduced-motion stop are the
            platform's rather than the social layer's second copy of them. */}
        <Skeleton className="nf-story__image" radius="none" />

        {/* The author row's own space, held empty.
            `.nf-story` pulls itself up under the floating header on purpose so
            the picture reaches the top of the screen, and `.nf-story__top`
            carries the padding that clears it again. Without this element the
            stage's `space-between` had one child, so the headline card sat at
            the top of the screen with its first line cut off by the header. */}
        <div className="nf-story__top">
          <Skeleton width="2.25rem" height="2.25rem" radius="pill" className="shrink-0" />
          <Skeleton width="7rem" height="0.75rem" radius="xs" />
        </div>

        <div className="nf-story__foot">
          <div className="nf-story__card space-y-sm">
            <Skeleton width="6rem" height="1rem" radius="pill" />
            <Skeleton width="80%" height="1.5rem" radius="xs" />
            <Skeleton height="0.75rem" radius="xs" />
            <Skeleton width="66.6667%" height="0.75rem" radius="xs" />
          </div>
        </div>
      </article>
    </State>
  );
}
