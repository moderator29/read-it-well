"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PostCard, type PostView } from "./PostCard";
import { Composer } from "./Composer";
import { ReportSheet } from "../ReportSheet";
import { ActionSheet, actionsForPost } from "../ActionSheet";
import { DistrictChips, DistrictHeader, type DistrictChip } from "./DistrictHeader";
import { StoryGrid } from "../story/StoryGrid";
import type { StoryCard } from "@/lib/social/stories-queries";
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
  district,
}: {
  initial: PostView[];
  signedIn: boolean;
  isMember: boolean;
  areaId?: string;
  areaName?: string;
  emptyMessage: string;
  /** Present only on a district feed. Absent on a profile, where the header
      and the chip row would be answering a question nobody asked. */
  district?: {
    city: string;
    slug: string;
    places: { slug: string; name: string; city: string }[];
    stories: StoryCard[];
    join?: React.ReactNode;
  };
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
  /* One sheet per screen, holding the post it was opened for. One per card
     would be one modal per row in the document. */
  const [sheetFor, setSheetFor] = useState<PostView | null>(null);
  const [chip, setChip] = useState<DistrictChip>("all");
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
    action: string,
  ) => {
    if (action === "share") {
      const url = `${window.location.origin}/post/${post.id}`;
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        void navigator.share({ url }).catch(() => {
          /* Cancelling a share sheet is not a failure and gets no message. */
        });
        return;
      }
      void navigator.clipboard?.writeText(url);
      setNotice(POST_COPY.copied);
      return;
    }
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
      /* "Not interested" is a mute on the person, which is the only thing this
         product can honestly do with it today: there is no per-post ranking
         signal to feed, and a control that silently does nothing is worse than
         one that does something smaller than its label suggests. The label says
         "see less from them" for that reason. */
      if (action === "hide") {
        const target = post.author?.id;
        if (!target) return setNotice("There is nobody to do that to on this post.");
        const result = await muteTarget({ targetKind: "USER", targetId: target });
        setNotice(result.ok ? POST_COPY.mutedDone : result.error);
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
    });
  };

  /*
   * Filtered in the browser over what the page already holds, so moving
   * between chips costs nothing. Apartments are posts carrying a listing;
   * Updates are everything a person wrote that is not one; Stories are their
   * own object and come from their own read. Reviews are the one chip with no
   * source yet: there is no read for reviews in an area, and it says so rather
   * than quietly showing nothing.
   */
  const shown =
    chip === "apartments"
      ? posts.filter((post) => Boolean(post.listing))
      : chip === "updates"
        ? posts.filter((post) => !post.listing && post.authorKind === "USER")
        : posts;

  const counts: Partial<Record<DistrictChip, number>> = district
    ? {
        apartments: posts.filter((post) => Boolean(post.listing)).length,
        stories: district.stories.length,
        updates: posts.filter((post) => !post.listing && post.authorKind === "USER").length,
      }
    : {};

  return (
    <div className="flex flex-col gap-[var(--nf-feed-gap)]">
      {district && areaName ? (
        <>
          <DistrictHeader
            name={areaName}
            city={district.city}
            places={district.places}
            currentSlug={district.slug}
            filtersOn={chip !== "all"}
            onFilter={() => setChip(chip === "all" ? "apartments" : "all")}
            trailing={district.join}
          />
          <DistrictChips active={chip} counts={counts} onPick={setChip} />
        </>
      ) : null}

      {district && chip === "stories" ? (
        <StoryGrid stories={district.stories} handle={areaName ?? "this place"} isOwner={false} />
      ) : null}

      {district && chip === "reviews" ? (
        <div className="nf-card nf-post p-6 text-center">
          <p className="text-sm leading-relaxed text-[var(--nf-content-muted)]">
            Reviews of the stays around here are on each place&rsquo;s own page.
            They arrive in this feed once a review can name the place it is
            about rather than only the flat.
          </p>
        </div>
      ) : null}

      {areaId && chip !== "stories" && chip !== "reviews" ? (
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

      {chip !== "stories" && chip !== "reviews" && shown.length === 0 ? (
        <div className="nf-card nf-post p-6 text-center">
          <p className="text-sm leading-relaxed text-[var(--nf-content-muted)]">
            {emptyMessage}
          </p>
        </div>
      ) : null}

      {(chip === "stories" || chip === "reviews" ? [] : shown).map((post) => (
        <div key={post.id} className="flex flex-col gap-[var(--nf-feed-gap)]">
          <ViewportPost post={post}>
            <PostCard
              post={post}
              onLike={() => onLike(post)}
              onRepost={() => onRepost(post)}
              onReply={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
              onShare={() => onMenuAction(post, "share")}
              onSave={() => onMenuAction(post, "save")}
              onMenu={() => setSheetFor(post)}
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

      {sheetFor ? (
        <ActionSheet
          label="What would you like to do?"
          actions={actionsForPost({
            isMine: sheetFor.isMine,
            isAgentAuthor: Boolean(sheetFor.author?.isAgent),
            hasListing: Boolean(sheetFor.listing),
            saved: sheetFor.saved,
            who: sheetFor.author?.handle ? `@${sheetFor.author.handle}` : "this person",
          })}
          onChoose={(key) => onMenuAction(sheetFor, key)}
          onClose={() => setSheetFor(null)}
        />
      ) : null}

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
