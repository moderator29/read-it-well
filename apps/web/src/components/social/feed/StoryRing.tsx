import Link from "next/link";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { StoryCard } from "@/lib/social/stories-queries";
import { RemoteImage } from "@/components/ui/RemoteImage";

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
 * A server component. It ships no JavaScript and the row scrolls sideways on
 * the browser's own momentum, which no script improves on.
 */
export function StoryRing({
  stories,
  you,
  yourStoryLabel,
}: {
  stories: StoryCard[];
  /** The signed-in person, or null when there is nobody to draw. */
  you: StoryRingYou | null;
  yourStoryLabel: string;
}) {
  const seen = new Set<string>();
  const people = stories.filter((story) => {
    const key = story.authorHandle ?? story.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const monogram = (you?.label ?? "?").charAt(0).toUpperCase();

  return (
    <div className="nf-story-ring" data-testid="story-ring">
      <ul className="nf-story-ring__row" aria-label="Stories">
        <li>
          <Link href="/stories/new" className="nf-story-ring__item" data-testid="your-story">
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
        {people.map((story) => (
          <li key={story.id}>
            <Link href={`/stories/${story.id}`} className="nf-story-ring__item">
              <span className="nf-story-ring__disc">
                {story.imageUrl ? (
                  <RemoteImage
                    src={story.imageUrl}
                    alt=""
                    width={128}
                    height={128}
                    sizes="64px"
                    loading="lazy"
                  />
                ) : (
                  <span className="nf-story-ring__monogram" aria-hidden="true">
                    {story.authorLabel.charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
              {/* The first name, as the render labels its rings; the whole
                  name and the headline are read out. */}
              <span className="nf-story-ring__name" aria-hidden="true">
                {story.authorLabel.split(/\s+/)[0]}
              </span>
              <span className="sr-only">{story.authorLabel}</span>
              <span className="sr-only">: {story.headline}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
