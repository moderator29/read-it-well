"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PostCard, type PostView } from "@/components/social/feed/PostCard";
import { Composer } from "@/components/social/feed/Composer";
import {
  blockUser,
  muteTarget,
  removePost,
  reportPost,
  toggleMark,
  toggleRepost,
} from "@/lib/social/posts-actions";
import { POST_COPY } from "@/lib/social/posts-schema";

type Thread = {
  root: PostView;
  replies: (PostView & { depth: number })[];
};

/**
 * A thread.
 *
 * Replies are indented by depth and nothing else: no connecting line, no rail,
 * no bracket. Indentation alone is enough to read a three-deep conversation on
 * a 390px screen, and the depth cap exists precisely so it stays that way.
 *
 * A removed post keeps its place as a tombstone rather than disappearing,
 * because deleting the row would take everybody's replies with it and a thread
 * that suddenly starts halfway through is a thread nobody can follow.
 */
export function ThreadView({ thread, signedIn }: { thread: Thread; signedIn: boolean }) {
  const router = useRouter();
  const [root, setRoot] = useState(thread.root);
  const [replies, setReplies] = useState(thread.replies);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setRoot(thread.root);
    setReplies(thread.replies);
  }, [thread]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const patch = (id: string, next: Partial<PostView>) => {
    setRoot((r) => (r.id === id ? { ...r, ...next } : r));
    setReplies((all) => all.map((p) => (p.id === id ? { ...p, ...next } : p)));
  };

  const requireSignIn = () => {
    if (signedIn) return false;
    router.push("/sign-in");
    return true;
  };

  const onLike = (post: PostView) => {
    if (requireSignIn()) return;
    const liked = !post.liked;
    patch(post.id, { liked, likeCount: post.likeCount + (liked ? 1 : -1) });
    startTransition(async () => {
      const result = await toggleMark({ postId: post.id, mark: "LIKE" });
      if (!result.ok) {
        patch(post.id, { liked: post.liked, likeCount: post.likeCount });
        setNotice(result.error);
        return;
      }
      router.refresh();
    });
  };

  const onRepost = (post: PostView) => {
    if (requireSignIn()) return;
    const reposted = !post.reposted;
    patch(post.id, { reposted, repostCount: post.repostCount + (reposted ? 1 : -1) });
    startTransition(async () => {
      const result = await toggleRepost({ postId: post.id });
      if (!result.ok) {
        patch(post.id, { reposted: post.reposted, repostCount: post.repostCount });
        setNotice(result.error);
        return;
      }
      router.refresh();
    });
  };

  const onMenuAction = (
    post: PostView,
    action: "copy" | "save" | "mute" | "block" | "report" | "delete",
  ) => {
    if (action === "copy") {
      void navigator.clipboard?.writeText(`${window.location.origin}/post/${post.id}`);
      setNotice(POST_COPY.copied);
      return;
    }
    if (requireSignIn()) return;

    startTransition(async () => {
      if (action === "save") {
        const result = await toggleMark({ postId: post.id, mark: "SAVE" });
        if (!result.ok) return setNotice(result.error);
        patch(post.id, { saved: !post.saved });
        return;
      }
      if (action === "delete") {
        if (!window.confirm(POST_COPY.deleteConfirm)) return;
        const result = await removePost({ postId: post.id });
        setNotice(result.ok ? null : result.error);
        router.refresh();
        return;
      }
      if (action === "mute" || action === "block") {
        const target = post.author?.id;
        if (!target) return setNotice("There is nobody to do that to on this post.");
        const result =
          action === "block"
            ? await blockUser({ userId: target })
            : await muteTarget({ targetKind: "USER", targetId: target });
        setNotice(
          result.ok
            ? action === "block"
              ? POST_COPY.blockedDone
              : POST_COPY.mutedDone
            : result.error,
        );
        router.refresh();
        return;
      }
      if (action === "report") {
        const result = await reportPost({ postId: post.id, reason: "OTHER" });
        setNotice(result.ok ? POST_COPY.reportedDone : result.error);
      }
    });
  };

  const card = (post: PostView) => (
    <PostCard
      post={post}
      onLike={() => onLike(post)}
      onRepost={() => onRepost(post)}
      onReply={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
      onShare={() => onMenuAction(post, "copy")}
      onMenuAction={(action) => onMenuAction(post, action)}
    />
  );

  return (
    <div className="flex flex-col gap-[var(--nf-feed-gap)]">
      {notice ? (
        <p
          role="status"
          className="rounded-[var(--nf-radius-md)] border border-[var(--nf-border-brand)] bg-[var(--nf-surface-inset)] px-4 py-3 text-sm leading-relaxed text-[var(--nf-content-secondary)]"
        >
          {notice}
        </p>
      ) : null}

      {root.body === null && !root.heldReason ? <Tombstone /> : card(root)}

      {replyingTo === root.id ? (
        <Composer parentId={root.id} signedIn={signedIn} autoFocus onDone={() => setReplyingTo(null)} />
      ) : null}

      {/* Always offered, so somebody arriving from a link can answer without
          hunting for the control. */}
      {replyingTo === null ? (
        <Composer parentId={root.id} signedIn={signedIn} onDone={undefined} />
      ) : null}

      {replies.length > 0 ? (
        <h2 className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nf-content-muted)]">
          {replies.length === 1 ? "1 reply" : `${replies.length} replies`}
        </h2>
      ) : null}

      {replies.map((reply) => (
        <div
          key={reply.id}
          // One step of indent per level, capped by the depth cap at three.
          style={{ marginInlineStart: `${Math.min(reply.depth, 3) * 14}px` }}
          className="flex flex-col gap-[var(--nf-feed-gap)]"
        >
          {reply.body === null && !reply.heldReason ? <Tombstone /> : card(reply)}
          {replyingTo === reply.id ? (
            <Composer
              parentId={reply.id}
              signedIn={signedIn}
              autoFocus
              onDone={() => setReplyingTo(null)}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function Tombstone() {
  return (
    <div className="rounded-[var(--nf-radius-lg)] border border-dashed border-[var(--nf-border-default)] px-4 py-3">
      <p className="text-sm leading-relaxed text-[var(--nf-content-muted)]">
        <span className="font-semibold text-[var(--nf-content-secondary)]">
          {POST_COPY.removed}
        </span>{" "}
        The replies under it are still here.
      </p>
    </div>
  );
}
