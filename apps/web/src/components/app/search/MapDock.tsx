"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useRef, useState } from "react";
import { type Locale, countOf, formatNumber, formatRating } from "@vallo/i18n/core";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { MapCopy, MapListing } from "./mapTypes";
import { Amount } from "@/components/ui/Amount";
import { MediaFrame } from "@/components/app/MediaFrame";
import { useClientCopy } from "@/lib/i18n/client-copy";
import "./search-v2.css";

/**
 * The card that docks at the foot of the map when a pin is chosen.
 *
 * TO THE FOUNDER'S MAP REFERENCE (13 October 2026): the listing's photograph
 * across the top with the round open arrow on it, then the place and title on
 * the left with the figure and what it covers on the right, then the beds,
 * baths and floor area on one line. Every word is a field of this listing:
 * no fact is drawn that is zero or absent, and the rating and the Verified
 * mark are withheld on an example (`isDemo`), as on every card.
 *
 * Positioning note, the hard won one: this is `absolute` inside the map frame,
 * never `fixed`. The map is mounted inside `.nf-card`, which carries a
 * `backdrop-filter`, and a `backdrop-filter` ancestor becomes the containing
 * block for `fixed` descendants, so a fixed dock would anchor to the card
 * rather than to the viewport and land in the wrong place at the wrong size.
 *
 * It is dismissable three ways: the control, a downward swipe, and Escape
 * (handled by the map, which owns the selection).
 *
 * THE CARD AND ITS PIN ARE ONE THING (round 5 craft). The chosen pin lifts
 * and takes the brand ring; this card rises 12px into the frame from the edge
 * it docks to (240ms, `land`) and carries the same selected edge, so the eye
 * reads the pair as one object in two places. The map keys it by place, so
 * choosing another pin lands a new card. Reduced motion: no rise; the card
 * fades in over 160ms. See map.css.
 */

/** How far down the card must travel before the swipe counts as a dismissal. */
const DISMISS_AT = 56;
/** Movement below this is a tap on the card, not a drag of it. */
const DRAG_SLOP = 8;

/** What the figure covers, in the reader's words; nothing after a sale. */
export function dockSuffix(period: MapListing["period"], copy: MapCopy): string {
  switch (period) {
    case "sale":
      return "";
    case "year":
      return `/ ${copy.year}`;
    case "night":
      return `/ ${copy.night}`;
    case "month":
      return copy.month ?? "";
    case "quarter":
      return copy.quarter ?? "";
    case "guest":
      return copy.guest;
  }
}

export function MapDock({
  listing,
  locale,
  copy,
  saved,
  saveBusy,
  saveMessage,
  onSave,
  onDismiss,
}: {
  listing: MapListing;
  locale: Locale;
  copy: MapCopy;
  saved: boolean;
  saveBusy: boolean;
  saveMessage: string | null;
  onSave: () => void;
  onDismiss: () => void;
}) {
  const [drag, setDrag] = useState(0);
  const startY = useRef<number | null>(null);
  const dragged = useRef(false);
  /* The heart is named as `SaveButton` names it: "Save to favourites" in the
     reader's language, the state in `aria-pressed`, the title described. */
  const saveName = useClientCopy().a11y.favourite;
  const saveTitleId = useId();

  const where =
    listing.area && listing.area !== listing.city
      ? `${listing.area}, ${listing.city}`
      : listing.area || listing.city;
  const hasPrice = listing.priceMinor > 0;
  const suffix = dockSuffix(listing.period, copy);
  const facts: { key: string; icon: "bed" | "bath" | "grid"; label: string }[] = [];
  if (listing.bedrooms !== undefined && listing.bedrooms > 0) {
    facts.push({ key: "beds", icon: "bed", label: countOf(listing.bedrooms, "beds", locale) });
  }
  if (listing.bathrooms !== undefined && listing.bathrooms > 0) {
    facts.push({ key: "baths", icon: "bath", label: countOf(listing.bathrooms, "baths", locale) });
  }
  if (listing.sizeSqm !== undefined && listing.sizeSqm > 0) {
    facts.push({ key: "size", icon: "grid", label: `${formatNumber(listing.sizeSqm, locale)} ${copy.sqm ?? "m²"}` });
  }
  const href = `/listing/${listing.id}`;

  function pointerDown(event: React.PointerEvent<HTMLElement>) {
    // Only a real drag on the card body; the controls handle their own taps.
    if (event.pointerType === "mouse" && event.button !== 0) return;
    startY.current = event.clientY;
    dragged.current = false;
  }

  function pointerMove(event: React.PointerEvent<HTMLElement>) {
    if (startY.current === null) return;
    const delta = event.clientY - startY.current;
    if (delta > DRAG_SLOP) {
      dragged.current = true;
      setDrag(delta - DRAG_SLOP);
    } else if (dragged.current) {
      setDrag(0);
    }
  }

  function pointerUp() {
    const travelled = drag;
    startY.current = null;
    setDrag(0);
    if (travelled >= DISMISS_AT) onDismiss();
  }

  return (
    <div
      data-testid="map-dock"
      className="nf-map-dock pointer-events-auto px-row pb-row"
      role="group"
      aria-label={`Chosen place: ${listing.title}`}
    >
      <article
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
        style={{
          transform: drag ? `translate3d(0, ${drag}px, 0)` : undefined,
          transition: drag ? "none" : "transform var(--nf-duration-fast) var(--nf-ease-standard)",
          boxShadow: "var(--nf-elev-2)",
        }}
        className="nf-panel nf-panel--card nf-map-dock__card relative mx-auto max-w-md touch-pan-y overflow-hidden p-2xs"
      >
        <Link
          href={href}
          onClick={(event) => {
            if (dragged.current) event.preventDefault();
          }}
          className="block rounded-[var(--nf-container-radius)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--nf-focus-ring)]"
        >
          {/*
            D24 (the founder, 6 October): the example statement came off this
            card as it came off every other card. What stays is the half that
            mattered all along: an example listing carries no trust it did not
            earn, so the rating and the Verified mark below are withheld on
            one (`isDemo`), whatever its row says.
          */}
          <div className="nf-map-dock__photo">
            <MediaFrame hue={listing.hue} kind={listing.kind} drawn={listing.drawn} sizes="(max-width: 640px) 100vw, 28rem" />
            {listing.photo && (
              <Image src={listing.photo} alt="" fill sizes="(max-width: 640px) 100vw, 28rem" className="object-cover" />
            )}
            {/* The reference's open arrow. The whole card is the link, so
                the arrow is its mark rather than a second link to the same
                place for a screen reader to hear twice. */}
            <span
              aria-hidden="true"
              className="nf-photo-disc pointer-events-none absolute right-xs top-xs z-[2]"
            >
              <UiIcon name="arrow-up-right" size={20} />
            </span>
          </div>

          <div className="nf-map-dock__body">
            <div className="nf-map-dock__line">
              <div className="min-w-0">
                <h3 className="nf-body truncate font-semibold leading-snug text-[var(--nf-content-primary)]">
                  {listing.title}
                </h3>
                <p className="nf-caption mt-3xs flex items-center gap-inline-tight text-[var(--nf-content-muted)]">
                  <UiIcon name="location" size={12} className="shrink-0" />
                  <span className="truncate">{where}</span>
                </p>
              </div>
              <p className="shrink-0 text-right" data-testid="map-dock-price">
                {hasPrice ? (
                  <>
                    <Amount
                      minorUnits={listing.priceMinor}
                      locale={locale}
                      currency={listing.currency}
                      glance
                      className="block text-[length:var(--nf-text-body-lg)] font-bold leading-tight tracking-tight text-[var(--nf-content-primary)]"
                      secondaryClassName="text-[length:max(0.65em,0.75rem)] font-semibold opacity-60"
                    />
                    {suffix && (
                      <span className="nf-caption block text-[var(--nf-content-muted)]">{suffix}</span>
                    )}
                  </>
                ) : (
                  <span className="nf-body-sm font-semibold text-[var(--nf-content-secondary)]">
                    {listing.kindLabel}
                  </span>
                )}
              </p>
            </div>

            {(facts.length > 0 || (!listing.isDemo && listing.rating > 0 && listing.reviewCount > 0) || (listing.verified && !listing.isDemo)) && (
              <div className="flex flex-wrap items-center gap-x-md gap-y-2xs" data-testid="map-dock-facts">
                {facts.map((fact) => (
                  <span key={fact.key} className="nf-caption nf-numeric inline-flex items-center gap-2xs text-[var(--nf-content-secondary)]">
                    <UiIcon name={fact.icon} size={16} className="text-[var(--nf-brand-secondary)]" />
                    {fact.label}
                  </span>
                ))}
                {!listing.isDemo && listing.rating > 0 && listing.reviewCount > 0 && (
                  <span className="nf-numeric nf-caption inline-flex items-center gap-2xs font-semibold text-[var(--nf-content-primary)]">
                    <UiIcon name="star" size={16} className="text-[var(--nf-rating)]" />
                    {formatRating(listing.rating, locale)}
                    <span className="font-normal text-[var(--nf-content-muted)]">({listing.reviewCount})</span>
                  </span>
                )}
                {listing.verified && !listing.isDemo && (
                  <span className="nf-badge nf-badge--verified">
                    <UiIcon name="verified" size={12} />
                    {copy.verified}
                  </span>
                )}
              </div>
            )}
          </div>
        </Link>

        {/* Controls sit outside the link so no anchor is ever nested in one:
            close on the left of the photograph, the heart beside the arrow. */}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss this card"
          data-testid="map-dock-close"
          className="nf-photo-disc absolute left-[calc(var(--nf-space-2xs)+var(--nf-space-xs))] top-[calc(var(--nf-space-2xs)+var(--nf-space-xs))] z-[3]"
        >
          <UiIcon name="chevron-down" size={20} />
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saveBusy}
          aria-pressed={saved}
          aria-label={saveName}
          aria-describedby={saveTitleId}
          data-testid="map-dock-save"
          className="nf-photo-disc absolute right-[calc(var(--nf-space-2xs)+var(--nf-space-xs)+2.75rem+var(--nf-space-2xs))] top-[calc(var(--nf-space-2xs)+var(--nf-space-xs))] z-[3]"
        >
          <UiIcon
            name="heart"
            size={20}
            className={saved ? "text-[var(--nf-brand-primary)]" : undefined}
          />
          <span id={saveTitleId} hidden>
            {listing.title}
          </span>
        </button>

        {saveMessage && (
          <p
            role="status"
            className="nf-body-sm border-t border-[var(--nf-panel-hair)] px-row py-inline text-[var(--nf-state-error)]"
          >
            {saveMessage}
          </p>
        )}
      </article>
    </div>
  );
}
