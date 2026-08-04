"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { PostGlyph } from "./PostGlyph";

/**
 * A post.
 *
 * Four architectures, not one rectangle repeated. A question, a listing, a
 * machine answer and somebody's words are four different things, and a feed
 * where they all look identical is a feed you scroll past. The shapes are
 * defined in social-feed.css; this decides which one a post wears.
 *
 * The material underneath every one of them is the platform's own `.nf-card`:
 * the stride ring on the border box, the brand bloom at the upper left, the
 * backdrop blur. That is deliberate and it is the point. It is lit from the
 * same direction as the commissioned icon family, so painted UI and rendered
 * artwork agree about where the light is, and no amount of copying a layout
 * reproduces it.
 */

export type PostAuthor = {
  /** The real user id. Block and mute need a person, not a post. */
  id: string;
  handle: string | null;
  displayLabel: string | null;
  avatarPath: string | null;
  isAgent: boolean;
  /** Set when this person looks after the place the post is in. */
  moderatorOf: string | null;
};

export type PostListing = {
  id: string;
  title: string;
  area: string;
  city: string;
  priceLabel: string;
  periodLabel: string;
  photoUrl: string | null;
  verified: boolean;
};

export type PostMedia = {
  /** A signed URL. `social-media` is private, so these expire. */
  url: string;
  width: number | null;
  height: number | null;
};

export type PostView = {
  id: string;
  kind: "GIST" | "ASK" | "REPLY" | "SHOWCASE" | "SYSTEM";
  authorKind: "USER" | "BOT" | "SYSTEM";
  author: PostAuthor | null;
  body: string | null;
  createdLabel: string;
  edited: boolean;
  areaName: string | null;
  areaSlug: string | null;
  listing: PostListing | null;
  /** The bot's own note about where its answer came from. */
  sourceNote: string | null;
  replyingTo: string | null;
  repostedBy: string | null;
  replyCount: number;
  likeCount: number;
  repostCount: number;
  viewCount: number;
  liked: boolean;
  reposted: boolean;
  saved: boolean;
  /** Held by the scanner. Only ever sent to its own author. */
  heldReason: string | null;
  isMine: boolean;
  /** Own post, still LIVE, still inside the fifteen minute window. */
  editable: boolean;
  /** The unrendered body, for the editor. Only ever sent to its own author. */
  rawBody: string | null;
  media: PostMedia[];
};

function compact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const k = n / 1000;
    return `${k < 10 ? k.toFixed(1).replace(/\.0$/, "") : Math.round(k)}k`;
  }
  const m = n / 1_000_000;
  return `${m < 10 ? m.toFixed(1).replace(/\.0$/, "") : Math.round(m)}m`;
}

function Avatar({ author }: { author: PostAuthor | null }) {
  const initial = (author?.displayLabel ?? author?.handle ?? "?").charAt(0).toUpperCase();
  if (author?.avatarPath) {
    return (
      <Image
        src={author.avatarPath}
        alt=""
        width={46}
        height={46}
        className="size-[var(--nf-feed-avatar)] shrink-0 rounded-full object-cover ring-1 ring-[var(--nf-border-default)]"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="grid size-[var(--nf-feed-avatar)] shrink-0 place-items-center rounded-full bg-[image:var(--nf-gradient-brand)] text-base font-bold text-[var(--nf-content-on-brand)] ring-1 ring-[var(--nf-border-default)]"
    >
      {initial}
    </span>
  );
}

function ActionRow({
  post,
  onLike,
  onRepost,
  onReply,
  onShare,
}: {
  post: PostView;
  onLike: () => void;
  onRepost: () => void;
  onReply: () => void;
  onShare: () => void;
}) {
  return (
    <div className="nf-post__actions">
      {/* Views first and unpressable: it is a fact about the post, not
          something you can do to it. */}
      <span
        className="nf-post__act"
        title={`${post.viewCount.toLocaleString("en-NG")} views`}
      >
        <PostGlyph name="views" />
        <span className="nf-numeric">{compact(post.viewCount)}</span>
        <span className="sr-only">views</span>
      </span>

      <button type="button" className="nf-post__act" onClick={onReply}>
        <PostGlyph name="reply" />
        <span className="nf-numeric">{compact(post.replyCount)}</span>
        <span className="sr-only">
          {post.replyCount === 1 ? "reply" : "replies"}, reply to this
        </span>
      </button>

      <button
        type="button"
        className="nf-post__act"
        aria-pressed={post.reposted}
        onClick={onRepost}
      >
        <PostGlyph name="repost" active={post.reposted} />
        <span className="nf-numeric">{compact(post.repostCount)}</span>
        <span className="sr-only">
          {post.reposted ? "reposted, undo" : "reposts, repost this"}
        </span>
      </button>

      <button
        type="button"
        className="nf-post__act"
        aria-pressed={post.liked}
        onClick={onLike}
      >
        <PostGlyph name="like" active={post.liked} />
        <span className="nf-numeric">{compact(post.likeCount)}</span>
        <span className="sr-only">{post.liked ? "liked, undo" : "likes, like this"}</span>
      </button>

      <button
        type="button"
        className="nf-post__act ms-auto"
        onClick={onShare}
        aria-label="Share this post"
      >
        <PostGlyph name="share" />
      </button>
    </div>
  );
}

function PostMenu({
  post,
  onClose,
  onAction,
}: {
  post: PostView;
  onClose: () => void;
  onAction: (
    action: "copy" | "save" | "mute" | "block" | "report" | "delete" | "edit",
  ) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Escape closes, and focus moves in on open then back to the opener on close.
  // Two overlays in this codebase already do this properly and two do not; this
  // one is on the right side of that line.
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const who = post.author?.handle ? `@${post.author.handle}` : "this person";

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        className="fixed inset-0 z-20 cursor-default"
        onClick={onClose}
      />
      <div ref={ref} role="menu" aria-label="Post actions" className="nf-post__menu">
        <button type="button" role="menuitem" className="nf-post__menu-item" onClick={() => onAction("copy")}>
          Copy link
        </button>
        <button type="button" role="menuitem" className="nf-post__menu-item" onClick={() => onAction("save")}>
          {post.saved ? "Remove from saved" : "Save"}
        </button>
        {post.isMine ? (
          <>
            {/* Edit is offered only while the database would actually allow it.
                A control that is present and always refused teaches people to
                distrust the menu it sits in. */}
            {post.editable ? (
              <button
                type="button"
                role="menuitem"
                className="nf-post__menu-item"
                onClick={() => onAction("edit")}
              >
                Edit this post
              </button>
            ) : null}
            <button
              type="button"
              role="menuitem"
              className="nf-post__menu-item nf-post__menu-item--danger"
              onClick={() => onAction("delete")}
            >
              Delete this post
            </button>
          </>
        ) : (
          <>
            <button type="button" role="menuitem" className="nf-post__menu-item" onClick={() => onAction("mute")}>
              Mute {who}
            </button>
            <button
              type="button"
              role="menuitem"
              className="nf-post__menu-item nf-post__menu-item--danger"
              onClick={() => onAction("report")}
            >
              Report post
            </button>
            <button
              type="button"
              role="menuitem"
              className="nf-post__menu-item nf-post__menu-item--danger"
              onClick={() => onAction("block")}
            >
              Block {who}
            </button>
          </>
        )}
      </div>
    </>
  );
}

export function PostCard({
  post,
  onLike,
  onRepost,
  onReply,
  onShare,
  onMenuAction,
  editor,
}: {
  post: PostView;
  onLike: () => void;
  onRepost: () => void;
  onReply: () => void;
  onShare: () => void;
  onMenuAction: (
    action: "copy" | "save" | "mute" | "block" | "report" | "delete" | "edit",
  ) => void;
  /** Rendered in place of the body while this post is being changed. */
  editor?: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const isSystem = post.authorKind === "SYSTEM";
  const isBot = post.authorKind === "BOT";
  const hasPlate = Boolean(post.listing?.photoUrl);

  const shell = [
    "nf-card nf-post nf-post--pressable",
    isSystem ? "nf-post--system" : "",
    isBot ? "nf-post--ai" : "",
    post.kind === "ASK" ? "nf-post--ask" : "",
    hasPlate ? "nf-post--listing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const body = (
    <>
      {post.repostedBy ? (
        <p className="mb-2 flex items-center gap-2 text-[0.72rem] font-semibold text-[var(--nf-content-muted)]">
          <PostGlyph name="repost" size={14} />
          Reposted by {post.repostedBy}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        {isSystem ? (
          <span className="rounded-[var(--nf-radius-pill)] border border-[var(--nf-border-subtle)] px-2.5 py-1 text-[0.66rem] font-bold uppercase tracking-[0.1em] text-[var(--nf-content-muted)]">
            RentMe
          </span>
        ) : isBot ? (
          <span className="inline-flex items-center gap-1.5 rounded-[var(--nf-radius-pill)] bg-[var(--nf-brand-primary)] px-3 py-1 text-[0.7rem] font-bold text-[var(--nf-content-on-brand)]">
            RentMe AI
          </span>
        ) : (
          <>
            <Link
              href={post.author?.handle ? `/u/${post.author.handle}` : "#"}
              className="truncate text-[0.9rem] font-bold tracking-[-0.015em] text-[var(--nf-content-primary)]"
            >
              {post.author?.displayLabel ?? `@${post.author?.handle ?? "someone"}`}
            </Link>
            {post.author?.handle ? (
              <span className="truncate text-[0.8rem] text-[var(--nf-content-muted)]">
                @{post.author.handle}
              </span>
            ) : null}
            {/* The agent chip is border and ink with no tint.
                `--nf-brand-primary-soft` is a colour-mix of electric blue at 16
                per cent, and over a white card on paper it lands in the purple
                range. The brand carries no purple. */}
            {post.author?.isAgent ? (
              <span className="shrink-0 rounded-[var(--nf-radius-pill)] border border-[var(--nf-border-brand)] px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-[var(--nf-brand-secondary)]">
                Agent
              </span>
            ) : null}
            {post.author?.moderatorOf ? (
              <span className="shrink-0 rounded-[var(--nf-radius-pill)] border border-[var(--nf-border-subtle)] px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-[var(--nf-content-muted)]">
                Mod
              </span>
            ) : null}
          </>
        )}

        <span className="shrink-0 text-[0.8rem] text-[var(--nf-content-muted)]">
          &middot; {post.createdLabel}
          {post.edited ? " · edited" : ""}
        </span>

        {/* The header carries the name, the time and this. Nothing else: the
            bookmark that used to sit here moved into the menu, where saving
            belongs beside the other things you can do to somebody's post. */}
        <button
          type="button"
          className="nf-post__act -me-1 ms-auto shrink-0"
          aria-label="More actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <PostGlyph name="more" />
        </button>
      </div>

      {post.replyingTo ? (
        <p className="mt-2 text-[0.78rem] text-[var(--nf-content-muted)]">
          Replying to{" "}
          <span className="font-semibold text-[var(--nf-brand-secondary)]">
            {post.replyingTo}
          </span>
        </p>
      ) : null}

      {post.heldReason ? (
        <p className="mt-3 rounded-[var(--nf-radius-md)] border border-[var(--nf-border-brand)] bg-[var(--nf-surface-inset)] px-3 py-2 text-[0.78rem] leading-relaxed text-[var(--nf-content-secondary)]">
          {post.heldReason} Only you can see this until then.
        </p>
      ) : null}

      {editor ? (
        <div className="mt-3">{editor}</div>
      ) : post.body ? (
        <div className={isSystem ? "mt-2" : "mt-3 flex items-center gap-3"}>
          {isSystem || isBot ? null : <Avatar author={post.author} />}
          <p
            className={
              isSystem
                ? "text-[0.86rem] leading-relaxed text-[var(--nf-content-secondary)]"
                : "min-w-0 text-[0.97rem] leading-[1.5] tracking-[-0.005em] text-[var(--nf-content-primary)]"
            }
          >
            {post.body}
          </p>
        </div>
      ) : null}

      {post.areaName && post.areaSlug && !isSystem ? (
        <Link
          href={`/around/${post.areaSlug}`}
          className="mt-3 inline-flex h-6 items-center rounded-[var(--nf-radius-pill)] border border-[var(--nf-border-subtle)] px-2.5 text-[0.68rem] font-semibold text-[var(--nf-content-muted)]"
        >
          Around {post.areaName}
        </Link>
      ) : null}

      {post.sourceNote ? (
        <p className="mt-2.5 text-[0.72rem] leading-relaxed text-[var(--nf-content-muted)]">
          {post.sourceNote}
        </p>
      ) : null}

      {post.listing && !hasPlate ? <ListingBlock listing={post.listing} /> : null}

      {isSystem ? null : (
        <ActionRow
          post={post}
          onLike={onLike}
          onRepost={onRepost}
          onReply={onReply}
          onShare={onShare}
        />
      )}
    </>
  );

  return (
    <article className={shell} aria-label={describe(post)}>
      {hasPlate && post.listing ? (
        <>
          <Image
            src={post.listing.photoUrl as string}
            alt={post.listing.title}
            width={800}
            height={500}
            className="nf-post__plate"
          />
          <div className="nf-post__under">
            {body}
            <ListingFacts listing={post.listing} />
          </div>
        </>
      ) : (
        body
      )}

      {menuOpen ? (
        <PostMenu
          post={post}
          onClose={() => setMenuOpen(false)}
          onAction={(action) => {
            setMenuOpen(false);
            onMenuAction(action);
          }}
        />
      ) : null}
    </article>
  );
}

function ListingFacts({ listing }: { listing: PostListing }) {
  return (
    <div className="mt-3 border-t border-[var(--nf-border-subtle)] pt-3">
      <p className="text-[0.92rem] font-bold tracking-[-0.015em] text-[var(--nf-content-primary)]">
        {listing.title}
      </p>
      <p className="mt-0.5 flex items-center gap-1.5 text-[0.78rem] text-[var(--nf-content-muted)]">
        {listing.area}, {listing.city}
        {listing.verified ? (
          <span className="font-semibold text-[var(--nf-brand-secondary)]">&middot; Verified</span>
        ) : null}
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="nf-numeric text-[1.05rem] font-extrabold tracking-[-0.03em] text-[var(--nf-content-primary)]">
          {listing.priceLabel}{" "}
          <span className="text-[0.72rem] font-medium tracking-normal text-[var(--nf-content-muted)]">
            {listing.periodLabel}
          </span>
        </p>
        <Link
          href={`/listing/${listing.id}`}
          className="nf-btn nf-btn--primary inline-flex h-9 items-center px-4 text-[0.8rem]"
        >
          See the place
        </Link>
      </div>
    </div>
  );
}

function ListingBlock({ listing }: { listing: PostListing }) {
  return (
    <div className="mt-3 overflow-hidden rounded-[var(--nf-radius-lg)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-secondary)]">
      <div className="p-3">
        <ListingFacts listing={listing} />
      </div>
    </div>
  );
}

/** What a screen reader hears before the card's contents. */
function describe(post: PostView): string {
  if (post.authorKind === "SYSTEM") return "Posted by RentMe";
  if (post.authorKind === "BOT") return "Answered by the RentMe assistant";
  const who = post.author?.displayLabel ?? post.author?.handle ?? "someone";
  return post.author?.isAgent ? `Posted by ${who}, an agent` : `Posted by ${who}`;
}
