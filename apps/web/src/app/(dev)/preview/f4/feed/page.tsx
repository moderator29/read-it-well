import { FeedPreview } from "../FeedPreview";

export default function FeedPreviewPage() {
  /* The main landmark the app shell gives the real feed. */
  return (
    <main>
      <FeedPreview bloomOpen={false} />
    </main>
  );
}
