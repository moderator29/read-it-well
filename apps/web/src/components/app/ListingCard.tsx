"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { type Dictionary, type Locale } from "@naijafinds/i18n";
import type { Listing } from "@/lib/listings/types";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Amount } from "@/components/ui/Amount";
import { IntentTune } from "@/components/app/IntentTune";
import { MediaFrame } from "@/components/app/MediaFrame";
import { isPropertyType, type PropertyType } from "@/lib/interests/schema";
import { isDataSaver } from "@/lib/ui/data-saver";
import { ExampleNotice } from "@/components/app/listing/ExampleNotice";
import { cardFacts, cardUtility } from "./listing-card-model";

/**
 * The property card.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS CARD USED TO CARRY, ALL AT ONCE.
 *
 * Four badges (verified, the market noun, "Instant", and whatever the amenity
 * loop produced), a floating intent control over the photograph, a rating chip
 * competing with the title for the top line, two amenity glyphs with no labels,
 * and the price. Eleven separate pieces of information on a 4:3 tile in a
 * scrolling grid, none of them ranked, three of them fighting for the same top
 * corner.
 *
 * A card in a list has one job: help somebody decide whether to open it. Every
 * element that does not serve that decision is taking attention from one that
 * does.
 *
 * THE HIERARCHY, and it is strict:
 *
 *   PRIMARY    the photograph, the price, and where it is.
 *              These three are what a person compares between cards. They are
 *              the only things drawn at full contrast.
 *
 *   SECONDARY  beds, baths, size, property type, availability. One quiet row,
 *              muted, small, in a fixed order so the eye reads down a column
 *              of cards rather than re-parsing each one.
 *
 *   TRUST      at most ONE mark, and only when it is genuinely earned.
 *
 * BADGES ARE CAPPED AT ONE, structurally. There is exactly one place a badge
 * can be rendered in this file and it is behind `listing.verified`. "Instant"
 * moved to the detail page, where the reservation panel it describes actually
 * lives; the market noun moved into the secondary row where it belongs beside
 * the other facts; the amenity glyphs went entirely, because an unlabelled
 * wifi mark at 16px in a grid tells nobody anything they would act on.
 *
 * ---------------------------------------------------------------------------
 * THE NIGERIAN FIELDS, AND WHY ONE OF THEM IS ON THE CARD.
 *
 * The schema carries five things no competing platform has: the grid band, the
 * backup arrangement, the water source, whether the meter is prepaid, and
 * whether the estate has controlled access. For a year-long tenancy the first
 * two matter more than anything else on this card - more than the bathroom
 * count, arguably more than the price, because a flat at ₦4m with no light is
 * not cheaper than one at ₦4.5m with Band A, it is unlivable.
 *
 * So POWER earns a line, and only power. `cardUtility` composes the band and
 * the backup into one short phrase ("Band A, generator") because they are one
 * question with two halves and two chips would read as two facts. Water,
 * prepaid metering and estate access stay on the detail page: they are things
 * somebody checks once they are interested, not things they scan a grid for.
 *
 * A listing whose host has not answered shows NOTHING here. Silence is not good
 * news and must never be rendered as though it were; the detail page says
 * plainly that the question is unanswered, which is a sentence a card has no
 * room for.
 *
 * ---------------------------------------------------------------------------
 * MONEY NEVER TRUNCATES.
 *
 * A clipped price is worse than no price: "₦4,500,00" is a real number and it
 * is wrong by a factor of ten. Three things guarantee it here. The price owns
 * its own row with no sibling to compete for width. It carries `whitespace-
 * nowrap`, so it can never wrap mid-figure. And `glance` abbreviates
 * deliberately at a threshold owned by `@naijafinds/i18n`, so a yearly rent
 * reads ₦4.5m by choice while a nightly rate keeps its full ₦95,000.
 *
 * BOTH THEMES, ONE STRUCTURE. Nothing here is drawn differently in light and
 * dark. Every colour is a semantic token, and the only surface that is
 * deliberately theme-independent is the scrim over the photograph, because what
 * is underneath it is a photograph at noon as much as at midnight.
 */

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
   * to stay different.
   */
  intent?: PropertyType[];
}) {
  const router = useRouter();
  const photo = listing.photos[0];
  const href = `/listing/${listing.id}`;

  /*
   * PREFETCH ON PRESS-DOWN. `/listing/[id]` is a dynamic route, so Next's
   * default prefetch fetches the loading boundary and nothing else. A thumb
   * rests on a card for 80 to 250ms before it lifts, and the request started at
   * press-down is already in flight by the time the navigation begins.
   *
   * `prefetch` the PROP rather than `router.prefetch(href)`: the obvious version
   * was measured as doing nothing at all, because `router.prefetch` defaults to
   * an "auto" prefetch which on a dynamic route stops at the nearest loading
   * boundary. Once per card, and never on a metered connection - this is
   * speculative traffic and data saver is somebody asking us to stop.
   */
  const prefetched = useRef(false);
  const [warmed, setWarmed] = useState(false);
  const warm = () => {
    if (prefetched.current) return;
    if (isDataSaver()) return;
    prefetched.current = true;
    setWarmed(true);
  };

  /*
   * The camera move. This card's photo box and the gallery's lead pane share a
   * `view-transition-name`, so a supporting browser morphs one into the other.
   * Feature detected, and a plain click (no modifier, no new tab) is required
   * before the browser's own navigation is intercepted, so keyboard,
   * middle-click and command-click keep working exactly as the anchor promises.
   */
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

  // A listing may state the same locality twice, e.g. a venue placed by city
  // with no area under it. "Lagos, Lagos" reads as a bug, so it collapses.
  const where =
    listing.area && listing.area !== listing.city
      ? `${listing.area}, ${listing.city}`
      : (listing.area || listing.city);

  // A price is shown only when there is a real one. A guessed naira figure is
  // worse than none.
  const hasPrice = listing.priceMinor > 0;
  const perHead = listing.kind === "restaurant" || listing.kind === "experience";
  const period = perHead
    ? t.common.guest
    : listing.pricePeriod === "year"
      ? t.common.year
      : t.common.night;

  const facts = cardFacts(listing, t);
  const power = cardUtility(listing);

  const cardStyle =
    index !== undefined
      ? ({ "--card-i": Math.min(index, 5) } as React.CSSProperties)
      : undefined;

  /*
   * Can this card's market be stated as an interest at all? `ListingKind` is
   * `property_type` PLUS restaurant and experience, and the column that stores
   * the answer is a `property_type[]` that would refuse either. A restaurant
   * card carries no control rather than one that opens and then fails.
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
        it, and a screen reader announces one control where there are two.
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
        {/* ------------------------------------------------------- PRIMARY 1
            The photograph. */}
        <div
          className="relative aspect-[4/3] w-full overflow-hidden"
          style={{ viewTransitionName: `listing-photo-${listing.id}` }}
        >
          <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.045] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
            <MediaFrame hue={listing.hue} index={index ?? 0} />
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

          {/* The shared media scrim, so the location line is legible on every
              photograph. Theme independent on purpose: what is underneath is a
              photograph in daylight as much as at night. */}
          <div
            className="absolute inset-x-0 bottom-0 h-24"
            style={{ backgroundImage: "var(--nf-scrim-media)" }}
            aria-hidden="true"
          />

          {/*
            THE ONE BADGE. There is no second slot in this file and adding one
            means editing this comment first.

            It renders only when the platform has actually verified the person
            behind the listing. Not "is an agent", not "is published", not
            "instant book" - those are three different facts and none of them
            is the one a stranger is weighing when they look at a tick.
          */}
          {listing.verified && (
            <span className="nf-badge nf-badge--verified absolute left-3 top-3">
              <UiIcon name="verified" size="xs" />
              {t.common.verified}
            </span>
          )}

          {/* ----------------------------------------------------- PRIMARY 3
              Where it is, on the photograph where the eye already is. */}
          <p className="nf-body-sm absolute bottom-3 left-3 right-3 flex items-center gap-inline-tight font-medium text-[var(--nf-content-on-media)]">
            <UiIcon
              name="location"
              size="sm"
              className="shrink-0 text-[var(--nf-content-on-media-muted)]"
            />
            <span className="truncate">{where}</span>
          </p>
        </div>

        <div className="p-card">
          {/*
            ------------------------------------------------------ DISCLOSURE

            ABOVE THE PRICE, BECAUSE THE PRICE IS THE LIE.

            An example listing carries a real Lagos area and a real naira
            figure, and until now a reader had no way at all to tell it apart
            from the flat next to it in the grid. The sentence that says so
            existed only in Open Graph metadata, which is written for crawlers.

            It goes FIRST in the body, before the price and before the title,
            because those are the two things somebody believes about a card, and
            a correction that arrives after the belief has formed is a footnote.
            Deliberately not a badge on the photograph: a pill in that corner is
            where every platform draws Featured and Superhost, and dressing a
            warning as an endorsement is worse than saying nothing.

            See `ExampleNotice` for the rest of the reasoning. It renders the
            one shared string, so this card and the detail page cannot drift.
          */}
          {listing.isDemo && <ExampleNotice className="mb-row" />}

          {/* ------------------------------------------------------- PRIMARY 2
              The price, on its own row, above the title.

              Above, because in a grid of properties the price is what somebody
              is actually comparing, and it used to sit at the bottom of the
              card under three other rows. `whitespace-nowrap` is the guarantee
              that it cannot break mid figure; `glance` is the deliberate
              abbreviation that stops it needing to. */}
          {hasPrice ? (
            <p className="whitespace-nowrap">
              <Amount
                minorUnits={listing.priceMinor}
                locale={locale}
                currency={listing.currency}
                glance
                suffix={`/ ${period}`}
                className="text-[1.25rem] font-bold leading-none tracking-tight text-[var(--nf-content-primary)]"
                secondaryClassName="text-[0.6em] font-semibold text-[var(--nf-content-muted)]"
              />
            </p>
          ) : (
            <p className="nf-body-sm font-semibold text-[var(--nf-content-muted)]">
              {t.common.priceOnRequest}
            </p>
          )}

          <h3 className="nf-body mt-inline-tight line-clamp-2 font-semibold leading-snug text-[var(--nf-content-primary)]">
            {listing.title}
          </h3>

          {/* ------------------------------------------------------ SECONDARY
              One quiet row, fixed order, muted. Everything in it is a fact the
              reader might filter on, and none of it is worth full contrast. */}
          {facts.length > 0 && (
            <ul className="nf-caption mt-inline flex flex-wrap items-center gap-x-inline gap-y-inline-tight text-[var(--nf-content-muted)]">
              {facts.map((fact, i) => (
                <li key={fact.key} className="flex items-center gap-inline">
                  {/* A dot between facts rather than a gap. At 12px muted, a
                      gap alone lets "3" and "2" read as "32". */}
                  {i > 0 && (
                    <span aria-hidden="true" className="text-[var(--nf-content-muted)] opacity-50">
                      &middot;
                    </span>
                  )}
                  <span className={fact.numeric ? "nf-numeric" : undefined}>{fact.label}</span>
                </li>
              ))}
            </ul>
          )}

          {/* ----------------------------------------------------------- POWER
              The one Nigerian field that earns space in a grid. Absent, and
              therefore invisible, when the host has not answered. */}
          {power && (
            <p className="nf-caption mt-inline inline-flex max-w-full items-center gap-inline-tight rounded-[var(--nf-radius-pill)] bg-[var(--nf-surface-secondary)] px-sm py-2xs font-medium text-[var(--nf-content-secondary)]">
              <UiIcon name="sparkle" size="xs" className="shrink-0 text-[var(--nf-brand-primary)]" />
              <span className="truncate">{power}</span>
            </p>
          )}
        </div>
      </Link>
    </article>
  );
}
