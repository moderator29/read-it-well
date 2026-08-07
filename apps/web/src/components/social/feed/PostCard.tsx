"use client";

import { DEFAULT_LOCALE, formatNumber, type Locale } from "@naijafinds/i18n";
import Link from "next/link";
import Image from "next/image";
import { PostGlyph } from "./PostGlyph";
import { PostBody } from "./PostBody";
import { Tombstone } from "./Tombstone";

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
  /**
   * Taken down, by its author or by a moderator.
   *
   * The row survives because `posts.parent_id` cascades and deleting it would
   * delete the replies underneath. `body` is already null for one of these, but
   * a null body is not the same fact: a card read this as "no words" and drew
   * an empty rectangle with the pictures still on it. This is the fact itself,
   * so every surface that renders a card can say what happened instead.
   */
  removed: boolean;
  isMine: boolean;
  /** Own post, still LIVE, still inside the fifteen minute window. */
  editable: boolean;
  /** The unrendered body, for the editor. Only ever sent to its own author. */
  rawBody: string | null;
  media: PostMedia[];
};

/**
 * A count, in the reader's language.
 *
 * This was hand-rolled: `String(n)` under a thousand, then a suffix glued on
 * with `toFixed`. Three faults in nine lines. It hardcoded ASCII digits and a
 * full stop as the decimal separator, which is the exact fault the platform
 * already fixed for money and for ratings by routing them through `Intl`. It
 * skipped grouping entirely, so eight thousand views rendered as `8140` with
 * nothing to break the digits up. And it went compact at a THOUSAND, so a post
 * with 5,902 views said `5.9k` - a number nobody can compare against the post
 * under it, on a card where the whole point of the figure is comparison.
 *
 * Grouped up to a hundred thousand, compact above it, and the suffix lowered
 * the way `formatMoney` already lowers it, because that is how these are
 * written in Nigeria: 45k, never 45K.
 */
const COMPACT_FROM = 100_000;

function compact(n: number, locale: Locale): string {
  if (Math.abs(n) < COMPACT_FROM) return formatNumber(n, locale);
  return formatNumber(n, locale, { notation: "compact", maximumFractionDigits: 1 }).replace(
    /[A-Za-z]+$/,
    (suffix) => suffix.toLowerCase(),
  );
}

function Avatar({ author }: { author: PostAuthor | null }) {
  const initial = (author?.displayLabel ?? author?.handle ?? "?").charAt(0).toUpperCase();
  if (author?.avatarPath) {
    /*
     * A plain img, like every one of its seven siblings.
     *
     * This was `next/image`, and it was the only avatar on the platform that
     * was: ProfileHeader, PeopleList, StoryViewer twice, CommentsSheet, AppRail
     * and /u all draw the same avatar with a plain tag. Being the odd one out
     * mattered once a real photo arrived, because `next/image` THROWS on a host
     * that is not in `remotePatterns`, and a throw here is a 500 on the whole
     * feed rather than a missing picture. Google alone serves avatars from lh3
     * through lh6, so listing one shard would have left three that crash.
     *
     * There is nothing to optimise either: a 96px avatar from Google's CDN is
     * already the right bytes, and routing it through the optimiser adds a
     * round trip to serve the same image slightly later.
     */
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={author.avatarPath}
        alt=""
        width={46}
        height={46}
        loading="lazy"
        decoding="async"
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
 * Repost IS here now. The note that used to sit in its place said the row was
 * full at 390px and sent people to the action sheet for it - and the sheet had
 * no repost row either, so a real RLS-bound write sat unreachable behind an
 * `onRepost` prop nothing ever passed. Five controls and a number do fit,
 * because the counts are the only thing that grows and they are the thing a
 * reader most wants beside the control.
 */
function ActionRow({
  post,
  locale,
  onLike,
  onReply,
  onRepost,
  onShare,
  onSave,
}: {
  post: PostView;
  locale: Locale;
  onLike: () => void;
  onReply: () => void;
  onRepost: () => void;
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
        <span className="nf-numeric">{compact(post.likeCount, locale)}</span>
        <span className="sr-only">{post.liked ? "liked, undo" : "likes, like this"}</span>
      </button>

      <button type="button" className="nf-post__act" onClick={onReply}>
        <PostGlyph name="reply" />
        <span className="nf-numeric">{compact(post.replyCount, locale)}</span>
        <span className="sr-only">
          {post.replyCount === 1 ? "reply" : "replies"}, reply to this
        </span>
      </button>

      <button
        type="button"
        className="nf-post__act"
        aria-pressed={post.reposted}
        onClick={onRepost}
        data-active={post.reposted ? "" : undefined}
      >
        <PostGlyph name="repost" active={post.reposted} />
        <span className="nf-numeric">{compact(post.repostCount, locale)}</span>
        <span className="sr-only">
          {post.reposted ? "reposted, undo" : "reposts, repost this"}
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
        title={`${formatNumber(post.viewCount, locale)} views`}
      >
        <PostGlyph name="views" />
        <span className="nf-numeric">{compact(post.viewCount, locale)}</span>
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
  locale = DEFAULT_LOCALE,
  onLike,
  onReply,
  onRepost,
  onShare,
  onSave,
  onMenu,
  editor,
}: {
  post: PostView;
  /* Optional so a caller that has not been threaded yet still compiles and
     still renders correct English, rather than the whole platform having to
     change in one commit. */
  locale?: Locale;
  onLike: () => void;
  onReply: () => void;
  onRepost: () => void;
  onShare: () => void;
  onSave: () => void;
  /** Opens the action sheet. The sheet itself belongs to the surface, so one
      sheet exists per screen rather than one per card. */
  onMenu: () => void;
  /** Rendered in place of the body while this post is being changed. */
  editor?: React.ReactNode;
}) {
  /*
   * A post that was taken down is a tombstone and nothing else.
   *
   * Before this, only the body was dropped, and every other part of the card
   * carried on: the pictures, the listing plate with its price, the marks row
   * inviting a like on something that is gone. `posts_select` hands a person
   * their own removed rows back, so the surface this was worst on was the
   * author's own feed and their own profile.
   *
   * The early return is why this lives in the card rather than in each screen.
   * The thread page had its own copy of this and tested `body === null` for it,
   * which is a different question with a different answer.
   */
  if (post.removed) return <Tombstone replyCount={post.replyCount} />;

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

      {/*
        * The pictures.
        *
        * Signed URLs against a private bucket, which is why they are read and
        * signed for a whole page at once and why this is a plain `img`: a
        * signed URL carries a token and an expiry, and running it through the
        * image optimiser would cache somebody's private photograph behind a
        * URL that outlives the signature.
        *
        * One is a wide plate, two are a pair, three are a tall one beside two,
        * four are a square. Every layout is a fixed shape, so the card does not
        * jump when the pictures arrive.
        */}
      {post.media.length > 0 ? (
        <div className={`nf-post__media nf-post__media--${Math.min(post.media.length, 4)}`}>
          {post.media.slice(0, 4).map((picture, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={picture.url}
              src={picture.url}
              alt={
                post.media.length > 1
                  ? `Picture ${index + 1} of ${post.media.length} on this post`
                  : "The picture on this post"
              }
              loading="lazy"
              decoding="async"
            />
          ))}
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

      {/*
        The row is on every card, a platform post included.
        
        It used to be suppressed for `isSystem`, on the reasoning that an
        announcement is not a conversation. In practice the only posts that
        exist on a new deployment ARE announcements, so the feed opened on a
        column of text blocks with no like, no reply, no count and nothing to
        press - which reads as a broken feed rather than a restrained one.
        A platform post is still a post: it can be saved, replied to, and it
        has a view count somebody may want to see.
      */}
      <ActionRow
        post={post}
        locale={locale}
        onLike={onLike}
        onReply={onReply}
        onRepost={onRepost}
        onShare={onShare}
        onSave={onSave}
      />
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
