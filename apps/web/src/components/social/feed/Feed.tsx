"use client";

import { DEFAULT_LOCALE, type Locale } from "@vallo/i18n";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PostCard, type PostView } from "./PostCard";
import { ReportSheet } from "../ReportSheet";
import { ActionSheet, actionsForPost } from "../ActionSheet";
import {
  DistrictChips,
  DistrictHeader,
  districtPanelId,
  districtTabId,
  type DistrictChip,
} from "./DistrictHeader";
import { StoryGrid } from "../story/StoryGrid";
import { ReviewList } from "../profile/ReviewList";
import { EmptyPanel } from "../profile/EmptyPanel";
import type { StoryCard } from "@/lib/social/stories-queries";
import type { ReviewCard } from "@/lib/social/profile-tabs-queries";
import { PostEditor } from "./PostEditor";
import { ViewportPost } from "./ViewportPost";
import {
  blockUser,
  muteTarget,
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
  locale = DEFAULT_LOCALE,
  signedIn,
  areaName,
  emptyMessage,
  district,
}: {
  initial: PostView[];
  /* Only the counts need it, but they are on every card, so it rides down from
     the server component that resolved it rather than each card guessing. */
  locale?: Locale;
  signedIn: boolean;
  /**
   * Whether this timeline is one somebody can write into.
   *
   * This replaces `isMember`, which asked the wrong question. The composer used
   * to be gated on `areaId && isMember`, so it appeared only inside a place the
   * viewer had joined, and the main feed, which is where most people are when
   * they think of something to say, had no way to write at all. A post no
   * longer needs a place, so the real question is whether this list is a
   * timeline or a record: the feed on `/around` and inside an area is one, a
   * profile's own posts and an activity list are not.
   */
  /* Accepted and ignored since the permanent composer left the top of the
     feed. Both are still passed by every caller and both still matter to
     POSTING, which now happens through `AroundFab`; the page hands the same
     values to it. Removing them from this type would mean editing four call
     sites to delete a prop that is about to be needed again the moment
     anything else on this screen wants to know which place it is in. */
  canCompose?: boolean;
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
    /** What guests said about the stays filed under this place. */
    reviews: ReviewCard[];
    join?: React.ReactNode;
  };
}) {
  const router = useRouter();
  const [posts, setPosts] = useState(initial);
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

  /*
   * Repost, wired at last.
   *
   * `toggleRepost` has been a real, RLS-bound server action since the social
   * layer landed and nothing ever called it: the card took an `onRepost` prop
   * that was never passed, so the count sat on every post with no way to move
   * it. Same optimistic shape as a like, reverted the moment the server
   * disagrees.
   */
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
    /*
     * Contact agent. The sheet has offered this row since it was written and
     * nothing here answered it, so the highest intent tap in the whole layer,
     * message the person selling the flat, quietly did nothing at all.
     *
     * `/messages/new?listing=` is the bridge the listing page already uses: it
     * resolves the agent from the listing server side and opens the thread, so
     * the social layer needs no second way to start a conversation.
     */
    if (action === "contact") {
      if (!post.listing) {
        setNotice("There is no flat on this post to ask about.");
        return;
      }
      router.push(`/messages/new?listing=${post.listing.id}`);
      return;
    }
    if (!signedIn) {
      router.push("/sign-in");
      return;
    }
    /* The one row this sheet offers that already had a handler and no way to
       reach it. `onRepost` was passed into every card and nothing ever called
       it. */
    if (action === "repost") {
      onRepost(post);
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
      // A "hide" key used to live here writing the identical mute behind a row
      // labelled "Not interested". One key now, named for what it does.
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
   * Updates are everything a person wrote that is not one; Stories and Reviews
   * are their own objects and arrive from their own reads on the server, which
   * is why neither of them is filtered out of `posts` here.
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
        reviews: district.reviews.length,
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
            trailing={district.join}
          />
          <DistrictChips active={chip} counts={counts} onPick={setChip} />
        </>
      ) : null}

      {/*
        * The region the chips filter, named so they can point at it.
        *
        * `DistrictChips` declared `role="tablist"` over five `role="tab"`
        * buttons and there was no `role="tabpanel"` anywhere on the page, so
        * the tab set promised a relationship that did not exist: a screen
        * reader heard "tab 3 of 5" and had nothing to move to. One panel,
        * because one region changes; the live chip is the only one that names
        * it, exactly as `ProfileTabs` does.
        *
        * The tab attributes are conditional because the chips are: no chips
        * outside a district feed, so no panel to be a panel of. The flex
        * classes are the parent's own, so the gap between these children is
        * the value it always was.
        */}
      <div
        {...(district && areaName
          ? {
              id: districtPanelId(chip),
              role: "tabpanel",
              "aria-labelledby": districtTabId(chip),
              tabIndex: -1,
            }
          : {})}
        className="flex flex-col gap-[var(--nf-feed-gap)]"
      >
        {district && chip === "stories" ? (
        <StoryGrid stories={district.stories} handle={areaName ?? "this place"} isOwner={false} />
      ) : null}

      {/* Reviews of the stays filed under this place, written by guests who
          actually stayed. `reviews_insert_own` is what makes that true, and it
          is the reason this chip can be a read rather than an apology. */}
      {district && chip === "reviews" ? (
        district.reviews.length > 0 ? (
          <ReviewList reviews={district.reviews} />
        ) : (
          <EmptyPanel
            icon="reviews"
            title={`Nobody has reviewed a stay around ${areaName ?? "here"} yet`}
            body="A guest can write one once their stay is finished, and it lands here as well as on the flat itself. Until then there is nothing to read, and inventing something would be worse than saying so."
            action={{ href: "/search", label: "See the stays here" }}
          />
        )
      ) : null}

      {/*
        THE PERMANENT COMPOSER IS GONE FROM THE TOP OF THE FEED.

        It sat above the first post as an open panel: two mode chips, a
        four-line text area, an audience line, a hint sentence, an image button
        and a Post button. That is roughly a third of a phone screen, on every
        visit, offered to somebody who came to READ. A person who arrives
        wanting to post is one tap from the same composer through the plus
        control that floats over this list; a person who arrives wanting to read
        was scrolling past a form.

        Nothing was removed from the product. `AroundFab` opens the composer,
        and it is the control this platform already uses for "make something"
        on every other screen, so posting now works the way listing and messaging
        already do rather than being the one thing with a permanent form.
      */}

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
          <ViewportPost postId={post.id}>
            <PostCard
              post={post}
              locale={locale}
              onLike={() => onLike(post)}
              onRepost={() => onRepost(post)}
              onReply={() => router.push(`/post/${post.id}?reply=1`)}
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

          {/*
            THE CARD NO LONGER UNFOLDS A COMPOSER, AND IT USED TO.

            Tapping the reply glyph opened a text box under the card, in the
            feed, with the conversation you were joining still collapsed to a
            single reply count above it. So the one moment a person most needs
            to see what has already been said is the one moment this hid it,
            and the reply they wrote was written blind.

            It goes to the thread now, with `?reply=1`, which opens the post
            with every answer under it and the composer focused and already
            addressed. That is one tap, the same as before, and it lands
            somewhere with a URL: the back button returns to the feed, the
            address can be sent to somebody, and a reload does not lose a
            half-written reply's context.

            The old comment defended this as "no new page, no lost scroll
            position". Scroll position is worth less than knowing what you are
            replying to.
          */}
        </div>
        ))}
      </div>

      {sheetFor ? (
        <ActionSheet
          label="What would you like to do?"
          actions={actionsForPost({
            isMine: sheetFor.isMine,
            isAgentAuthor: Boolean(sheetFor.author?.isAgent),
            hasListing: Boolean(sheetFor.listing),
            saved: sheetFor.saved,
            reposted: sheetFor.reposted,
            repostCount: sheetFor.repostCount,
            editable: sheetFor.editable,
            hasAuthor: Boolean(sheetFor.author?.id),
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
