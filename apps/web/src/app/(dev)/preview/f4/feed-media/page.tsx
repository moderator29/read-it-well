import { Feed } from "@/components/social/feed/Feed";
import type { PostView } from "@/components/social/feed/PostCard";
import { FEED_POSTS } from "../fixtures";

/**
 * One card per picture layout (one, two, three, four), one of them a portrait
 * by its stored dimensions, so the grid shapes and the card menu can be
 * measured at phone widths. Fixtures only; nothing here ships.
 */
const PICS = [
  "/brand/photos/villa-pool-skyline-01-640.jpg",
  "/brand/photos/skyline-waterfront-dusk-640.jpg",
  "/brand/photos/villa-pool-terrace-640.jpg",
  "/brand/photos/bedroom-01-640.jpg",
];

const base = FEED_POSTS[0]!;

function withPictures(count: number, portrait = false): PostView {
  return {
    ...base,
    id: `00000000-0000-4000-8000-0000000m000${count}${portrait ? 1 : 0}`,
    body: `${count} picture${count > 1 ? "s" : ""}${portrait ? ", portrait" : ""}`,
    media: PICS.slice(0, count).map((url) => ({
      url,
      width: portrait ? 427 : 640,
      height: portrait ? 640 : 427,
    })),
  };
}

export default function FeedMediaPreview() {
  const posts = [withPictures(1, true), withPictures(2), withPictures(3), withPictures(4)];
  return (
    <main className="min-h-dvh bg-[var(--nf-surface-canvas)]">
      <div className="nf-shell mx-auto w-full max-w-3xl pt-sm">
        <Feed initial={posts} locale="en" signedIn emptyMessage="" />
      </div>
    </main>
  );
}
