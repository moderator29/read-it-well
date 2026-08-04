import Link from "next/link";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { PostGlyph } from "@/components/social/feed/PostGlyph";
import type { StoryCard } from "@/lib/social/stories-queries";
import { STORY_COPY } from "@/lib/social/stories-schema";
import { EmptyPanel } from "../profile/EmptyPanel";

/**
 * Stories, as a list of plates.
 *
 * A story is an editorial piece with a headline, not a bubble that pops after a
 * day, so it is drawn as something you would keep: the picture, the headline
 * over it, the place under that. Nothing here counts down and nothing expires.
 *
 * The headline sits ON the picture behind a scrim rather than under it, which
 * is what makes a row of these read as a magazine contents page instead of as a
 * list of files.
 */
export function StoryGrid({
  stories,
  handle,
  isOwner,
}: {
  stories: StoryCard[];
  handle: string;
  isOwner: boolean;
}) {
  if (stories.length === 0) {
    return (
      <EmptyPanel
        icon="camera"
        title={isOwner ? "No stories yet" : `@${handle} has not written a story yet`}
        body={isOwner ? STORY_COPY.emptyMine : "Stories they write show up here, and they stay."}
        action={isOwner ? { href: "/stories/new", label: "Write a story" } : undefined}
      />
    );
  }

  return (
    <ul className="flex flex-col gap-[var(--nf-social-gap)]">
      {stories.map((story) => (
        <li key={story.id}>
          <Link href={`/stories/${story.id}`} className="nf-story-plate">
            {story.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={story.imageUrl} alt="" loading="lazy" />
            ) : (
              <span className="nf-story-plate__art" aria-hidden="true" />
            )}
            <span className="nf-story-plate__scrim" aria-hidden="true" />
            <span className="nf-story-plate__body">
              <span className="nf-story-chip">{STORY_COPY.chip}</span>
              <span className="nf-story-plate__headline">{story.headline}</span>
              <span className="nf-story-plate__meta">
                {story.placeLabel ? (
                  <span className="inline-flex items-center gap-1.5">
                    <UiIcon name="location" size={13} />
                    {story.placeLabel}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <PostGlyph name="like" size={13} active />
                  <span className="nf-numeric">{story.likeCount}</span>
                </span>
                <span>{story.createdLabel}</span>
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
