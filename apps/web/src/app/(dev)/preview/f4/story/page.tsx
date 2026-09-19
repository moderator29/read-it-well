import { StoryViewer } from "@/components/social/story/StoryViewer";
import { FEED_STORIES, STORY, STORY_COMMENTS, STORY_FACES } from "../fixtures";

/**
 * One story, full bleed, from fixtures: the real `StoryViewer` exactly as
 * `/stories/[id]` composes it, so the glass card over the photograph, the
 * action row, the pile of faces and the way in to the comments can all be
 * photographed. The register is the feed's (`DESIGN_DIRECTION` section 3.7).
 *
 * THE WRAPPER IS NOT DECORATION, it is the shell this screen is measured
 * against. `.nf-story` pulls itself up by `-2rem - var(--nf-social-bar)` so
 * the picture bleeds behind the app header, and `.nf-story__top` then pays
 * that back so the author row clears it. Photographed without the header and
 * the section padding, the whole author row sits above the viewport and the
 * shot shows a clipped bar that the real page does not have. The stand-in bar
 * below is the app header's height and nothing else: F1 owns its contents and
 * they are not what this page is proving.
 */
export default function StoryPreview() {
  return (
    <main className="min-w-0 flex-1 pb-4xl">
      <div
        aria-hidden="true"
        className="nf-glass nf-glass--chrome nf-safe-top nf-app-header sticky top-0 z-40"
      >
        <div className="h-header-sm sm:h-header" />
      </div>
      <div className="nf-shell py-section-tight">
        <StoryViewer
          story={STORY}
          faces={STORY_FACES}
          overflow={12}
          comments={STORY_COMMENTS}
          more={FEED_STORIES.slice(1)}
          signedIn
          viewerFollows={false}
        />
      </div>
    </main>
  );
}
