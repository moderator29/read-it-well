"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PostGlyph } from "@/components/social/feed/PostGlyph";
import { ReportSheet } from "@/components/social/ReportSheet";
import { blockUser, muteTarget, reportPost } from "@/lib/social/posts-actions";
import { POST_COPY, POST_MAX, POST_REPORT_REASONS } from "@/lib/social/posts-schema";
import type { ActionResult } from "@/lib/actions/envelope";
import { PostBody } from "@/components/social/feed/PostBody";

/**
 * Comments, as a sheet.
 *
 * A sheet rather than a list under the post, because reading a story and
 * reading what people said about it are two different activities and putting
 * them on one scroll makes both worse. The sheet has a header that names it, an
 * add control on the left, a close on the right, the comments themselves, and a
 * composer pinned to the bottom where a thumb already is.
 *
 * **The connector is the one thread line in this product, and it is here on
 * purpose.** The owner cut the connecting line from the feed and it stays cut
 * there: it made the feed read as an information-design exercise. Inside this
 * sheet a nested reply at this density is genuinely unreadable without it, so
 * one very faint brand-tinted curve runs from a parent down into its child. It
 * is drawn inside the child's own row and stops at the avatar, so it can never
 * cross a card boundary or thread two unrelated comments together.
 *
 * **The sheet knows nothing about where its rows came from.** It is handed
 * rows, a way to send one and a way to like one, so the same component serves a
 * story's `story_comments` and a post's replies. Those are two different tables
 * with two different sets of policies, and a component that knew which was
 * which would be a third place for them to drift apart.
 */

type Draft = { parentId: string; label: string } | null;

/** One comment, from whichever table it came out of. */
export type CommentRow = {
  id: string;
  parentId: string | null;
  body: string | null;
  createdLabel: string;
  authorId: string | null;
  authorLabel: string;
  authorHandle: string | null;
  avatarUrl: string;
  likeCount: number;
  liked: boolean;
  isMine: boolean;
  removed: boolean;
};

export function CommentsSheet({
  comments,
  signedIn,
  onClose,
  onSend,
  onLike,
  onDelete,
}: {
  comments: CommentRow[];
  signedIn: boolean;
  onClose: () => void;
  /** Writes a comment, or a reply to one. */
  onSend: (input: {
    parentId: string | null;
    body: string;
  }) => Promise<ActionResult<{ held: boolean }>>;
  /** Toggles a like on one comment. */
  onLike: (commentId: string) => Promise<ActionResult<unknown>>;
  /** Removes your own comment. Absent when the source has no such path yet. */
  onDelete?: (commentId: string) => Promise<ActionResult<unknown>>;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(comments);
  const [draft, setDraft] = useState<Draft>(null);
  const [body, setBody] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [reporting, setReporting] = useState<CommentRow | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setRows(comments), [comments]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  /*
   * Which rows need a connector drawn into them.
   *
   * A comment gets one when its parent is also in this sheet, which is exactly
   * the case where indentation alone stops being enough to say who is answering
   * whom. A top-level comment never gets one, so the line can never appear to
   * come from the story itself.
   */
  const hasParent = useMemo(() => {
    const present = new Set(rows.map((row) => row.id));
    return new Set(
      rows.filter((row) => row.parentId && present.has(row.parentId)).map((row) => row.id),
    );
  }, [rows]);

  const patch = (id: string, next: Partial<CommentRow>) =>
    setRows((all) => all.map((row) => (row.id === id ? { ...row, ...next } : row)));

  const requireSignIn = () => {
    if (signedIn) return false;
    router.push("/sign-in");
    return true;
  };

  const like = (comment: CommentRow) => {
    if (requireSignIn()) return;
    const liked = !comment.liked;
    patch(comment.id, { liked, likeCount: comment.likeCount + (liked ? 1 : -1) });
    startTransition(async () => {
      const result = await onLike(comment.id);
      if (!result.ok) {
        patch(comment.id, { liked: comment.liked, likeCount: comment.likeCount });
        setNotice(result.error);
      }
    });
  };

  const send = () => {
    if (requireSignIn()) return;
    const text = body.trim();
    if (text.length === 0) return;
    startTransition(async () => {
      const result = await onSend({ parentId: draft?.parentId ?? null, body: text });
      if (!result.ok) {
        setNotice(result.error);
        return;
      }
      setBody("");
      setDraft(null);
      setNotice(result.data.held ? POST_COPY.held : null);
      router.refresh();
    });
  };

  const onMenu = (comment: CommentRow, action: "delete" | "mute" | "block" | "report") => {
    setMenuFor(null);
    if (action === "report") {
      if (requireSignIn()) return;
      setReporting(comment);
      return;
    }
    if (requireSignIn()) return;

    startTransition(async () => {
      if (action === "delete") {
        if (!onDelete) return;
        if (!window.confirm(POST_COPY.deleteConfirm)) return;
        const result = await onDelete(comment.id);
        if (!result.ok) {
          setNotice(result.error);
          return;
        }
        patch(comment.id, { body: null, removed: true });
        router.refresh();
        return;
      }
      const target = comment.authorId;
      if (!target) {
        setNotice("There is nobody to do that to on this comment.");
        return;
      }
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
    });
  };

  const left = POST_MAX - body.length;

  return (
    <div className="nf-comments" role="dialog" aria-modal="true" aria-label="Comments">
      <div className="nf-comments__panel">
        <header className="nf-comments__head">
          <button
            type="button"
            className="nf-post__act"
            aria-label="Write a comment"
            onClick={() => {
              setDraft(null);
              inputRef.current?.focus();
            }}
          >
            <PostGlyph name="compose" size={20} />
          </button>
          <h2 className="nf-comments__title">
            {rows.length > 0
              ? `${rows.length} ${rows.length === 1 ? "comment" : "comments"}`
              : "Comments"}
          </h2>
          <button type="button" className="nf-post__act" aria-label="Close" onClick={onClose}>
            <PostGlyph name="close" size={20} />
          </button>
        </header>

        {notice ? (
          <p role="status" className="nf-comments__notice">
            {notice}
          </p>
        ) : null}

        <div className="nf-comments__scroll">
          {rows.length === 0 ? (
            <p className="nf-comments__empty">
              Nothing said yet. What you write will be the first thing anybody
              arriving reads.
            </p>
          ) : null}

          <ul>
            {rows.map((comment) => (
              <li
                key={comment.id}
                className={`nf-comment${hasParent.has(comment.id) ? " nf-comment--nested" : ""}`}
                style={{ marginInlineStart: comment.parentId ? "22px" : undefined }}
              >
                {/* The one thread line in the product. Faint, brand tinted, and
                    it starts inside this row so it can never cross a boundary. */}
                {hasParent.has(comment.id) ? (
                  <span className="nf-comment__link" aria-hidden="true" />
                ) : null}

                <Link
                  href={comment.authorHandle ? `/u/${comment.authorHandle}` : "#"}
                  className="nf-comment__face"
                  aria-label={comment.authorLabel}
                >
                  {comment.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={comment.avatarUrl} alt="" />
                  ) : (
                    <span aria-hidden="true">{comment.authorLabel.charAt(0).toUpperCase()}</span>
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="nf-comment__head">
                    <span className="nf-comment__who">{comment.authorLabel}</span>
                    <span className="nf-comment__when">{comment.createdLabel}</span>
                    <div className="relative ms-auto">
                      <button
                        type="button"
                        className="nf-post__act"
                        aria-label={`More actions for this comment`}
                        aria-haspopup="menu"
                        aria-expanded={menuFor === comment.id}
                        onClick={() => setMenuFor(menuFor === comment.id ? null : comment.id)}
                      >
                        <PostGlyph name="more" size={17} />
                      </button>
                      {menuFor === comment.id ? (
                        <>
                          <button
                            type="button"
                            aria-label="Close menu"
                            className="fixed inset-0 z-20 cursor-default"
                            onClick={() => setMenuFor(null)}
                          />
                          <div role="menu" className="nf-post__menu nf-comment__menu">
                            {comment.isMine ? (
                              onDelete ? (
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="nf-post__menu-item nf-post__menu-item--danger"
                                  onClick={() => onMenu(comment, "delete")}
                                >
                                  Delete this comment
                                </button>
                              ) : null
                            ) : (
                              <>
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="nf-post__menu-item"
                                  onClick={() => onMenu(comment, "mute")}
                                >
                                  Mute {comment.authorLabel}
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="nf-post__menu-item nf-post__menu-item--danger"
                                  onClick={() => onMenu(comment, "report")}
                                >
                                  Report this comment
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="nf-post__menu-item nf-post__menu-item--danger"
                                  onClick={() => onMenu(comment, "block")}
                                >
                                  Block {comment.authorLabel}
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {/* A comment names people as often as a post does, so the
                      same body renderer serves both. A removed comment keeps
                      its tombstone sentence and is never parsed. */}
                  {comment.removed ? (
                    <p className="nf-comment__body nf-comment__body--gone">
                      {POST_COPY.removed}
                    </p>
                  ) : (
                    <PostBody text={comment.body ?? ""} className="nf-comment__body" />
                  )}

                  {comment.removed ? null : (
                    <div className="nf-comment__foot">
                      <button
                        type="button"
                        className="nf-comment__reply"
                        onClick={() => {
                          setDraft({ parentId: comment.id, label: comment.authorLabel });
                          inputRef.current?.focus();
                        }}
                      >
                        Reply
                      </button>
                      <button
                        type="button"
                        className="nf-comment__heart"
                        aria-pressed={comment.liked}
                        onClick={() => like(comment)}
                      >
                        <PostGlyph name="like" size={17} active={comment.liked} />
                        <span className="nf-numeric">{comment.likeCount}</span>
                        <span className="sr-only">
                          {comment.liked ? "liked, undo" : "likes, like this comment"}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <form
          className="nf-comments__composer"
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
        >
          {draft ? (
            <p className="nf-comments__replying">
              Replying to <strong>{draft.label}</strong>
              <button type="button" onClick={() => setDraft(null)}>
                Cancel
              </button>
            </p>
          ) : null}
          <div className="nf-comments__row">
            <textarea
              ref={inputRef}
              className="nf-field nf-comments__field"
              rows={1}
              value={body}
              maxLength={POST_MAX}
              placeholder={signedIn ? "Write a comment..." : "Sign in to comment"}
              aria-label="Write a comment"
              onChange={(event) => setBody(event.target.value)}
            />
            <button
              type="submit"
              className="nf-comments__send"
              disabled={pending || body.trim().length === 0}
              aria-label="Send"
            >
              <PostGlyph name="share" size={19} />
            </button>
          </div>
          {left < 240 ? (
            <span className="nf-comments__count nf-numeric">{left}</span>
          ) : null}
        </form>
      </div>

      {reporting ? (
        <ReportSheet
          title="Report this comment"
          subject={`Written by ${reporting.authorLabel}`}
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
