import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { MediaFrame } from "@/components/app/MediaFrame";
import type { ListingKind } from "@/lib/listings/types";

/**
 * THE FACE OF A CARD IN THE STACK (the travel-app reference): a tall
 * photograph; a heart circle top left and an open arrow top right, both small
 * (the founder: "before clicking it's too big") on 44px targets; and at the
 * foot a smoked-glass inset with the name, where it is, the star rating and
 * the price, beside a small place tile.
 *
 * THE RATING IS DRAWN ONLY FROM REAL REVIEWS: the caller passes null when
 * there are none, and nothing is drawn. THE PLACE TILE IS A GLYPH, NOT A MAP:
 * an abstract street grid and a pin, with no map imagery, so it claims no
 * geography it does not have and needs no tile licence's credit at 56px. It
 * says "this is a place in {area}"; the real map is the listing's Map tab.
 */
export function StackCardFace({
  href,
  title,
  where,
  photo,
  kind,
  hue,
  index,
  rating,
  price,
  heart,
  openLabel,
  photoNote,
  eager = false,
}: {
  href: string;
  title: string;
  where: string;
  /** The place's own photograph, or a labelled stand-in; null draws the market's frame. */
  photo: string | null;
  kind: ListingKind;
  hue: number;
  index: number;
  /** Real reviews only. */
  rating: { average: string; count: string } | null;
  /** The price, already formatted, with its unit. */
  price: ReactNode;
  /** The save control, when the reader can save. */
  heart?: ReactNode;
  openLabel: string;
  /** "No photographs yet" when the picture is a stand-in, said on the picture. */
  photoNote?: string;
  eager?: boolean;
}) {
  return (
    <article className="nf-stackface" data-theme="dark" data-testid="stack-card">
      <div className="nf-stackface__media">
        <MediaFrame hue={hue} index={index} kind={kind} sizes="(max-width: 640px) 90vw, 420px" priority={eager && !photo} />
        {photo ? (
          <Image
            src={photo}
            alt=""
            fill
            sizes="(max-width: 640px) 90vw, 420px"
            className="object-cover"
            draggable={false}
            {...(eager ? ({ loading: "eager", fetchPriority: "high" } as const) : {})}
          />
        ) : null}
      </div>

      {photoNote ? <span className="nf-stackface__note">{photoNote}</span> : null}
      {heart ? <div className="nf-stackface__heart">{heart}</div> : null}
      <Link href={href} className="nf-stackface__open" aria-label={`${openLabel}: ${title}`} draggable={false}>
        <span className="nf-stackface__opendisc" aria-hidden="true">
          <UiIcon name="arrow-right" size={16} className="-rotate-45" />
        </span>
      </Link>

      <Link href={href} className="nf-stackface__inset" draggable={false}>
        <span className="min-w-0 flex-1">
          <span className="nf-stackface__title">{title}</span>
          {where ? (
            <span className="nf-stackface__where">
              <UiIcon name="location" size={12} className="shrink-0" />
              <span className="truncate">{where}</span>
            </span>
          ) : null}
          <span className="nf-stackface__meta">
            {rating ? (
              <span className="nf-stackface__rating nf-numeric">
                <UiIcon name="star" size={12} />
                {rating.average}
                <span className="nf-stackface__count">({rating.count})</span>
              </span>
            ) : null}
            <span className="nf-stackface__price nf-numeric">{price}</span>
          </span>
        </span>
        <PlaceTile />
      </Link>
    </article>
  );
}

/** The small place glyph: a street grid and a pin, drawn, not a map. */
function PlaceTile() {
  return (
    <span className="nf-stackface__place" aria-hidden="true">
      <svg viewBox="0 0 56 56" width="56" height="56">
        <path className="nf-stackface__street" d="M0 18 H56 M0 40 H56 M16 0 V56 M38 0 V56 M0 52 L52 0" />
        <path className="nf-stackface__route" d="M10 46 C 18 38, 22 34, 28 28" />
        <path
          className="nf-stackface__pin"
          d="M28 13 c-5 0 -8.5 3.6 -8.5 8.2 0 5.8 8.5 13.3 8.5 13.3 s8.5 -7.5 8.5 -13.3 C36.5 16.6 33 13 28 13 z"
        />
        <circle className="nf-stackface__pindot" cx="28" cy="21.5" r="3" />
      </svg>
    </span>
  );
}
