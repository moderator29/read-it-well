"use client";

import { useMemo } from "react";
import Link from "next/link";
import { initial } from "@/lib/text/initial";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { allSeen, ringGradient } from "./ring";
import { useSeenStories } from "./seen";

/**
 * One person's ring in the row under the location chip.
 *
 * The row stays a server component and ships no script for the pictures; only
 * this wrapper reads the device's seen list, because a seen ring is a fact
 * about this reader on this phone and nothing the server knows (see
 * `./seen`). The link goes to the person's newest story, as it always did.
 *
 * `storyIds` is every live story this person has, OLDEST first, so the ring
 * reads clockwise in the order they were told. Segments are drawn from the
 * ids, not from a number: a segment goes quiet when that exact story has been
 * opened.
 *
 * `seenWord` is said to a screen reader after the name, because a quiet
 * segment must never be the only way to learn a story was already opened.
 */
export function StoryRingItem({
  href,
  title,
  name,
  headline,
  imageUrl,
  storyIds,
  seenWord,
}: {
  href: string;
  title: string;
  name: string;
  headline: string;
  imageUrl: string | null;
  storyIds: readonly string[];
  seenWord: string;
}) {
  /* The server snapshot is "nothing opened", so the first paint is every ring
     lit, the same as the server drew, and the device's list takes over right
     after hydration with no flash. */
  const seenIds = useSeenStories();
  const flags = useMemo(() => storyIds.map((id) => seenIds.includes(id)), [storyIds, seenIds]);
  const done = allSeen(flags);

  return (
    <Link href={href} className="nf-story-ring__item" title={title}>
      <span
        className="nf-story-ring__disc"
        data-seen={done ? "all" : undefined}
        style={{ "--nf-ring": ringGradient(flags) } as React.CSSProperties}
      >
        {imageUrl ? (
          <RemoteImage src={imageUrl} alt="" width={128} height={128} sizes="64px" loading="lazy" />
        ) : (
          <span className="nf-story-ring__monogram" aria-hidden="true">
            {initial(title)}
          </span>
        )}
      </span>
      {/* The first name, as the render labels its rings; the whole name and
          the headline are read out. */}
      <span className="nf-story-ring__name" aria-hidden="true">
        {name}
      </span>
      <span className="sr-only">{title}</span>
      <span className="sr-only">: {headline}</span>
      {done ? <span className="sr-only">, {seenWord}</span> : null}
    </Link>
  );
}
