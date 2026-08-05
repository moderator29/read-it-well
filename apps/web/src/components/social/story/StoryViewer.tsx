"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { PostGlyph } from "@/components/social/feed/PostGlyph";
import { BackChevron } from "@/components/social/profile/BackChevron";
import { FollowButton } from "@/components/social/profile/FollowButton";
import { ReportSheet } from "@/components/social/ReportSheet";
import { CommentsSheet } from "@/components/social/comments/CommentsSheet";
import { StoryRail } from "./StoryRail";
import type { Face, StoryCard, StoryComment, StoryView } from "@/lib/social/stories-queries";
import type { CommentRow } from "@/components/social/comments/CommentsSheet";
import {
  commentOnStory,
  recordStoryView,
  removeStory,
  toggleStoryCommentLike,
  toggleStoryMark,
} from "@/lib/social/stories-actions";
import { blockUser, muteTarget, reportProfile } from "@/lib/social/posts-actions";
import { POST_COPY, PROFILE_REPORT_REASONS } from "@/lib/social/posts-schema";
import { STORY_COPY } from "@/lib/social/stories-schema";

/**
 * A story, full bleed.
 *
 * The picture IS the page, not a card on one. Everything floats over it in the
 * order somebody actually reads: who is telling me this, what happened, what I
 * can do about it, who else cared, and then the way in to what people said.
 *
 * The glass card over the lower image is the one piece of chrome that earns its
 * blur: a headline in large tight type has to stay readable over a photograph
 * nobody has seen, and a scrim alone cannot promise that on a bright image.
 *
 * Every action calls a story action rather than a post one. A story owns its
 * reactions, its comments and its views now, and the only things borrowed from
 * the rest of the platform are the ones that should be shared: blocking and
 * muting a person, and reporting the account behind the piece.
 */
export function StoryViewer({
  story,
  faces,
  overflow,
  comments,
  more,
  signedIn,
  viewerFollows,
}: {
  story: StoryView;
  faces: Face[];
  overflow: number;
  comments: StoryComment[];
  more: StoryCard[];
  signedIn: boolean;
  viewerFollows: boolean;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(story.liked);
  const [likeCount, setLikeCount] = useState(story.likeCount);
  const [saved, setSaved] = useState(story.saved);
  const [saveCount, setSaveCount] = useState(story.saveCount);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const counted = useRef(false);

  /* One view, once, when the page is genuinely open. The database counts one
     person once a day regardless, so this only decides whether to make the
     call at all. */
  useEffect(() => {
    if (counted.current) return;
    counted.current = true;
    const timer = window.setTimeout(() => void recordStoryView({ storyId: story.id }), 900);
    return () => window.clearTimeout(timer);
  }, [story.id]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const who = story.author.label;

  const requireSignIn = () => {
    if (signedIn) return false;
    router.push("/sign-in");
    return true;
  };

  const mark = (kind: "LIKE" | "SAVE") => {
    if (requireSignIn()) return;
    const on = kind === "LIKE" ? !liked : !saved;
    if (kind === "LIKE") {
      setLiked(on);
      setLikeCount((n) => n + (on ? 1 : -1));
    } else {
      setSaved(on);
      setSaveCount((n) => n + (on ? 1 : -1));
    }
    startTransition(async () => {
      const result = await toggleStoryMark({ storyId: story.id, mark: kind });
      if (!result.ok) {
        if (kind === "LIKE") {
          setLiked(!on);
          setLikeCount((n) => n + (on ? -1 : 1));
        } else {
          setSaved(!on);
          setSaveCount((n) => n + (on ? -1 : 1));
        }
        setNotice(result.error);
        return;
      }
      router.refresh();
    });
  };

  const share = () => {
    const url = `${window.location.origin}/stories/${story.id}`;
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      void navigator.share({ title: story.headline, url }).catch(() => {
        /* Cancelling a share sheet is not a failure and gets no message. */
      });
      return;
    }
    void navigator.clipboard?.writeText(url);
    setNotice(POST_COPY.copied);
  };

  const onPerson = (action: "mute" | "block") => {
    setMenuOpen(false);
    if (requireSignIn()) return;
    const target = story.author.id;
    if (!target) {
      setNotice("There is nobody to do that to on this story.");
      return;
    }
    startTransition(async () => {
      const result =
        action === "block"
          ? await blockUser({ userId: target })
          : await muteTarget({ targetKind: "USER", targetId: target });
      if (!result.ok) {
        setNotice(result.error);
        return;
      }
      if (action === "block") {
        /* A block hides this author's work in both directions the instant it
           lands, so this page stops existing for the person who wrote the
           block. Leaving them here would answer the next refresh with a 404 and
           no explanation, so it leaves for a real destination itself. */
        router.replace("/around");
        return;
      }
      setNotice(POST_COPY.mutedDone);
      router.refresh();
    });
  };

  const takeDown = () => {
    setMenuOpen(false);
    if (!window.confirm("Take this story down? The comments under it stay.")) return;
    startTransition(async () => {
      const result = await removeStory({ storyId: story.id });
      if (!result.ok) {
        setNotice(result.error);
        return;
      }
      router.replace("/around");
    });
  };

  /* The sheet knows nothing about stories or posts. It is handed rows and two
     functions, so the same component serves both sources. */
  const commentRows: CommentRow[] = comments.map((comment) => ({
    id: comment.id,
    parentId: comment.parentId,
    body: comment.body,
    createdLabel: comment.createdLabel,
    authorId: comment.authorId,
    authorLabel: comment.authorLabel,
    authorHandle: comment.authorHandle,
    avatarUrl: comment.avatarUrl,
    likeCount: comment.likeCount,
    liked: comment.liked,
    isMine: comment.isMine,
    removed: comment.removed,
  }));

  return (
    <div className="nf-story">
      <article className="nf-story__stage">
        {story.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={story.imageUrl} alt="" className="nf-story__image" />
        ) : (
          <div className="nf-story__image nf-story__image--none" aria-hidden="true" />
        )}
        <div className="nf-story__wash" aria-hidden="true" />

        {/* --------------------------------------------- who is telling me */}
        <header className="nf-story__top">
          <BackChevron fallback="/around" />

          <Link
            href={story.author.handle ? `/u/${story.author.handle}` : "#"}
            className="nf-story__author"
            aria-label={`Open ${who}`}
          >
            <span className="nf-story__face">
              {story.author.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={story.author.avatarUrl} alt="" />
              ) : (
                <span aria-hidden="true">{who.charAt(0).toUpperCase()}</span>
              )}
            </span>
            <span className="min-w-0">
              <span className="nf-story__who">{who}</span>
              <span className="nf-story__when">
                {story.createdLabel}
                {story.edited ? " · edited" : ""}
              </span>
            </span>
          </Link>

          {story.author.handle && !story.isMine ? (
            <FollowButton
              handle={story.author.handle}
              initialFollowing={viewerFollows}
              signedIn={signedIn}
              compact
            />
          ) : null}

          <div className="relative">
            <button
              type="button"
              className="nf-social-round"
              aria-label="More actions for this story"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <PostGlyph name="more" size={20} />
            </button>
            {menuOpen ? (
              <>
                <button
                  type="button"
                  aria-label="Close menu"
                  className="fixed inset-0 z-20 cursor-default"
                  onClick={() => setMenuOpen(false)}
                />
                <div role="menu" aria-label="Story actions" className="nf-post__menu nf-story__menu">
                  <button
                    type="button"
                    role="menuitem"
                    className="nf-post__menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      share();
                    }}
                  >
                    Share this story
                  </button>
                  {story.isMine ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="nf-post__menu-item nf-post__menu-item--danger"
                      onClick={takeDown}
                    >
                      Take this story down
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        role="menuitem"
                        className="nf-post__menu-item"
                        onClick={() => onPerson("mute")}
                      >
                        Mute {who}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="nf-post__menu-item nf-post__menu-item--danger"
                        onClick={() => {
                          setMenuOpen(false);
                          if (requireSignIn()) return;
                          setReporting(true);
                        }}
                      >
                        Report this story
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="nf-post__menu-item nf-post__menu-item--danger"
                        onClick={() => onPerson("block")}
                      >
                        Block {who}
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </header>

        {/* -------------------------------------------------- what happened */}
        <div className="nf-story__foot">
          <div className="nf-story__card">
            <button
              type="button"
              onClick={share}
              aria-label="Share this story"
              className="nf-story__card-share"
            >
              <PostGlyph name="share" size={18} />
            </button>

            <span className="nf-story-chip">{STORY_COPY.chip}</span>
            <h1 className="nf-story__headline">{story.headline}</h1>
            {story.standfirst ? (
              <p className="nf-story__standfirst">{story.standfirst}</p>
            ) : null}
            {story.placeLabel ? (
              <p className="nf-story__place">
                <UiIcon name="location" size={14} />
                {story.placeLabel}
              </p>
            ) : null}
          </div>

          {story.heldReason ? (
            <p className="nf-story__held">{story.heldReason} Only you can see this until then.</p>
          ) : null}

          {/* ------------------------------------------ what I can do about it */}
          <div className="nf-story__actions">
            <button
              type="button"
              onClick={() => mark("LIKE")}
              aria-pressed={liked}
              className={`nf-story__act${liked ? " nf-story__act--on" : ""}`}
            >
              <span className="nf-story__act-circle">
                <PostGlyph name="like" size={22} active={liked} />
              </span>
              <span className="nf-story__act-count nf-numeric">{likeCount}</span>
              <span className="sr-only">{liked ? "liked, undo" : "likes, like this story"}</span>
            </button>

            <button
              type="button"
              onClick={() => mark("SAVE")}
              aria-pressed={saved}
              className={`nf-story__act${saved ? " nf-story__act--on" : ""}`}
            >
              <span className="nf-story__act-circle">
                <PostGlyph name="repost" size={22} active={saved} />
              </span>
              <span className="nf-story__act-count nf-numeric">{saveCount}</span>
              <span className="sr-only">{saved ? "saved, undo" : "saves, save this story"}</span>
            </button>

            <button type="button" onClick={share} className="nf-story__act">
              <span className="nf-story__act-circle">
                <PostGlyph name="share" size={22} />
              </span>
              <span className="nf-story__act-count">Share</span>
            </button>
          </div>

          {/* --------------------------------------------- who else cared */}
          {faces.length > 0 ? (
            <div className="nf-story__pile">
              <span className="nf-story__faces">
                {faces.map((face) => (
                  <Link
                    key={face.userId}
                    href={face.handle ? `/u/${face.handle}` : "#"}
                    className="nf-story__pileface"
                    aria-label={face.label}
                    title={face.label}
                  >
                    {face.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={face.avatarUrl} alt="" />
                    ) : (
                      <span aria-hidden="true">{face.label.charAt(0).toUpperCase()}</span>
                    )}
                  </Link>
                ))}
              </span>
              {overflow > 0 ? (
                <span className="nf-story__more nf-numeric">+{overflow}</span>
              ) : null}
              <span className="nf-story__pilelabel">liked this</span>
            </div>
          ) : null}

          {/* ------------------------------------------------- the way in */}
          <button
            type="button"
            onClick={() => setCommenting(true)}
            className="nf-story__commentbar"
          >
            <span>
              {story.commentCount > 0
                ? `${story.commentCount} ${story.commentCount === 1 ? "comment" : "comments"}`
                : STORY_COPY.addComment}
            </span>
            <span className="nf-story__send" aria-hidden="true">
              <PostGlyph name="share" size={17} />
            </span>
          </button>
        </div>
      </article>

      <StoryRail stories={more} currentId={story.id} />

      {notice ? (
        <p role="status" className="nf-social-toast">
          {notice}
        </p>
      ) : null}

      {commenting ? (
        <CommentsSheet
          comments={commentRows}
          signedIn={signedIn}
          onClose={() => setCommenting(false)}
          onSend={({ parentId, body }) =>
            commentOnStory({ storyId: story.id, parentId, body })
          }
          onLike={(commentId) => toggleStoryCommentLike({ commentId })}
        />
      ) : null}

      {reporting && story.author.id ? (
        <ReportSheet
          title={`Report ${who}`}
          subject={`The account behind this story, at @${story.author.handle ?? ""}.`}
          reasons={PROFILE_REPORT_REASONS}
          submit={({ reason, detail }) =>
            reportProfile({ userId: story.author.id as string, reason, detail })
          }
          onClose={() => setReporting(false)}
        />
      ) : null}
    </div>
  );
}
