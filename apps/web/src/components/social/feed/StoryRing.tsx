import Link from "next/link";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { StoryCard } from "@/lib/social/stories-queries";
import { StoryRingItem } from "../story/StoryRingItem";
import "./feed-v2.css";

export type StoryRingYou = { label: string; avatarUrl: string };

/**
 * The stories row under the place bar.
 *
 * A "+" tile first, in the same rounded square as every story beside it, with
 * a soft dashed outline and a plus in the middle and "Your story" under it; it
 * opens the story composer. Then one rounded-square tile per person who has a
 * live story, newest first, the person's first name under it. Every tile is a
 * real link: yours to the composer, theirs to the story itself. A person with
 * several stories gets one tile, their newest, because the row is people and
 * not a list of files.
 *
 * The picture in a tile is the story's own photograph, because that is what a
 * story is here: a picture of a real place with a headline.
 *
 * THE RING IS A STATUS, NOT A DECORATION (reference 7128). One segment per live
 * story the person has, lit until this reader opens it, still for ever. "Opened"
 * is kept on this device only (`../story/seen.ts`), since the platform never
 * records who saw a story.
 *
 * A server component. The row scrolls sideways on the browser's own momentum,
 * which no script improves on; only each tile's wrapper is a client component,
 * to read the device's seen list.
 */
export function StoryRing({
  stories,
  yourStoryLabel,
  storiesLabel = "Stories",
  addStoryLabel = yourStoryLabel,
  seenWord = "seen",
  viewerId = null,
}: {
  stories: StoryCard[];
  /** The signed-in person; kept for callers that still pass it. The "+" tile
      draws no face, because nothing is claimed for somebody who has not made a story. */
  you?: StoryRingYou | null;
  yourStoryLabel: string;
  /** The row's name for a screen reader. */
  storiesLabel?: string;
  /** What the "+" tile says aloud: it opens the story composer. */
  addStoryLabel?: string;
  /** Said after a name whose stories have all been opened. */
  seenWord?: string;
  /** The signed-in reader's id, so the seen list is kept per account on a shared phone. */
  viewerId?: string | null;
}) {
  /* One tile per person, on their newest story (the list is newest first),
     carrying every live story that person has, oldest first, so the ring can
     draw a segment for each. A person with no handle is one tile per story,
     because nothing says two anonymous stories share an author. */
  const byPerson = new Map<string, StoryCard[]>();
  for (const story of stories) {
    const key = story.authorHandle ?? story.id;
    byPerson.set(key, [...(byPerson.get(key) ?? []), story]);
  }
  const people = [...byPerson.values()].map((own) => ({
    newest: own[0]!,
    ids: own.map((story) => story.id).reverse(),
  }));

  return (
    <div className="nf-story-ring nf-fv2-stories" data-testid="story-ring">
      <ul className="nf-story-ring__row" aria-label={storiesLabel}>
        <li>
          <Link href="/stories/new" className="nf-story-ring__item" data-testid="your-story" title={addStoryLabel}>
            <span className="nf-story-ring__disc nf-story-ring__disc--you">
              <span className="nf-story-ring__add" aria-hidden="true">
                <UiIcon name="plus" size={22} />
              </span>
            </span>
            <span className="nf-story-ring__name" aria-hidden="true">
              {yourStoryLabel}
            </span>
            <span className="sr-only">{addStoryLabel}</span>
          </Link>
        </li>
        {people.map(({ newest, ids }) => (
          <li key={newest.id}>
            <StoryRingItem
              href={`/stories/${newest.id}`}
              title={newest.authorLabel}
              name={newest.authorLabel.split(/\s+/)[0] ?? newest.authorLabel}
              headline={newest.headline}
              imageUrl={newest.imageUrl}
              storyIds={ids}
              seenWord={seenWord}
              viewerId={viewerId}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
