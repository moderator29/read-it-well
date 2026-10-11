"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { formatRating, type Locale } from "@vallo/i18n/core";
import type { Listing } from "@/lib/listings/types";
import { hrefForListing, marketFactsOf } from "@/lib/listings/href";
import { cardPrice } from "@/components/app/listing-card-model";
import { cardGlance } from "@/lib/listings/card-glance";
import { drawnSrcIn, handOff } from "@/lib/listings/handoff";
import { startPhotoMorph } from "@/lib/motion/photo-morph";
import { motionQuiet } from "@/lib/motion/gate";
import { MediaFrame } from "@/components/app/MediaFrame";
import { Money } from "@/components/ui/Money";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { SaveButton, useSaveControl } from "@/components/app/SaveControl";
import { AreaMapTile, MapCredits } from "@/components/app/maps/AreaMapTile";
import { areaPoint } from "@/components/app/search/mapGeo";
import "@/app/css/catalogue.css";
import "@/app/css/home.css";

/**
 * FEATURED LISTINGS AS A CARD STACK (the founder's travel-app set, 7 October:
 * "Popular with trailgoers"; MOTION_SYSTEM section 2b).
 *
 * One tall photograph at a time, the next and the previous peeking behind it
 * at both edges. On the photograph: a heart circle at the top left and an
 * open-arrow circle at the top right, both smoked glass; at its foot a frosted
 * inset with the name, the area, a star rating ONLY where the listing has real
 * reviews (no example ever has one), the key figure in the one money language
 * (the amount in ink, the unit grey), and a small still map of the AREA with
 * its pin (`AreaMapTile`; never the address).
 *
 * ONE FOCAL ACTION AT A TIME. A drag moves only the front card; let go past a
 * third of its width, or with a flick, and it is thrown the way it was going
 * while the next card rises into its place (the cards are keyed, so the one
 * behind simply takes the front's place on `land`). Short of that it settles
 * back. A tap opens the listing and the photograph becomes the page's hero
 * (the same morph the catalogue card starts). The arrows under the stack, the
 * keyboard's left and right, and a screen reader's buttons do the same as a
 * swipe. Reduced motion, Calm and Off change the card without the throw.
 *
 * Real rows only: the shelf home already chose, in its order.
 */
export type FeaturedStackCopy = {
  label: string;
  position: string;
  previous: string;
  next: string;
  open: string;
  moveIn: string;
  periodShort: Record<"month" | "quarter" | "year" | "night" | "guest", string>;
  reviews: string;
  mapOf: string;
  noPhotos: string;
  cardCopy: Parameters<typeof cardGlance>[2];
};

const THROW_FRACTION = 0.3;
const FLICK = 0.5; /* px per ms */

function Figure({ listing, locale, copy }: { listing: Listing; locale: Locale; copy: FeaturedStackCopy }) {
  const price = cardPrice(listing);
  if (price.lead === "none") return null;
  const unit =
    price.lead === "moveIn"
      ? copy.moveIn
      : price.period === "sale"
        ? null
        : copy.periodShort[price.period as keyof FeaturedStackCopy["periodShort"]];
  return (
    <p className="nf-fstack__figure nf-numeric">
      <Money minor={price.minor} locale={locale} currency={listing.currency} mode="glance" />
      {unit ? <span className="nf-fstack__unit"> {unit}</span> : null}
    </p>
  );
}

function StackCard({
  listing,
  locale,
  copy,
  role,
  at,
  count,
  eager,
  onOpen,
}: {
  listing: Listing;
  locale: Locale;
  copy: FeaturedStackCopy;
  role: "front" | "next" | "prev";
  at: number;
  count: number;
  eager: boolean;
  onOpen: (event: React.MouseEvent<HTMLAnchorElement>, media: HTMLElement | null) => void;
}) {
  const save = useSaveControl(listing.id);
  const media = useRef<HTMLDivElement>(null);
  const href = hrefForListing(listing.kind, listing.id, marketFactsOf(listing));
  const photo = listing.photos[0];
  const where = listing.area && listing.area !== listing.city ? `${listing.area}, ${listing.city}` : listing.area || listing.city;
  const point = areaPoint(listing.city, listing.area);
  const rated = !listing.isDemo && listing.reviewCount > 0 && listing.rating > 0;
  const front = role === "front";

  return (
    <article
      className="nf-fstack__card"
      data-role={role}
      aria-hidden={front ? undefined : true}
      inert={front ? undefined : true}
      aria-roledescription="slide"
      aria-label={copy.position.replace("{at}", String(at + 1)).replace("{count}", String(count))}
    >
      <div ref={media} className="nf-fstack__media nf-vt-morph" data-morph-id={listing.id} data-theme="dark">
        <MediaFrame hue={listing.hue} kind={listing.kind} sizes="(max-width: 640px) 90vw, 420px" priority={eager && !photo} />
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
        ) : (
          <span className="nf-fstack__nophoto">{copy.noPhotos}</span>
        )}
      </div>

      {/* The whole card opens the listing; the two controls sit outside it,
          because a link may not hold a button. */}
      <Link
        href={href}
        className="nf-fstack__open-area"
        aria-label={copy.open.replace("{title}", listing.title)}
        onClick={(event) => onOpen(event, media.current)}
        draggable={false}
        tabIndex={front ? 0 : -1}
      />

      <div className="nf-fstack__controls" data-theme="dark">
        <SaveButton
          saved={save.saved}
          pending={save.pending}
          onToggle={save.toggle}
          title={listing.title}
          surface="media"
          className="nf-fstack__circle"
        />
        <Link
          href={href}
          className="nf-fstack__circle nf-fstack__go"
          aria-label={copy.open.replace("{title}", listing.title)}
          onClick={(event) => onOpen(event, media.current)}
          tabIndex={front ? 0 : -1}
          draggable={false}
        >
          <UiIcon name="arrow-right" size={16} />
        </Link>
      </div>

      <div className="nf-fstack__inset" data-theme="dark">
        <div className="nf-fstack__words">
          <h3 className="nf-fstack__title">{listing.title}</h3>
          <p className="nf-fstack__where">
            <UiIcon name="location" size={12} />
            <span>{where}</span>
          </p>
          {rated ? (
            <p className="nf-fstack__rating nf-numeric">
              <UiIcon name="star" size={12} filled />
              {formatRating(listing.rating, locale)}
              <span className="nf-fstack__unit">
                {" "}
                ({listing.reviewCount} {copy.reviews})
              </span>
            </p>
          ) : null}
          <Figure listing={listing} locale={locale} copy={copy} />
        </div>
        {point ? (
          <AreaMapTile
            lat={point.lat}
            lng={point.lng}
            zoom={13}
            className="nf-fstack__map"
            label={copy.mapOf.replace("{area}", listing.area || listing.city)}
          />
        ) : null}
      </div>
    </article>
  );
}

export function FeaturedStack({
  listings,
  locale,
  copy,
  testId,
}: {
  listings: Listing[];
  locale: Locale;
  copy: FeaturedStackCopy;
  testId?: string;
}) {
  const count = listings.length;
  const [at, setAt] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; t: number; dx: number; id: number; moved: boolean; card: HTMLElement } | null>(null);
  const suppressClick = useRef(false);
  const throwing = useRef(false);

  const step = useCallback(
    (dir: 1 | -1) => setAt((value) => (value + dir + count) % count),
    [count],
  );

  /* Throw the front card the way it was going, then let the next one rise. */
  const throwCard = useCallback(
    (card: HTMLElement, dir: 1 | -1, from = 0) => {
      if (throwing.current) return;
      if (motionQuiet() || typeof card.animate !== "function") {
        card.style.transform = "";
        step(dir);
        return;
      }
      throwing.current = true;
      const width = card.getBoundingClientRect().width;
      const run = card.animate(
        [
          { transform: `translateX(${from}px) rotate(${(from / width) * 8}deg)`, opacity: 1 },
          { transform: `translateX(${-dir * width * 1.25}px) rotate(${-dir * 10}deg)`, opacity: 0 },
        ],
        { duration: 260, easing: "cubic-bezier(0.32, 0, 0.67, 0)", fill: "forwards" },
      );
      run.onfinish = () => {
        card.style.transform = "";
        step(dir);
        /* The keyed card is about to change role; drop the throw's frame. */
        requestAnimationFrame(() => {
          run.cancel();
          throwing.current = false;
        });
      };
    },
    [step],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0 || throwing.current) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, .nf-fstack__go")) return;
    const card = target.closest<HTMLElement>('.nf-fstack__card[data-role="front"]');
    if (!card) return;
    drag.current = { x: event.clientX, y: event.clientY, t: performance.now(), dx: 0, id: event.pointerId, moved: false, card };
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || event.pointerId !== d.id) return;
    const dx = event.clientX - d.x;
    const dy = event.clientY - d.y;
    if (!d.moved) {
      /* A vertical gesture is the page scrolling: let it go. */
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        drag.current = null;
        return;
      }
      if (Math.abs(dx) < 6) return;
      d.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    d.dx = dx;
    const width = d.card.getBoundingClientRect().width;
    d.card.style.transform = `translateX(${dx}px) rotate(${(dx / width) * 8}deg)`;
  };
  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || event.pointerId !== d.id || !d.moved) return;
    suppressClick.current = true;
    const width = d.card.getBoundingClientRect().width;
    const speed = Math.abs(d.dx) / Math.max(1, performance.now() - d.t);
    if (count > 1 && (Math.abs(d.dx) > width * THROW_FRACTION || speed > FLICK)) {
      throwCard(d.card, d.dx < 0 ? 1 : -1, d.dx);
    } else {
      /* Short of a throw: it settles back where it was, on `land`. */
      const card = d.card;
      card.style.transition = "transform 240ms var(--nf-ease-entrance)";
      card.style.transform = "";
      window.setTimeout(() => (card.style.transition = ""), 260);
    }
  };

  const onOpen = (event: React.MouseEvent<HTMLAnchorElement>, media: HTMLElement | null) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      event.preventDefault();
      return;
    }
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const listing = listings[at];
    if (!listing) return;
    /* The card becomes the page: the same hand-off and photo morph the
       catalogue card starts, so the gallery picks the photograph up. */
    handOff(cardGlance(listing, locale, copy.cardCopy), drawnSrcIn(media, listing.photos[0]));
    if (!media || motionQuiet()) return;
    startPhotoMorph(listing.id, media);
  };

  const go = (dir: 1 | -1) => {
    const card = stage.current?.querySelector<HTMLElement>('.nf-fstack__card[data-role="front"]');
    if (card) throwCard(card, dir);
    else step(dir);
  };
  if (count === 0) return null;
  const roles: { listing: Listing; role: "front" | "next" | "prev"; index: number }[] = [
    { listing: listings[at]!, role: "front", index: at },
  ];
  if (count > 1) roles.push({ listing: listings[(at + 1) % count]!, role: "next", index: (at + 1) % count });
  if (count > 2) roles.push({ listing: listings[(at - 1 + count) % count]!, role: "prev", index: (at - 1 + count) % count });

  return (
    <section
      className="nf-fstack"
      aria-roledescription="carousel"
      aria-label={copy.label}
      data-testid={testId}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          go(1);
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          go(-1);
        }
      }}
    >
      <div
        ref={stage}
        className="nf-fstack__stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          const d = drag.current;
          drag.current = null;
          if (d) d.card.style.transform = "";
        }}
      >
        {/* Drawn back to front: the previous, the next, then the front. */}
        {[...roles].reverse().map(({ listing, role, index }) => (
          <StackCard
            key={listing.id}
            listing={listing}
            locale={locale}
            copy={copy}
            role={role}
            at={index}
            count={count}
            eager={index === 0}
            onOpen={onOpen}
          />
        ))}
      </div>
      {count > 1 ? (
        <div className="nf-fstack__nav">
          <button type="button" className="nf-fstack__step" aria-label={copy.previous} onClick={() => go(-1)}>
            <UiIcon name="arrow-left" size={16} />
          </button>
          <p className="nf-fstack__count nf-numeric" aria-live="polite">
            {copy.position.replace("{at}", String(at + 1)).replace("{count}", String(count))}
          </p>
          <button type="button" className="nf-fstack__step" aria-label={copy.next} onClick={() => go(1)}>
            <UiIcon name="arrow-right" size={16} />
          </button>
        </div>
      ) : null}
      <p className="nf-fstack__credits">
        <MapCredits />
      </p>
    </section>
  );
}
