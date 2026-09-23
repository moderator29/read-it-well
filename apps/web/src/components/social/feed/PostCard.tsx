"use client";

import { DEFAULT_LOCALE, formatNumber, getDictionary, type Locale } from "@vallo/i18n";
import Link from "next/link";
import Image from "next/image";
import { AuthGate } from "@/components/auth/AuthGate";
import { PostBody } from "./PostBody";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { LineGlyph } from "./LineGlyph";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { TierBadge } from "@/components/trust/TierBadge";
import { panelClass } from "@/components/ui/Panel";
import type { BadgeTier } from "@/lib/trust/badge-tier";

/**
 * A post.
 *
 * Four architectures, not one rectangle repeated. A question, a listing, a
 * machine answer and somebody's words are four different things, and a feed
 * where they all look identical is a feed you scroll past. The shapes are
 * defined in social-feed.css; this decides which one a post wears.
 *
 * The material underneath every one of them is the shared card, `Panel` in
 * its card variant: the console's lit glass (per-side lit edges, the catchlight
 * inside the top, the outer glow, the 10px container corner), the one container
 * anatomy on the platform since the wide sweep.
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
  /**
   * The published badge, `public.person_badge.tier`, read by the surface that
   * loaded the page (`lib/social/author-badges.ts`). Absent means nobody read
   * it, and absent draws no mark: the badge is never inferred on a card.
   */
  tier?: BadgeTier;
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
  return (
    /* The glass ring the render draws around every face: a thin luminous
       border box with the photo cut inside it, lit from the upper left like
       the rest of the material. */
    <span className="nf-post__avatar" aria-hidden="true">
      {author?.avatarPath ? (
        /*
         * A plain img, like every one of its siblings. `next/image` THROWS on
         * a host that is not in `remotePatterns`, and a throw here is a 500 on
         * the whole feed rather than a missing picture; Google alone serves
         * avatars from four shards.
         */
        /* 44px on screen. A twenty-post feed was fetching twenty full
           uploads for it. */
        <RemoteImage
          src={author.avatarPath}
          alt=""
          width={88}
          height={88}
          sizes="44px"
          loading="lazy"
        />
      ) : (
        <span className="nf-post__monogram">{initial}</span>
      )}
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
}: {
  post: PostView;
  locale: Locale;
  onLike: () => void;
  onReply: () => void;
  onRepost: () => void;
  onShare: () => void;
}) {
  return (
    <div className="nf-post__actions">
      {/*
        THE WRITE ACTIONS GATE, THE READ ONES DO NOT.

        Like, reply and repost all write a row against an account, so a guest
        tapping one is sent to sign up carrying the feed URL and the verb and
        comes back to this post. Share writes nothing and is left alone: a
        guest may share a post they are allowed to read.

        The controls stay at full strength rather than being hidden or dimmed.
        A feed with its actions greyed out reads as broken; a feed whose
        actions invite you to join reads as a product.

        Heart, repost, reply, then share on its own at the far end: the order
        the governing image draws. Save lives in the kebab's sheet, and the
        view count is a fact the sheet's surface does not need to carry.
      */}
      <AuthGate action="react">
        <button
          type="button"
          className="nf-post__act nf-post__act--like"
          aria-pressed={post.liked}
          onClick={onLike}
        >
          <UiIcon name="heart" size={20} filled={post.liked} />
          <span className="nf-numeric">{compact(post.likeCount, locale)}</span>
          <span className="sr-only">{post.liked ? "liked, undo" : "likes, like this"}</span>
        </button>
      </AuthGate>

      <AuthGate action="react">
        <button
          type="button"
          className="nf-post__act nf-post__act--repost"
          aria-pressed={post.reposted}
          onClick={onRepost}
          data-active={post.reposted ? "" : undefined}
        >
          <LineGlyph name="repost" size={20} />
          <span className="nf-numeric">{compact(post.repostCount, locale)}</span>
          <span className="sr-only">
            {post.reposted ? "reposted, undo" : "reposts, repost this"}
          </span>
        </button>
      </AuthGate>

      <AuthGate action="post">
        <button type="button" className="nf-post__act nf-post__act--reply" onClick={onReply}>
          <UiIcon name="chat-bubble" size={16} />
          <span className="nf-numeric">{compact(post.replyCount, locale)}</span>
          <span className="sr-only">
            {post.replyCount === 1 ? "reply" : "replies"}, reply to this
          </span>
        </button>
      </AuthGate>

      <button
        type="button"
        className="nf-post__act nf-post__act--share ms-auto"
        onClick={onShare}
        aria-label="Share this post"
      >
        <UiIcon name="share" size={20} />
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
  /** Accepted for the callers that wire it; saving lives in the kebab's sheet
      now, which is where the row's bookmark went. */
  onSave?: () => void;
  /** Opens the action sheet. The sheet itself belongs to the surface, so one
      sheet exists per screen rather than one per card. */
  onMenu: () => void;
  /** Rendered in place of the body while this post is being changed. */
  editor?: React.ReactNode;
}) {
  /*
   * A post that was taken down draws NOTHING here (founder, item 4: "a deleted
   * post is deleted"). Every listing read excludes removed rows at the query,
   * so a card should never be handed one; this is the second lock. The one
   * tombstone in the product is drawn by the thread view, inside a
   * conversation somebody replied into, and never by a card.
   */
  if (post.removed) return null;

  const isSystem = post.authorKind === "SYSTEM";
  const isBot = post.authorKind === "BOT";
  const hasPlate = Boolean(post.listing?.photoUrl);

  /* The shared card (`Panel`, variant card): the console's lit glass, the
     one container anatomy on the platform. The feed's own rules only tune
     it to the founder's feed image (social-feed.css, `.nf-panel.nf-post`). */
  const shell = panelClass({
    variant: "card",
    className: [
      "nf-post nf-post--pressable",
      isSystem ? "nf-post--system" : "",
      isBot ? "nf-post--ai" : "",
    ]
      .filter(Boolean)
      .join(" "),
  });

  const body = (
    <>
      {post.repostedBy ? (
        <p className="mb-xs flex items-center gap-xs text-[length:var(--nf-text-overline)] font-semibold text-[var(--nf-content-muted)]">
          <UiIcon name="repost" size={14} />
          Reposted by {post.repostedBy}
        </p>
      ) : null}

      {/*
        THE HEAD, AS THE RENDER DRAWS IT.

        The face in its glass ring, then the name with the verified mark beside
        it and the handle on the line under, then the time and the kebab at the
        far end. The mark is `TierBadge`, the one badge on the
        platform, drawn from `public.person_badge` and nothing else. It used to
        be a tick for `isAgent`, which is a role marker and not a check of
        anybody (`lib/trust/badge-tier.ts` forbids exactly that reading).
      */}
      <div className="nf-post__head">
        {isSystem || isBot ? (
          <span className="nf-post__avatar" aria-hidden="true">
            <span className="nf-post__monogram">V</span>
          </span>
        ) : (
          <Avatar author={post.author} />
        )}

        <div className="nf-post__who">
          {isSystem ? (
            <span className="nf-post__name">Vallo</span>
          ) : isBot ? (
            <>
              <span className="nf-post__name">Vallo AI</span>
              <span className="nf-post__handle">The assistant</span>
            </>
          ) : (
            <>
              <span className="nf-post__nameline">
                <Link
                  href={post.author?.handle ? `/u/${post.author.handle}` : "#"}
                  className="nf-post__name"
                >
                  {post.author?.displayLabel ?? `@${post.author?.handle ?? "someone"}`}
                </Link>
                {post.author?.tier && post.author.tier !== "none" ? (
                  /* 16 image px across in the render (9.4 CSS): the 12 step. */
                  <span className="nf-post__tick">
                    <TierBadge tier={post.author.tier} size={12} />
                  </span>
                ) : null}
                {post.author?.moderatorOf ? (
                  <span className="nf-post__role" aria-label={`Looks after ${post.author.moderatorOf}`}>
                    <span aria-hidden="true">Mod</span>
                  </span>
                ) : null}
              </span>
              {post.author?.handle ? (
                <span className="nf-post__handle">@{post.author.handle}</span>
              ) : null}
            </>
          )}
        </div>

        <span className="nf-post__when">
          {post.createdLabel}
          {post.edited ? " · edited" : ""}
        </span>

        {/* The header carries the name, the time and this. Nothing else: the
            bookmark that used to sit here lives in the sheet this opens. */}
        <button
          type="button"
          className="nf-post__act nf-post__kebab"
          aria-label="More actions"
          aria-haspopup="dialog"
          onClick={onMenu}
        >
          <UiIcon name="more" size={16} />
        </button>
      </div>

      {post.replyingTo ? (
        <p className="mt-xs text-[length:var(--nf-text-overline)] text-[var(--nf-content-muted)]">
          Replying to{" "}
          <span className="font-semibold text-[var(--nf-brand-secondary)]">
            {post.replyingTo}
          </span>
        </p>
      ) : null}

      {post.heldReason ? (
        <p className="nf-panel nf-panel--card mt-sm px-sm py-xs text-[length:var(--nf-text-overline)] leading-relaxed text-[var(--nf-content-secondary)]">
          {post.heldReason} Only you can see this until then.
        </p>
      ) : null}

      {editor ? (
        <div className="mt-sm">{editor}</div>
      ) : post.body ? (
        <PostBody
          text={post.body}
          className={
            isSystem
              ? "nf-post__body nf-post__body--system"
              : "nf-post__body"
          }
        />
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
            <RemoteImage
              key={picture.url}
              src={picture.url}
              alt={
                post.media.length > 1
                  ? `Picture ${index + 1} of ${post.media.length} on this post`
                  : "The picture on this post"
              }
              width={picture.width || 1200}
              height={picture.height || 900}
              /* One across, or two, or a quarter, depending on how many the
                 post carries. The grid class says which. */
              sizes={
                post.media.length === 1
                  ? "(max-width: 640px) 100vw, 640px"
                  : "(max-width: 640px) 50vw, 320px"
              }
              loading="lazy"
            />
          ))}
        </div>
      ) : null}

      {post.areaName && post.areaSlug && !isSystem ? (
        <Link
          href={`/around/${post.areaSlug}`}
          /*
           * THE SHAPE LAW, AND THIS ONE PASSED EVERY GREP FOR A YEAR.
           *
           * It was `h-6` on `--nf-radius-control`: 14px of radius on a 24px
           * box, a ratio of 0.583, which the browser draws as a capsule with a
           * 4px straight edge down each side. The token name is the correct
           * one and `check-css-tokens.mjs` rule 10 passed it, which is exactly
           * why DESIGN_DIRECTION.md:80 makes the test the RATIO and not the
           * name. 10 on 28 is 0.357, which matches `.nf-landing-float-badge`,
           * the same object on the landing page, which already reasoned its
           * way to this pair.
           */
          className="mt-sm inline-flex h-7 items-center rounded-[var(--nf-radius-sm)] border border-[var(--nf-border-subtle)] px-sm text-[length:var(--nf-text-overline)] font-semibold text-[var(--nf-content-muted)]"
        >
          {getDictionary(locale).uiCommon.around.replace("{area}", post.areaName)}
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
        <p className="mt-xs text-[length:var(--nf-text-overline)] leading-relaxed text-[var(--nf-content-muted)]">
          {post.sourceNote}
        </p>
      ) : null}

      {post.listing && hasPlate ? (
        <div className="nf-post__media nf-post__media--1">
          <Image
            src={post.listing.photoUrl as string}
            alt={post.listing.title}
            width={800}
            height={600}
            sizes="(max-width: 768px) 100vw, 640px"
          />
        </div>
      ) : null}

      {post.listing ? <ListingBlock listing={post.listing} /> : null}

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
      />
    </>
  );

  return (
    <article className={shell} aria-label={describe(post)}>
      {/*
        TAPPING THE POST OPENS THE POST.

        Until now the body was inert: the only ways into a thread were the
        reply count and the timestamp, so a reader who tapped the words, which
        is what everybody does, got nothing at all.

        This is an overlay link rather than a wrapper, and the reason is that a
        post already contains links: the author, the area, a listing, a
        mention. Nesting those inside an anchor is invalid HTML, and browsers
        resolve it by breaking the inner one, so wrapping the card would have
        traded one dead tap for four.

        So the whole card gets one absolutely positioned anchor sitting above
        the text and BELOW every control, which `.nf-post__open` and the
        z-index rule beside it in social-feed.css arrange. A tap on the words
        hits this; a tap on the like button, the author or the listing plate
        hits that.

        `editor` is the inline reply composer. While it is open this link is
        not rendered at all, because an overlay across a form is a text field
        that navigates away when you try to click into it.
      */}
      {editor ? null : (
        <Link
          href={`/post/${post.id}`}
          className="nf-post__open"
          aria-label="Open post and replies"
        />
      )}
      {body}
    </article>
  );
}

/**
 * THE FLAT ON A POST, AND WHY IT IS NOT F3's `ListingCard`.
 *
 * The rule is that a listing card on any surface comes from the one shared
 * component and is never forked. This is not that card and cannot be: it
 * takes `PostListing`, which is the eight-field projection
 * `lib/social/posts-queries.ts` returns for a listing attached to a post,
 * and `ListingCard` takes a whole `Listing` (photos, facts, market, price
 * model, save state). `lib/` is read-only from here, so adopting the shared
 * card needs that query widened first; it is filed as a finding rather than
 * worked around by copying the catalogue card's anatomy into this file.
 *
 * So this deliberately stays a PLATE and not a card: one line of title, one
 * of place, the figure and the way in. It carries the register's lit edge so
 * it belongs to the card it sits in, and it borrows none of the catalogue
 * card's composition, which is what forking it would mean.
 */
function ListingFacts({ listing }: { listing: PostListing }) {
  return (
    <div className="mt-sm border-t border-[var(--nf-brand-edge-soft)] pt-sm">
      <p className="text-[length:var(--nf-text-body-sm)] font-bold tracking-[-0.015em] text-[var(--nf-content-primary)]">
        {listing.title}
      </p>
      <p className="mt-3xs flex items-center gap-2xs text-[length:var(--nf-text-overline)] text-[var(--nf-brand-secondary)]">
        {listing.area}, {listing.city}
        {listing.verified ? (
          <span className="font-semibold text-[var(--nf-brand-secondary)]">&middot; Verified</span>
        ) : null}
      </p>
      <div className="mt-sm flex flex-wrap items-center justify-between gap-sm">
        <p className="nf-numeric text-[length:var(--nf-text-body-lg)] font-extrabold tracking-[-0.03em] text-[var(--nf-content-primary)]">
          {listing.priceLabel}{" "}
          <span className="text-[length:var(--nf-text-overline)] font-medium tracking-normal text-[var(--nf-brand-secondary)]">
            {listing.periodLabel}
          </span>
        </p>
        <Link
          href={`/listing/${listing.id}`}
          className="nf-btn nf-btn--primary inline-flex h-9 items-center px-md text-[length:var(--nf-text-caption)]"
        >
          See the place
        </Link>
      </div>
    </div>
  );
}

function ListingBlock({ listing }: { listing: PostListing }) {
  return (
    <div className="nf-post__plate mt-sm overflow-hidden">
      <div className="p-sm">
        <ListingFacts listing={listing} />
      </div>
    </div>
  );
}

/** What a screen reader hears before the card's contents. */
function describe(post: PostView): string {
  if (post.authorKind === "SYSTEM") return "Posted by Vallo";
  if (post.authorKind === "BOT") return "Answered by the Vallo assistant";
  const who = post.author?.displayLabel ?? post.author?.handle ?? "someone";
  return post.author?.isAgent ? `Posted by ${who}, an agent` : `Posted by ${who}`;
}
