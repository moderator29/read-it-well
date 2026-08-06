"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { type Dictionary, type Locale, formatRating } from "@naijafinds/i18n";
import type { Listing } from "@/lib/listings/types";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { ButtonLink } from "@/components/ui/Button";
import { Amount } from "@/components/ui/Amount";
import { IntentTune } from "@/components/app/IntentTune";
import { isPropertyType, type PropertyType } from "@/lib/interests/schema";
import { isDataSaver } from "@/lib/ui/data-saver";

/**
 * Listing card media.
 *
 * The lead photo renders on top of a deterministic gradient scene. When the
 * photo cannot load (offline, CDN unreachable) the gradient and skyline
 * silhouette are already painted underneath, so the card degrades gracefully
 * instead of showing an empty tile.
 */
const HUES: [string, string][] = [
  ["#1E3A8A", "#172554"],
  ["#155E75", "#0F172A"],
  ["#0C4A6E", "#111827"],
  ["#334155", "#0F172A"],
  ["#1E40AF", "#1E1B4B"],
  ["#312E81", "#0F172A"],
];

const AMENITY_ICON: Record<string, UiIconName> = {
  pool: "pool",
  wifi: "wifi",
  kitchen: "kitchen",
  parking: "parking",
};

/**
 * Partner cards, per docs/HYBRID_INVENTORY.md section 4.
 *
 * Third-party stock never shows the verified badge and never opens in-platform
 * messaging, because there is no agent behind it and no inspection path. The
 * action always leaves the platform: a hotel is booked with the partner, a
 * restaurant links to directions and its own page and is never bookable here.
 * The links sit outside the card's own link so an anchor never nests inside one.
 */
function PartnerActions({ listing }: { listing: Listing }) {
  const partner = listing.partner;
  const book = listing.kind === "hotel" ? partner?.bookUrl : undefined;
  const directions = listing.kind === "restaurant" ? partner?.directionsUrl : undefined;
  const venue = listing.kind === "restaurant" ? partner?.venueUrl : undefined;
  const hasAction = Boolean(book ?? directions ?? venue);
  if (!hasAction && !partner?.attribution) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 pb-4">
      {book && (
        <ButtonLink href={book} target="_blank" rel="noopener noreferrer" variant="secondary" size="sm">
          Book
        </ButtonLink>
      )}
      {directions && (
        <ButtonLink href={directions} target="_blank" rel="noopener noreferrer" variant="secondary" size="sm">
          Directions
        </ButtonLink>
      )}
      {venue && (
        <ButtonLink href={venue} target="_blank" rel="noopener noreferrer" variant="secondary" size="sm">
          Menu
        </ButtonLink>
      )}
      {partner?.attribution === "Google" && (
        <span className="ml-auto text-[0.6875rem] text-[var(--nf-content-muted)]">
          Powered by Google
        </span>
      )}
    </div>
  );
}

export function ListingCard({
  listing,
  locale,
  t,
  index,
  intent,
}: {
  listing: Listing;
  locale: Locale;
  t: Dictionary;
  /** Position in a result grid: staggers the card's rise-in entrance. Omit
      for cards shown outside a freshly assembled list (rails, admin tables),
      where the entrance would be noise rather than a moment. */
  index?: number;
  /**
   * The signed-in caller's stored intent, which is also the permission to show
   * the per-card control that changes it.
   *
   * ONE PROP CARRYING BOTH, deliberately. `undefined` means there is nobody to
   * save to - signed out, or a platform with no keys - and the control is not
   * rendered at all rather than rendered and failing. An EMPTY ARRAY is a real
   * signed-in person who has stated nothing, which is a different thing and has
   * to stay different: the sheet opens saying this market is not ranked ahead,
   * which is true, and the tap that follows is their first answer.
   *
   * Two props (`canTune` plus `interests`) would let a call site pass one and
   * forget the other, and the failure mode of that is a control offered to
   * somebody who cannot use it.
   */
  intent?: PropertyType[];
}) {
  const router = useRouter();
  const [from, to] = HUES[listing.hue % HUES.length] ?? HUES[0]!;
  const photo = listing.photos[0];
  const href = `/listing/${listing.id}`;

  /*
   * The camera move. Both this card's photo box and the gallery's lead pane
   * carry the same `view-transition-name`, so a supporting browser morphs one
   * into the other instead of cutting between them. Feature detected, and a
   * plain click event (no modifier key, no new tab) is required before the
   * browser's own navigation is intercepted, so keyboard, middle-click and
   * command-click all keep working exactly as the anchor already promises.
   * Every other browser, and reduced motion, gets the ordinary Link.
   */
  /*
   * PREFETCH ON PRESS-DOWN.
   *
   * `/listing/[id]` is a dynamic route, so Next's default `prefetch` fetches
   * the loading boundary and nothing else: the page itself is still fetched
   * from scratch after the tap, and the guest waits through it. A thumb rests
   * on a card for something between 80 and 250ms before it lifts, and the
   * request started at press-down is already in flight by the time the
   * navigation begins. It costs one request that was about to be made anyway.
   *
   * `pointerdown` covers finger, mouse and pen in one event. Hover is kept as
   * well because a pointer settling on a card is an even earlier signal, and a
   * desktop visitor never produces a pointerdown until they have decided.
   *
   * WHY THE `prefetch` PROP AND NOT `router.prefetch(href)`. The obvious
   * version was written first and MEASURED AS DOING NOTHING AT ALL: pressing
   * and holding a card for 900ms with the network recorded produced zero
   * requests. `router.prefetch` defaults to an "auto" prefetch, which on a
   * dynamic route fetches as far as the nearest loading boundary and no
   * further, and this route has none, so there was nothing for it to fetch.
   * It would have shipped looking exactly like a working prefetch. Flipping
   * `prefetch` to `true` on a Link already in the viewport asks for the full
   * payload, which is the thing that actually saves the guest the wait.
   *
   * ONCE PER CARD, and never turned back off: a grid of twenty cards under a
   * scrolling thumb must not re-request on every pass.
   *
   * NOT ON A METERED CONNECTION. This is speculative traffic: it is exactly
   * what somebody switching on data saver is asking us to stop, and it is what
   * `isDataSaver()` was written for. Note the order, which matters: the
   * setting is consulted at press time rather than at render time, so somebody
   * who switches it on in another tab is respected on the very next press.
   */
  const prefetched = useRef(false);
  const [warmed, setWarmed] = useState(false);
  const warm = () => {
    if (prefetched.current) return;
    if (isDataSaver()) return;
    prefetched.current = true;
    setWarmed(true);
  };

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
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
    if (!("startViewTransition" in document)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    event.preventDefault();
    document.startViewTransition(() => {
      router.push(href);
    });
  };
  // Restaurants and experiences price per head; everything else is nightly.
  const perHead = listing.kind === "restaurant" || listing.kind === "experience";
  const isPartner = listing.source === "partner";
  // Partner feeds place a venue by city without an area below it. Printing
  // "Lagos, Lagos" would read as a bug, so a repeated locality collapses to one.
  const where =
    listing.area && listing.area !== listing.city
      ? `${listing.area}, ${listing.city}`
      : (listing.area || listing.city);
  // A price is shown only when there is a real one. Partner restaurants come
  // with a price level rather than an amount, and a guessed naira figure is
  // worse than none.
  const hasPrice = listing.priceMinor > 0;

  const cardStyle =
    index !== undefined
      ? ({ "--card-i": Math.min(index, 5) } as React.CSSProperties)
      : undefined;

  /*
   * Can this card's market be stated as an interest at all?
   *
   * `ListingKind` is `property_type` PLUS restaurant and experience, and the
   * column that stores the answer is a `property_type[]` that would refuse
   * either of them. A restaurant card therefore carries no control rather than
   * one that opens and then fails at the server, which is the same rule the
   * signed-out case follows for the same reason.
   */
  const tunableKind: PropertyType | null = isPropertyType(listing.kind) ? listing.kind : null;

  return (
    <article
      className={`nf-card nf-card--interactive group relative overflow-hidden ${index !== undefined ? "nf-card-in" : ""}`}
      style={cardStyle}
    >
      {/*
        OUTSIDE the card's own Link, and it has to be. An anchor may not contain
        a button: the browser's own activation behaviour for the anchor swallows
        it, and a screen reader announces one control where there are two. So it
        is an absolutely positioned sibling stacked over the media, which is
        also why the article gained `relative`.
      */}
      {intent !== undefined && tunableKind && (
        <div className="absolute right-3 top-3 z-10">
          <IntentTune type={tunableKind} t={t} interests={intent} />
        </div>
      )}
      <Link
        href={href}
        prefetch={warmed ? true : undefined}
        onClick={handleClick}
        onPointerDown={warm}
        onPointerEnter={warm}
        onFocus={warm}
        className="block"
      >
        <div
          className="relative aspect-[4/3] w-full overflow-hidden"
          style={{ viewTransitionName: `listing-photo-${listing.id}` }}
        >
          {/* Media layer scales gently on hover; badges and scrim stay put. */}
          <div
            className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.045] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            style={{ background: `linear-gradient(150deg, ${from} 0%, ${to} 100%)` }}
          >
            {/* Skyline silhouette, so the fallback still reads as a place. */}
            <svg
              viewBox="0 0 400 300"
              className="absolute inset-0 h-full w-full opacity-60"
              aria-hidden="true"
              preserveAspectRatio="none"
            >
              <path
                d="M0 300V190h34v-52h30v52h28v-84h44v84h26v-40h38v40h30v-66h40v66h34v-30h32v30h30v-46h34v46Z"
                fill="rgba(0,0,0,0.42)"
              />
              <circle cx="322" cy="62" r="26" fill="rgba(255,255,255,0.16)" />
            </svg>

            {photo && (
              <Image
                src={photo}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover"
              />
            )}
          </div>

          {/* Gradient scrim keeps the location line legible on every photo. */}
          <div
            className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/65 via-black/25 to-transparent"
            aria-hidden="true"
          />

          <div className="absolute left-3 top-3 flex gap-1.5">
            {/* Only first-party inventory may carry the verified badge. */}
            {listing.verified && listing.source !== "partner" && (
              <span className="nf-badge nf-badge--verified">
                <UiIcon name="verified" size={12} />
                {t.common.verified}
              </span>
            )}
            {/* Neutral, never a trust signal: it states where the stock is from. */}
            {isPartner && (
              <span
                data-partner-tag
                className="nf-badge bg-black/45 text-white/90 backdrop-blur-sm"
              >
                Partner
              </span>
            )}
            {listing.kind === "rental" && (
              <span className="nf-badge nf-badge--neutral">{t.nav.rent}</span>
            )}
            {listing.instantBook && <span className="nf-badge nf-badge--brand">Instant</span>}
          </div>

          <p className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5 text-[0.8125rem] font-medium text-white/90">
            <UiIcon name="location" size={12} className="shrink-0 text-white/70" />
            <span className="truncate">{where}</span>
          </p>
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-[0.9375rem] font-semibold leading-snug text-[var(--nf-content-primary)]">
              {listing.title}
            </h3>
            {/* A rating is shown when one exists. Never a 0.0 stand-in. */}
            {listing.rating > 0 && (
              <span className="nf-numeric flex shrink-0 items-center gap-1 text-[0.8125rem] font-semibold">
                <UiIcon name="star" size={16} className="text-[var(--nf-rating)]" />
                {formatRating(listing.rating, locale)}
                <span className="font-normal text-[var(--nf-content-muted)]">
                  ({listing.reviewCount})
                </span>
              </span>
            )}
          </div>

          <ul className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[0.75rem] text-[var(--nf-content-secondary)]">
            {listing.bedrooms > 0 && (
              <li className="flex items-center gap-1.5">
                <UiIcon name="bed" size={16} />
                <span className="nf-numeric">{listing.bedrooms}</span>
              </li>
            )}
            {listing.bathrooms > 0 && (
              <li className="flex items-center gap-1.5">
                <UiIcon name="bath" size={16} />
                <span className="nf-numeric">{listing.bathrooms}</span>
              </li>
            )}
            {listing.amenities.slice(0, 2).map((a) =>
              AMENITY_ICON[a] ? (
                <li key={a} className="flex items-center gap-1.5">
                  <UiIcon name={AMENITY_ICON[a]!} size={16} />
                </li>
              ) : null,
            )}
          </ul>

          {hasPrice && (
            <p className="mt-3.5">
              {/* The `Amount` primitive with the glance rule: a nightly stay
                  keeps its full figure, a yearly rent compacts to ₦4.5m, and
                  the "/ night" qualifier drops to the muted tone the way every
                  composed figure on the platform does. */}
              <Amount
                minorUnits={listing.priceMinor}
                locale={locale}
                currency={listing.currency}
                glance
                suffix={`/ ${
                  perHead
                    ? "guest"
                    : listing.pricePeriod === "year"
                      ? t.common.year
                      : t.common.night
                }`}
                className="text-[1.1875rem] font-bold leading-none tracking-tight text-[var(--nf-content-primary)]"
                secondaryClassName="text-[0.63em] font-semibold opacity-60"
              />
            </p>
          )}
        </div>
      </Link>
      {isPartner && <PartnerActions listing={listing} />}
    </article>
  );
}
