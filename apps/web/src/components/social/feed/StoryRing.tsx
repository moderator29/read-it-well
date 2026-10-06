import { initial } from "@/lib/text/initial";
import Link from "next/link";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { StoryCard } from "@/lib/social/stories-queries";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { StoryRingItem } from "../story/StoryRingItem";

export type StoryRingYou = { label: string; avatarUrl: string };

/**
 * The ring row under the location chip.
 *
 * "Your story" first, with the person's own photo inside a glowing ring and a
 * plus at its foot, then one ring per person who has a live story, newest
 * first. Every ring is a real link: yours to the story composer, theirs to the
 * story itself. A person with several stories gets one ring, their newest,
 * because the row is faces and not a list of files.
 *
 * The picture in a ring is the story's own photograph, because that is what a
 * story is here: a picture of a real place with a headline. The person's name
 * sits under it exactly as the render draws it.
 *
 * THE RING IS A STATUS, NOT A DECORATION (reference 7128). One segment per live
 * story the person has, lit until this reader opens it, still for ever: the
 * old light that turned round it without end is gone, because motion that
 * answers nothing is cut. "Opened" is kept on this device only
 * (`../story/seen.ts`), since the platform never records who saw a story.
 *
 * A server component. The row scrolls sideways on the browser's own momentum,
 * which no script improves on; only each ring's wrapper is a client component,
 * to read the device's seen list.
 */
export function StoryRing({
  stories,
  you,
  yourStoryLabel,
  seenWord = "seen",
}: {
  stories: StoryCard[];
  /** The signed-in person, or null when there is nobody to draw. */
  you: StoryRingYou | null;
  yourStoryLabel: string;
  /** Said after a name whose stories have all been opened. */
  seenWord?: string;
}) {
  /* One ring per person, on their newest story (the list is newest first),
     carrying every live story that person has, oldest first, so the ring can
     draw a segment for each. A person with no handle is one ring per story,
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

  const monogram = initial(you?.label);

  return (
    <div className="nf-story-ring" data-testid="story-ring">
      <ul className="nf-story-ring__row" aria-label="Stories">
        <li>
          <Link href="/stories/new" className="nf-story-ring__item" data-testid="your-story" title={yourStoryLabel}>
            <span className="nf-story-ring__disc nf-story-ring__disc--you">
              {you?.avatarUrl ? (
                <RemoteImage src={you.avatarUrl} alt="" width={128} height={128} sizes="64px" />
              ) : (
                <span className="nf-story-ring__monogram" aria-hidden="true">
                  {monogram}
                </span>
              )}
              <span className="nf-story-ring__plus" aria-hidden="true">
                <UiIcon name="plus" size={12} />
              </span>
            </span>
            <span className="nf-story-ring__name">{yourStoryLabel}</span>
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
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
