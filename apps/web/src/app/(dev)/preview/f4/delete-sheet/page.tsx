import { FeedPreview } from "../FeedPreview";
import { DeleteSheetOpen } from "./DeleteSheetOpen";

/**
 * Taking a post down, as the feed, the thread, a story and a comment now ask
 * it: the shared sheet with the slide, open over the feed. Fixtures only.
 */
export default function DeleteSheetPreview() {
  return (
    <main className="min-h-dvh bg-[var(--nf-surface-canvas)]">
      <FeedPreview bloomOpen={false} />
      <DeleteSheetOpen />
    </main>
  );
}
