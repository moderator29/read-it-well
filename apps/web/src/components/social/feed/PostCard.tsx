"use client";

import { initial as initialOf } from "@/lib/text/initial";
import { DEFAULT_LOCALE, formatNumber, type Locale } from "@vallo/i18n/core";
import { useClientCopy } from "@/lib/i18n/client-copy";
import { useRef, useState } from "react";
import Link from "next/link";
import { motionQuiet } from "@/lib/motion/gate";
import { isPhotoMorphFor, startPhotoMorph } from "@/lib/motion/photo-morph";
import { AuthGate } from "@/components/auth/AuthGate";
import { PostBody } from "./PostBody";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ActionPill } from "./ActionPill";
import { PostPicture } from "./PostPicture";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { TierBadge } from "@/components/trust/TierBadge";
import { panelClass } from "@/components/ui/Panel";
import type { BadgeTier } from "@/lib/trust/badge-tier";
import { countOf } from "@vallo/i18n/core";

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
  const initial = initialOf(author?.displayLabel ?? author?.handle);
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
 * THE ACTION ROW, AS HIS REFERENCE DRAWS IT (PREMIUM-STANDARD.md reference 2,
 * D72: "small clean icons for likes, comment, retweet").
 *
 * Reply, repost, like and save, each a soft capsule of its own with a thin
 * 16px outline glyph and a tabular count, then share alone as a round disc at
 * the far end. The kebab stays in the head, where `GOVERNING-feed-plus-bloom`
 * puts it. The order is his reference's: the two you do to the writer's
 * words, the one that is a verdict, the one you keep for yourself, and the
 * one you send to somebody else.
 *
 * Save came back to the row. It had been moved into the kebab's sheet to keep
 * the row short; four capsules and a disc fit at 320px because only the counts
 * grow, and saving is the mark people look for under a post. Saves are
 * private, so the save disc carries no count.
 *
 * Views stay off the row: a count of how many saw something is a fact about
 * it, not something anybody can do to it.
 *
 * The haptic for a like is the handler's (`Feed`), where the optimistic write
 * is; the pop is `ActionPill`'s and plays only on the tap that turns it on.
 */
function ActionRow({
  post,
  locale,
  onLike,
  onReply,
  onRepost,
  onSave,
  onShare,
}: {
  post: PostView;
  locale: Locale;
  onLike: () => void;
  onReply: () => void;
  onRepost: () => void;
  onSave?: () => void;
  onShare: () => void;
}) {
  const likes = compact(post.likeCount, locale);
  const reposts = compact(post.repostCount, locale);
  return (
    <div className="nf-post__actions">
      {/*
        THE WRITE ACTIONS GATE, THE READ ONES DO NOT.

        Reply, repost, like and save all write a row against an account, so a
        guest tapping one is sent to sign up carrying the feed URL and the verb
        and comes back to this post. Share writes nothing and is left alone: a
        guest may share a post they are allowed to read. The controls stay at
        full strength rather than dimmed: a feed with its actions greyed out
        reads as broken; one whose actions invite you to join reads as a
        product.
      */}
      <AuthGate action="post">
        <ActionPill
          icon="chat-bubble"
          tone="reply"
          className="nf-post__act--reply"
          count={compact(post.replyCount, locale)}
          label={`${countOf(post.replyCount, "replies", locale)}, reply to this`}
          onClick={onReply}
        />
      </AuthGate>

      <AuthGate action="react">
        <ActionPill
          icon="repost"
          tone="repost"
          className="nf-post__act--repost"
          pressed={post.reposted}
          payoff
          count={reposts}
          label={post.reposted ? `Reposted, ${reposts}. Undo` : `Reposts ${reposts}, repost this`}
          onClick={onRepost}
        />
      </AuthGate>

      <AuthGate action="react">
        <ActionPill
          icon="heart"
          tone="like"
          className="nf-post__act--like"
          pressed={post.liked}
          payoff
          count={likes}
          label={post.liked ? `Liked, ${likes}. Undo` : `Likes ${likes}, like this`}
          onClick={onLike}
        />
      </AuthGate>

      {onSave ? (
        <AuthGate action="react">
          <ActionPill
            icon="bookmark"
            tone="save"
            round
            className="nf-post__act--save"
            pressed={post.saved}
            label={post.saved ? "Saved. Remove from saved" : "Save this post"}
            onClick={onSave}
          />
        </AuthGate>
      ) : null}

      <ActionPill
        icon="share"
        tone="share"
        round
        className="nf-post__act--share"
        label="Share this post"
        onClick={onShare}
      />
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
  /** The save disc in the action row. A surface that cannot save (a preview,
      a record) leaves it out and the row draws no disc. */
  onSave?: () => void;
  /** Opens the action sheet. The sheet itself belongs to the surface, so one
      sheet exists per screen rather than one per card. */
  onMenu: () => void;
  /** Rendered in place of the body while this post is being changed. */
  editor?: React.ReactNode;
}) {
  /* Read before the early return below: a hook runs on every render. */
  const aroundLine = useClientCopy().uiCommon.around;
  /*
   * THE PHOTOGRAPH TRAVELS (motion 18, photo open).
   *
   * Tapping a card names its picture block for the View Transitions API and
   * the thread's own card claims the same name when it mounts, so the browser
   * carries the picture from the feed into the thread instead of cutting. The
   * name is lent on the tap and given back (`ListingCard` is the precedent and
   * explains why a permanent name would abort every transition on a page that
   * shows one post twice). `arriving` is true only inside the 1.5s window
   * `startPhotoMorph` opens, so a hard load names nothing.
   */
  const mediaRef = useRef<HTMLDivElement>(null);
  /* The overlay link that opens the post. The picture hands its own tap to it
     (`openFromPicture`) so the picture can stay a real, pressable image. */
  const openRef = useRef<HTMLAnchorElement>(null);
  const openFromPicture = (event: React.MouseEvent<HTMLElement>) => {
    /* Anything inside the media that is itself a link or a button keeps its own
       tap. A plain picture opens the post, as the card always did. */
    if ((event.target as HTMLElement).closest("a, button")) return;
    const link = openRef.current;
    if (!link) return;
    /*
     * A cmd or ctrl click, or the middle button, means "in a new tab", as it
     * does on the link itself. Forwarding it with `link.click()` dropped the
     * modifier and opened the post in THIS tab (audit A7), so it is opened
     * where the person asked, from inside their own gesture. Shift and alt
     * (a new window, a download) are the browser's to answer and are left
     * alone rather than guessed at.
     */
    if (event.metaKey || event.ctrlKey || event.button === 1) {
      window.open(link.href, "_blank", "noopener");
      return;
    }
    if (event.shiftKey || event.altKey || event.button !== 0) return;
    link.click();
  };
  const [arriving] = useState(() => isPhotoMorphFor(`post-${post.id}`));
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
        <div
          ref={mediaRef}
          onClick={openFromPicture}
          onAuxClick={openFromPicture}
          className={`nf-post__media nf-post__media--${Math.min(post.media.length, 4)}`}
          style={arriving ? { viewTransitionName: `post-photo-${post.id}` } : undefined}
        >
          {post.media.slice(0, 4).map((picture, index) => (
            <PostPicture
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
            />
          ))}
        </div>
      ) : null}

      {post.areaName && post.areaSlug && !isSystem ? (
        /* THE PLACE, as a quiet line with its pin rather than a bordered
           chip: it says where the post was written and takes you there, and
           it is the smallest thing on the card. The 44px target is the
           row's own height. */
        <Link href={`/around/${post.areaSlug}`} className="nf-post__place">
          <UiIcon name="location" size={12} />
          <span className="truncate">{aroundLine.replace("{area}", post.areaName)}</span>
        </Link>
      ) : null}

      {post.cited.length > 0 ? (
        <div className="nf-post__cited">
          {post.cited.map((item) => (
            <Link key={item.id} href={`/listing/${item.id}`}>
              <span className="nf-post__cited-title truncate-none">{item.title}</span>
              <span className="nf-post__cited-price nf-numeric">
                {item.priceLabel} <span className="font-normal">{item.periodLabel}</span>
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

      {post.listing ? <ListingAttachment listing={post.listing} /> : null}

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
        onSave={onSave}
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
          ref={openRef}
          href={`/post/${post.id}`}
          className="nf-post__open"
          aria-label="Open post and replies"
          onClick={(event) => {
            if (
              event.defaultPrevented ||
              event.button !== 0 ||
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey
            ) {
              return;
            }
            const media = mediaRef.current;
            if (!media || motionQuiet()) return;
            media.style.viewTransitionName = `post-photo-${post.id}`;
            startPhotoMorph(`post-${post.id}`);
            window.setTimeout(() => {
              media.style.viewTransitionName = "";
            }, 1500);
          }}
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
 * SO IT IS A COMPACT ATTACHMENT, ONE TAP, NO SECOND PRIMARY. The plate used to
 * be a wide photograph, a title, a place, a large figure and a lit "See the
 * place" button: a second primary on a card whose primary is the post, and
 * the clutter A.5 names. It is now one row inside a quiet inset: a square
 * thumbnail (reserved, blur-up), the title and the place, the figure set
 * tabular on the right, and a chevron. The whole row is the link, so the way
 * in is the attachment itself, as on every product people already know.
 */
function ListingAttachment({ listing }: { listing: PostListing }) {
  return (
    <Link href={`/listing/${listing.id}`} className="nf-post__attach">
      <span className="nf-post__attach-thumb" aria-hidden="true">
        {listing.photoUrl ? (
          <PostPicture src={listing.photoUrl} alt="" width={160} height={160} sizes="64px" />
        ) : (
          <UiIcon name="home" size={20} />
        )}
      </span>
      <span className="nf-post__attach-text">
        <span className="nf-post__attach-title">{listing.title}</span>
        <span className="nf-post__attach-place">
          {listing.area}, {listing.city}
          {listing.verified ? <span className="nf-post__attach-verified"> &middot; Verified</span> : null}
        </span>
      </span>
      <span className="nf-post__attach-price nf-numeric">
        {listing.priceLabel}
        <span className="nf-post__attach-period">{listing.periodLabel}</span>
      </span>
      <UiIcon name="chevron-right" size={16} className="nf-post__attach-chevron" />
    </Link>
  );
}

/** What a screen reader hears before the card's contents. */
function describe(post: PostView): string {
  if (post.authorKind === "SYSTEM") return "Posted by Vallo";
  if (post.authorKind === "BOT") return "Answered by the Vallo assistant";
  const who = post.author?.displayLabel ?? post.author?.handle ?? "someone";
  return post.author?.isAgent ? `Posted by ${who}, an agent` : `Posted by ${who}`;
}
