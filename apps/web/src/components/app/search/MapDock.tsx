"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { type Locale } from "@naijafinds/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { MapCopy, MapListing } from "./mapTypes";
import { Amount } from "@/components/ui/Amount";

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

/** Gradient tiles behind the photo, so an unreachable CDN still reads as a place. */
const HUES: [string, string][] = [
  ["#1E3A8A", "#172554"],
  ["#155E75", "#0F172A"],
  ["#0C4A6E", "#111827"],
  ["#334155", "#0F172A"],
  ["#1E40AF", "#1E1B4B"],
  ["#312E81", "#0F172A"],
];

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
  const [from, to] = HUES[listing.hue % HUES.length] ?? HUES[0]!;
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
      className="pointer-events-auto px-3 pb-3"
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
          className="flex items-stretch gap-3 p-2.5 pt-3.5"
        >
          <div className="relative h-[86px] w-[86px] shrink-0 overflow-hidden rounded-[var(--nf-radius-md)]">
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(150deg, ${from} 0%, ${to} 100%)` }}
            />
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
            </svg>
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

          <div className="min-w-0 flex-1 pr-[4.5rem]">
            <h3 className="truncate text-[0.9375rem] font-semibold leading-snug text-[var(--nf-content-primary)]">
              {listing.title}
            </h3>
            <p className="mt-1 flex items-center gap-1.5 text-[0.75rem] text-[var(--nf-content-secondary)]">
              <UiIcon name="location" size={12} className="shrink-0 opacity-70" />
              <span className="truncate">{where}</span>
            </p>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              {listing.rating > 0 && (
                <span className="nf-numeric flex items-center gap-1 text-[0.75rem] font-semibold text-[var(--nf-content-primary)]">
                  <UiIcon name="star" size={12} className="text-[var(--nf-rating)]" />
                  {listing.rating.toFixed(1)}
                  <span className="font-normal text-[var(--nf-content-muted)]">
                    ({listing.reviewCount})
                  </span>
                </span>
              )}
              {/* Only first party inventory may carry the verified badge. */}
              {listing.verified && !listing.partner && (
                <span className="nf-badge nf-badge--success">
                  <UiIcon name="verified" size={11} strokeWidth={2.1} />
                  {copy.verified}
                </span>
              )}
              {listing.partner && (
                <span className="nf-badge bg-[var(--nf-surface-raised)] text-[var(--nf-content-secondary)]">
                  Partner
                </span>
              )}
            </div>

            <p className="mt-1.5">
              {hasPrice ? (
                <Amount
                  minorUnits={listing.priceMinor}
                  locale={locale}
                  currency={listing.currency}
                  suffix={`/ ${per}`}
                  className="text-[1.0625rem] font-bold leading-none tracking-tight text-[var(--nf-content-primary)]"
                  secondaryClassName="text-[0.65em] font-semibold opacity-60"
                />
              ) : (
                <span className="text-[0.8125rem] font-semibold text-[var(--nf-content-secondary)]">
                  {listing.kindLabel}
                </span>
              )}
            </p>
          </div>
        </Link>

        {/* Controls sit outside the link so no anchor is ever nested in one. */}
        <div className="absolute right-2 top-2.5 flex items-center gap-1">
          <button
            type="button"
            onClick={onSave}
            disabled={saveBusy}
            aria-pressed={saved}
            aria-label={saved ? `Remove ${listing.title} from saved` : `Save ${listing.title}`}
            data-testid="map-dock-save"
            className="nf-icon-btn h-8 w-8"
          >
            <UiIcon
              name="heart"
              size={16}
              strokeWidth={saved ? 2.4 : 1.8}
              className={saved ? "text-[var(--nf-brand-primary)]" : undefined}
            />
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss this card"
            data-testid="map-dock-close"
            className="nf-icon-btn h-8 w-8"
          >
            <UiIcon name="chevron-down" size={16} strokeWidth={2.1} />
          </button>
        </div>

        {saveMessage && (
          <p
            role="status"
            className="border-t border-[var(--nf-border-subtle)] px-3 py-2 text-[0.75rem] text-[var(--nf-state-error)]"
          >
            {saveMessage}
          </p>
        )}
      </article>
    </div>
  );
}
