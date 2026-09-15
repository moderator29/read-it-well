"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { type Locale, formatRating } from "@vallo/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { MapCopy, MapListing } from "./mapTypes";
import { Amount } from "@/components/ui/Amount";
import { MediaFrame } from "@/components/app/MediaFrame";
import { ExampleNotice } from "@/components/app/listing/ExampleNotice";

/**
 * The card that docks at the foot of the map when a pin is chosen.
 *
 * Positioning note, the hard won one: this is `absolute` inside the map frame,
 * never `fixed`. The map is mounted inside `.nf-card`, which carries a
 * `backdrop-filter`, and a `backdrop-filter` ancestor becomes the containing
 * block for `fixed` descendants, so a fixed dock would anchor to the card
 * rather than to the viewport and land in the wrong place at the wrong size.
 * Docking inside the frame is also the correct behaviour anyway: the card
 * belongs to the map, not to the page.
 *
 * It is dismissable three ways: the control, a downward swipe, and Escape
 * (handled by the map, which owns the selection).
 */

/** How far down the card must travel before the swipe counts as a dismissal. */
const DISMISS_AT = 56;
/** Movement below this is a tap on the card, not a drag of it. */
const DRAG_SLOP = 8;

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

  const where =
    listing.area && listing.area !== listing.city
      ? `${listing.area}, ${listing.city}`
      : listing.area || listing.city;
  const hasPrice = listing.priceMinor > 0;
  const per =
    listing.period === "guest"
      ? "guest"
      : listing.period === "year"
        ? copy.year
        : copy.night;

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
      className="pointer-events-auto px-row pb-row"
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
          boxShadow: "var(--nf-shadow-lifted)",
        }}
        className="nf-card relative touch-pan-y overflow-hidden p-0"
      >
        {/* Swipe handle. Decorative, the controls carry the real affordance. */}
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1.5 h-1 w-9 -translate-x-1/2 rounded-full bg-[var(--nf-border-strong)]"
        />

        <Link
          href={`/listing/${listing.id}`}
          onClick={(event) => {
            if (dragged.current) event.preventDefault();
          }}
          className="flex flex-wrap items-stretch gap-row p-inline pt-row"
        >
          {/*
            THE DISCLOSURE, ON THE ONE CARD THAT DOES NOT GO THROUGH
            `ListingCard`.

            This dock is a property card by every measure that matters: a
            photograph, a title, a place, a rating and a price, arrived at by
            tapping a pin. It is not built from `ListingCard`, so putting the
            example statement on that component alone would have left the map
            as the single surface where somebody meets an invented property
            with a real Lekki address and a real naira figure and is told
            nothing.

            Full width above the photograph and the price, for the same reason
            it sits above them in a grid card: it corrects a belief before the
            belief forms. `basis-full` because the row it lives in is a flex
            row built for the thumbnail and the text column beside it.
          */}
          {listing.isDemo && <ExampleNotice className="basis-full" />}
          <div className="relative h-[86px] w-[86px] shrink-0 overflow-hidden rounded-[var(--nf-radius-md)]">
            <MediaFrame hue={listing.hue} kind={listing.kind} />
            {listing.photo && (
              <Image
                src={listing.photo}
                alt=""
                fill
                sizes="86px"
                className="object-cover"
              />
            )}
          </div>

          {/* Clearance for the two absolute controls in the corner, derived rather
              than typed: two 44px targets, the gap between them, and the gap they
              sit in from the edge. It was pr-[4.5rem], measured against 32px
              buttons that are now 44. */}
          <div className="min-w-0 flex-1 pr-[calc(5.5rem+var(--nf-gap-inline-tight)+var(--nf-gap-inline))]">
            <h3 className="nf-body truncate font-semibold leading-snug text-[var(--nf-content-primary)]">
              {listing.title}
            </h3>
            <p className="nf-body-sm mt-inline-tight flex items-center gap-inline-tight text-[var(--nf-content-secondary)]">
              <UiIcon name="location" size={16} className="shrink-0 opacity-70" />
              <span className="truncate">{where}</span>
            </p>

            <div className="mt-inline flex flex-wrap items-center gap-x-inline gap-y-inline-tight">
              {listing.rating > 0 && (
                <span className="nf-numeric nf-body-sm flex items-center gap-inline-tight font-semibold text-[var(--nf-content-primary)]">
                  <UiIcon name="star" size={16} className="text-[var(--nf-rating)]" />
                  {formatRating(listing.rating, locale)}
                  <span className="font-normal text-[var(--nf-content-muted)]">
                    ({listing.reviewCount})
                  </span>
                </span>
              )}
              {listing.verified && (
                <span className="nf-badge nf-badge--verified">
                  <UiIcon name="verified" size={16} />
                  {copy.verified}
                </span>
              )}
            </div>

            <p className="mt-inline">
              {hasPrice ? (
                <Amount
                  minorUnits={listing.priceMinor}
                  locale={locale}
                  currency={listing.currency}
                  glance
                  suffix={`/ ${per}`}
                  className="text-[1.0625rem] font-bold leading-none tracking-tight text-[var(--nf-content-primary)]"
                  secondaryClassName="text-[0.65em] font-semibold opacity-60"
                />
              ) : (
                <span className="nf-body-sm font-semibold text-[var(--nf-content-secondary)]">
                  {listing.kindLabel}
                </span>
              )}
            </p>
          </div>
        </Link>

        {/* Controls sit outside the link so no anchor is ever nested in one. */}
        <div className="absolute right-2 top-2 flex items-center gap-inline-tight">
          <button
            type="button"
            onClick={onSave}
            disabled={saveBusy}
            aria-pressed={saved}
            aria-label={saved ? `Remove ${listing.title} from saved` : `Save ${listing.title}`}
            data-testid="map-dock-save"
            className="nf-icon-btn h-11 w-11"
          >
            <UiIcon
              name="heart"
              size={20}
              className={saved ? "text-[var(--nf-brand-primary)]" : undefined}
            />
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss this card"
            data-testid="map-dock-close"
            className="nf-icon-btn h-11 w-11"
          >
            <UiIcon name="chevron-down" size={20} />
          </button>
        </div>

        {saveMessage && (
          <p
            role="status"
            className="nf-body-sm border-t border-[var(--nf-border-subtle)] px-row py-inline text-[var(--nf-state-error)]"
          >
            {saveMessage}
          </p>
        )}
      </article>
    </div>
  );
}
