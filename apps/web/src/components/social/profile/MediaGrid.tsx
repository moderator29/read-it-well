import Link from "next/link";
import type { MediaTile } from "@/lib/social/profile-tabs-queries";
import { EmptyPanel } from "./EmptyPanel";

/**
 * Every picture somebody has posted, three across.
 *
 * A grid rather than a feed, because at this point a person is looking for a
 * photograph and not for the words around it. Each tile is a square crop and a
 * link into the post it came from, so nothing is a dead end: the picture is the
 * way in, the post is the destination.
 *
 * The URLs are signed and short-lived, because `social-media` is a private
 * bucket. That is why this is a server-rendered grid and not something that
 * fetches on scroll: the whole page is signed in one call.
 */
export function MediaGrid({
  tiles,
  handle,
  isOwner,
}: {
  tiles: MediaTile[];
  handle: string;
  isOwner: boolean;
}) {
  if (tiles.length === 0) {
    return (
      <EmptyPanel
        icon="camera"
        title={isOwner ? "No pictures yet" : `@${handle} has not posted a picture yet`}
        body={
          isOwner
            ? "A photograph of a street, a generator, a queue or a view says more about a place than a paragraph does. Anything you post with a picture lands here."
            : "Anything they post with a picture in it shows up here."
        }
        action={isOwner ? { href: "/around", label: "Find a place to talk in" } : undefined}
      />
    );
  }

  return (
    <ul className="nf-media-grid">
      {tiles.map((tile, index) => (
        <li key={`${tile.postId}-${index}`}>
          <Link href={`/post/${tile.postId}`} className="nf-media-grid__tile">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={tile.url} alt="" loading="lazy" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
