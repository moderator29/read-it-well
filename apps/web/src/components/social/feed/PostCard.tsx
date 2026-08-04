"use client";

import Link from "next/link";
import Image from "next/image";
import { PostGlyph } from "./PostGlyph";
import { PostBody } from "./PostBody";

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
  /** The listings the assistant cited, resolved through the same policy as any
      other listing on a card, so one taken down since simply is not here. */
  cited: PostListing[];
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

/**
 * The metric row.
 *
 * Like, comment, share, then the view count, then a bookmark pushed to the far
 * right. That order is the board's and it is also the order of intent: the two
 * you do to the writer, the one you do to somebody else, the fact about the
 * post, and the one you do for yourself.
 *
 * Views are a plain number and they are not a button. A count of how many
 * people saw something is a fact about it, not something anybody can do to it,
 * and rendering it as a control would promise an action that does not exist.
 *
 * Repost is not here. It is a real write with a real counter, and it lives in
 * the action sheet rather than in this row, because five controls plus a number
 * do not fit at 390px without every one of them becoming too small to hit.
 */
function ActionRow({
  post,
  onLike,
  onReply,
  onShare,
  onSave,
}: {
  post: PostView;
  onLike: () => void;
  onReply: () => void;
  onShare: () => void;
  onSave: () => void;
}) {
  return (
    <div className="nf-post__actions">
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
        onClick={onShare}
        aria-label="Share this post"
      >
        <PostGlyph name="share" />
      </button>

      <span
        className="nf-post__act nf-post__act--fact"
        title={`${post.viewCount.toLocaleString("en-NG")} views`}
      >
        <PostGlyph name="views" />
        <span className="nf-numeric">{compact(post.viewCount)}</span>
        <span className="sr-only">views</span>
      </span>

      <button
        type="button"
        className="nf-post__act ms-auto"
        aria-pressed={post.saved}
        onClick={onSave}
        aria-label={post.saved ? "Saved, remove it" : "Save this"}
      >
        <PostGlyph name="bookmark" active={post.saved} />
      </button>
    </div>
  );
}

export function PostCard({
  post,
  onLike,
  onRepost,
  onReply,
  onShare,
  onSave,
  onMenu,
  editor,
}: {
  post: PostView;
  onLike: () => void;
  onRepost: () => void;
  onReply: () => void;
  onShare: () => void;
  onSave: () => void;
  /** Opens the action sheet. The sheet itself belongs to the surface, so one
      sheet exists per screen rather than one per card. */
  onMenu: () => void;
  /** Rendered in place of the body while this post is being changed. */
  editor?: React.ReactNode;
}) {
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
          aria-haspopup="dialog"
          onClick={onMenu}
        >
          <PostGlyph name="more" />
        </button>
      </div>

      {post.kind === "ASK" || post.listing ? (
        <p className="nf-post__kind">{post.listing ? "Apartment" : "Question"}</p>
      ) : null}

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
          <PostBody
            text={post.body}
            className={
              isSystem
                ? "text-[0.86rem] leading-relaxed text-[var(--nf-content-secondary)]"
                : "min-w-0 text-[0.97rem] leading-[1.5] tracking-[-0.005em] text-[var(--nf-content-primary)]"
            }
          />
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

      {post.cited.length > 0 ? (
        <div className="nf-post__cited">
          {post.cited.map((item) => (
            <Link key={item.id} href={`/listing/${item.id}`}>
              <span className="nf-post__cited-title truncate-none">{item.title}</span>
              <span className="nf-post__cited-price nf-numeric">
                {item.priceLabel} <span className="font-medium">{item.periodLabel}</span>
              </span>
            </Link>
          ))}
        </div>
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
          onReply={onReply}
          onShare={onShare}
          onSave={onSave}
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
