"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type MouseEvent, type ReactNode } from "react";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import "@/app/css/space-card.css";

/**
 * THE SPACE CARD: ONE CONTAINER SHAPE FOR EVERY LISTING THAT IS SHOWN (the
 * founder, 13 October 2026, from the reference he supplied).
 *
 *   OUTER CARD  one large soft rounded container (28px at 390px). No hard
 *               border and no glow ring: by day a white card on the page's
 *               tinted ground with a very soft shadow; at night a raised navy
 *               surface with a hairline.
 *   PHOTO       inset inside the card with an even gap, its own corners (the
 *               card's radius minus the gap). A small white status pill top
 *               left, a round white heart top right, the photo dots centred
 *               near the foot when there is more than one photograph.
 *   INFO PANEL  a SEPARATE rounded block inside the same card, under the
 *               photo with the same gap: the title on the left (one line,
 *               ellipsis), the price on the right with its period small under
 *               it, then one quiet line with a small icon (beds | baths |
 *               size) and, only when the caller has a REAL reason, a third
 *               line in the brand blue.
 *
 * VARIANTS
 *   card     full width, one per row; the page sets two or three across by
 *            width (`.nf-sc-grid`, below).
 *   compact  the same shape, smaller: a fixed width for a sideways row and for
 *            a map dock, the place and the dots left out.
 *
 * PRESENTATIONAL. It decides nothing about what is shown or why, owns no
 * listing type and reads no data: the caller maps a listing (or a remembered
 * glance) to these props. Money arrives as a node (the caller's `Money`, so
 * the figure is read short and heard whole), the heart as a node (the caller's
 * save control, which owns saving), and the words as strings from the
 * caller's dictionary. It imports no dictionary and no listing code, so it can
 * be used by the search results, the map dock and the listing page as the
 * home lists use it.
 *
 * HOW IT IS TAPPED. The whole card opens `href`: the title is the link (its
 * box stretches over the info panel) and each photograph is a link too, hidden
 * from assistive technology and out of the tab order, so a photo scrolls with
 * a finger and opens with a tap, and a screen reader meets one link per card.
 * The heart sits above the photograph and is never inside a link. `onOpen` is
 * called with the click and the photo's box so the caller can hand the card to
 * the listing's loading shell and start the photo morph.
 *
 * NO SPARKLE: the reason line takes any `UiIcon`; the founder retired the
 * four-point star (`sparkle-ban.test.ts`), so the caller names a real glyph.
 *
 * PROPS
 *   href            where the card goes
 *   title           one line, ellipsis
 *   place           "Bodija, Ibadan", with a location icon (hidden in compact)
 *   photos          the photograph URLs, first first; none draws `fallback`
 *   photoSizes      `next/image` sizes for the rendered width
 *   fallback        what to draw with no photograph (a plate and its words)
 *   status          the small pill on the photo ("To rent")
 *   heart           the save control, drawn top right
 *   price           `{ amount, unit?, from? }`; amount is a node
 *   facts           ["2 beds", "2 baths", "120 m²"]
 *   factsIcon       the small icon before the facts (default building)
 *   rating          an already formatted rating line, only for a real rating
 *   reason          the third line, brand blue, only for a real reason
 *   reasonIcon      the reason's icon (default a heart-house glyph)
 *   overlay         a node on the photo's bottom right (a small map tile)
 *   photoLabel      "Photo {at} of {count}", the gallery's accessible name
 *   mediaId         the id the photo morph names the photo by
 *   eager           the first card on a screen fetches its photograph at once
 *   variant         "card" | "compact"
 *   onOpen          (event, photoBox) => void
 *   className       extra classes on the article
 */
export type SpaceCardPrice = {
  amount: ReactNode;
  /** "Month", "to move in": small, under the amount. */
  unit?: string | null;
  /** "from", before the amount, when the figure is a floor. */
  from?: string | null;
};

export type SpaceCardProps = {
  href: string;
  title: string;
  place?: string | null;
  photos?: readonly string[];
  photoSizes?: string;
  fallback?: ReactNode;
  status?: string | null;
  heart?: ReactNode;
  price?: SpaceCardPrice | null;
  facts?: readonly string[];
  factsIcon?: UiIconName;
  rating?: string | null;
  reason?: string | null;
  reasonIcon?: UiIconName;
  overlay?: ReactNode;
  photoLabel?: string;
  mediaId?: string;
  eager?: boolean;
  variant?: "card" | "compact";
  onOpen?: (event: MouseEvent<HTMLAnchorElement>, photoBox: HTMLElement | null) => void;
  className?: string;
};

/** The most dots one card draws; more photographs than this still scroll. */
const MAX_DOTS = 5;

export function SpaceCard({
  href,
  title,
  place,
  photos = [],
  photoSizes,
  fallback,
  status,
  heart,
  price,
  facts = [],
  factsIcon = "building-apartment",
  rating,
  reason,
  reasonIcon = "house-heart",
  overlay,
  photoLabel,
  mediaId,
  eager = false,
  variant = "card",
  onOpen,
  className,
}: SpaceCardProps) {
  const media = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const compact = variant === "compact";
  const sizes = photoSizes ?? (compact ? "(max-width: 640px) 72vw, 18rem" : "(max-width: 640px) 94vw, 30rem");
  const open = (event: MouseEvent<HTMLAnchorElement>) => onOpen?.(event, media.current);
  const dots = Math.min(photos.length, MAX_DOTS);
  const several = photos.length > 1;

  return (
    <article className={["nf-sc", `nf-sc--${variant}`, className ?? ""].filter(Boolean).join(" ")}>
      <div ref={media} className="nf-sc__media nf-vt-morph" data-morph-id={mediaId}>
        {photos.length > 0 ? (
          <div
            className="nf-sc__gallery"
            role={several ? "group" : undefined}
            aria-label={several ? photoLabel?.replace("{at}", String(at + 1)).replace("{count}", String(photos.length)) : undefined}
            onScroll={
              several
                ? (event) => {
                    const el = event.currentTarget;
                    setAt(Math.max(0, Math.min(photos.length - 1, Math.round(el.scrollLeft / Math.max(1, el.clientWidth)))));
                  }
                : undefined
            }
          >
            {photos.map((src, index) => (
              <Link
                key={index}
                href={href}
                className="nf-sc__slide"
                aria-hidden="true"
                tabIndex={-1}
                draggable={false}
                onClick={open}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes={sizes}
                  className="object-cover"
                  draggable={false}
                  {...(eager && index === 0 ? ({ loading: "eager", fetchPriority: "high" } as const) : {})}
                />
              </Link>
            ))}
          </div>
        ) : (
          (fallback ?? null)
        )}
        {status ? <span className="nf-sc__status">{status}</span> : null}
        {overlay ? <div className="nf-sc__overlay">{overlay}</div> : null}
        {dots > 1 && !compact ? (
          <span className="nf-sc__dots" aria-hidden="true">
            {Array.from({ length: dots }, (_, i) => (
              <span key={i} className="nf-sc__dot" data-on={i === Math.min(at, dots - 1) || undefined} />
            ))}
          </span>
        ) : null}
      </div>

      {heart ? <div className="nf-sc__heart">{heart}</div> : null}

      <div className="nf-sc__info">
        <div className="nf-sc__head">
          <h3 className="nf-sc__title">
            <Link href={href} className="nf-sc__link" onClick={open} draggable={false}>
              {title}
            </Link>
          </h3>
          {price ? (
            <p className="nf-sc__price">
              <span className="nf-sc__amount nf-numeric">
                {price.from ? <span className="nf-sc__from">{price.from} </span> : null}
                {price.amount}
              </span>
              {price.unit ? <span className="nf-sc__unit">{price.unit}</span> : null}
            </p>
          ) : null}
        </div>
        {place && !compact ? (
          <p className="nf-sc__place">
            <UiIcon name="location" size={12} />
            <span>{place}</span>
          </p>
        ) : null}
        {facts.length > 0 || rating ? (
          <p className="nf-sc__facts nf-numeric">
            {facts.length > 0 ? <UiIcon name={factsIcon} size={14} /> : null}
            {facts.map((fact, index) => (
              <span key={index} className="nf-sc__fact">
                {fact}
              </span>
            ))}
            {rating ? (
              <span className="nf-sc__fact nf-sc__rating">
                <UiIcon name="star" size={12} filled />
                {rating}
              </span>
            ) : null}
          </p>
        ) : null}
        {reason ? (
          <p className="nf-sc__reason">
            <UiIcon name={reasonIcon} size={14} />
            <span>{reason}</span>
          </p>
        ) : null}
      </div>
    </article>
  );
}
