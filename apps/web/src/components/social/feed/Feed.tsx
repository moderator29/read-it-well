"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PostCard, type PostView } from "./PostCard";
import { Composer } from "./Composer";
import { ReportSheet } from "../ReportSheet";
import { PostEditor } from "./PostEditor";
import {
  blockUser,
  muteTarget,
  recordView,
  removePost,
  reportPost,
  toggleMark,
  toggleRepost,
} from "@/lib/social/posts-actions";
import { POST_COPY, POST_REPORT_REASONS } from "@/lib/social/posts-schema";

/**
 * The feed.
 *
 * Cards float independently, with no line threading them together. That line
 * was built and cut: it made the surface read as an information-design exercise
 * rather than as somewhere people talk.
 *
 * Marks are optimistic and reverted the moment the server disagrees. The rule
 * is that the UI may be ahead of the database for a second and may never be
 * wrong about it after a reload, which is what `router.refresh()` guarantees.
 *
 * Replies unfold in place rather than opening a page. Somebody wanting to say
 * one line should not lose their scroll position to say it.
 */
export function Feed({
  initial,
  signedIn,
  isMember,
  areaId,
  areaName,
  emptyMessage,
}: {
  initial: PostView[];
  signedIn: boolean;
  isMember: boolean;
  areaId?: string;
  areaName?: string;
  emptyMessage: string;
}) {
  const router = useRouter();
  const [posts, setPosts] = useState(initial);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /* The post a report sheet is open for. A report used to fire on the first tap
     with reason OTHER and no way back, which is both an untriageable queue and
     a control people learn not to touch. */
  const [reporting, setReporting] = useState<PostView | null>(null);
  /* The post currently being changed. One at a time: two open editors on one
     screen is two drafts somebody can lose. */
  const [editing, setEditing] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // The server is the truth. When a refresh brings new props, take them.
  useEffect(() => setPosts(initial), [initial]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const patch = (id: string, next: Partial<PostView>) =>
    setPosts((all) => all.map((p) => (p.id === id ? { ...p, ...next } : p)));

  const onLike = (post: PostView) => {
    if (!signedIn) {
      router.push("/sign-in");
      return;
    }
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
    if (!signedIn) {
      router.push("/sign-in");
      return;
    }
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
    action: "copy" | "save" | "mute" | "block" | "report" | "delete" | "edit",
  ) => {
    if (action === "copy") {
      void navigator.clipboard?.writeText(`${window.location.origin}/post/${post.id}`);
      setNotice(POST_COPY.copied);
      return;
    }
    if (!signedIn) {
      router.push("/sign-in");
      return;
    }
    if (action === "report") {
      setReporting(post);
      return;
    }
    if (action === "edit") {
      setEditing(post.id);
      return;
    }

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
        if (!result.ok) return setNotice(result.error);
        setPosts((all) => all.filter((p) => p.id !== post.id));
        router.refresh();
        return;
      }
      // Both of these act on a PERSON, so they need the author's user id and
      // not the post's. Passing the post id would have blocked a uuid that is
      // nobody, silently succeeded, and shown "Blocked" for an action that did
      // nothing at all.
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
    });
  };

  return (
    <div className="flex flex-col gap-[var(--nf-feed-gap)]">
      {areaId ? (
        <Composer
          areaId={areaId}
          areaName={areaName}
          signedIn={signedIn}
          isMember={isMember}
        />
      ) : null}

      {notice ? (
        <p
          role="status"
          className="rounded-[var(--nf-radius-md)] border border-[var(--nf-border-brand)] bg-[var(--nf-surface-inset)] px-4 py-3 text-sm leading-relaxed text-[var(--nf-content-secondary)]"
        >
          {notice}
        </p>
      ) : null}

      {posts.length === 0 ? (
        <div className="nf-card nf-post p-6 text-center">
          <p className="text-sm leading-relaxed text-[var(--nf-content-muted)]">
            {emptyMessage}
          </p>
        </div>
      ) : null}

      {posts.map((post) => (
        <div key={post.id} className="flex flex-col gap-[var(--nf-feed-gap)]">
          <ViewportPost post={post}>
            <PostCard
              post={post}
              onLike={() => onLike(post)}
              onRepost={() => onRepost(post)}
              onReply={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
              onShare={() => onMenuAction(post, "copy")}
              onMenuAction={(action) => onMenuAction(post, action)}
              editor={
                editing === post.id ? (
                  <PostEditor
                    postId={post.id}
                    initialBody={post.rawBody ?? post.body ?? ""}
                    onDone={() => setEditing(null)}
                    onSaved={(body, held) => {
                      patch(post.id, { body, rawBody: body, edited: true });
                      setNotice(held ? POST_COPY.editHeld : POST_COPY.editedDone);
                      router.refresh();
                    }}
                  />
                ) : undefined
              }
            />
          </ViewportPost>

          {/* The card unfolds. No new page, no lost scroll position. */}
          {replyingTo === post.id ? (
            <div className="ps-4">
              <Composer
                parentId={post.id}
                signedIn={signedIn}
                autoFocus
                onDone={() => setReplyingTo(null)}
              />
            </div>
          ) : null}
        </div>
      ))}

      {reporting ? (
        <ReportSheet
          title="Report this post"
          subject={
            reporting.author?.handle
              ? `Posted by @${reporting.author.handle}`
              : "Posted on Around"
          }
          reasons={POST_REPORT_REASONS}
          submit={({ reason, detail }) =>
            reportPost({ postId: reporting.id, reason, detail })
          }
          onClose={() => setReporting(null)}
        />
      ) : null}
    </div>
  );
}

/**
 * Records a view once, when the card has genuinely been on screen.
 *
 * Half the card and half a second, so a fast scroll past does not count as
 * having been read. The database counts one person once a day regardless, so
 * this only decides whether to make the call at all.
 */
function ViewportPost({ post, children }: { post: PostView; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || done.current) return;
    if (typeof IntersectionObserver === "undefined") return;

    let timer = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          timer = window.setTimeout(() => {
            if (done.current) return;
            done.current = true;
            void recordView({ postId: post.id });
            observer.disconnect();
          }, 500);
        } else {
          window.clearTimeout(timer);
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [post.id]);

  return <div ref={ref}>{children}</div>;
}
