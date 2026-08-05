import { POST_COPY } from "@/lib/social/posts-schema";

/**
 * What is left when a post is taken down.
 *
 * The row survives on purpose. `posts.parent_id` is ON DELETE CASCADE, so a
 * real delete would take every reply written underneath with it, which is
 * deleting other people's words to honour one person's decision about their
 * own. The row stays, loses everything it carried, and says so.
 *
 * **Its own module, and that is the point.** The thread page had a private
 * `Tombstone` and tested for it with `body === null`, which is not the same
 * fact: a post with no words is not a post that was removed, and a card in a
 * feed or on a profile has no way to tell the difference. So every other
 * surface drew a removed post as an empty rectangle with the pictures still on
 * it. One component, read from `PostCard`, so a fourth surface cannot quietly
 * be a fourth place that forgets. That is the same reason `ViewportPost` is a
 * module rather than a helper inside a feed.
 *
 * The sentence changes with the shape of the thread, because "the replies under
 * it are still here" is a promise and it is only true when there are some.
 */
export function Tombstone({ replyCount = 0 }: { replyCount?: number }) {
  return (
    <div className="rounded-[var(--nf-radius-lg)] border border-dashed border-[var(--nf-border-default)] px-4 py-3">
      <p className="text-sm leading-relaxed text-[var(--nf-content-muted)]">
        <span className="font-semibold text-[var(--nf-content-secondary)]">
          {POST_COPY.removed}
        </span>
        {replyCount > 0 ? ` ${POST_COPY.removedReplies}` : null}
      </p>
    </div>
  );
}
