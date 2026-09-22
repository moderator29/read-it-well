"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { formatNumber, isGlanceCompact, type Dictionary, type Locale } from "@vallo/i18n";
import type { Listing } from "@/lib/listings/types";
import { hrefForListing } from "@/lib/listings/href";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { Amount } from "@/components/ui/Amount";
import { IntentTune } from "@/components/app/IntentTune";
import { MediaFrame } from "@/components/app/MediaFrame";
import { isPropertyType, type PropertyType } from "@/lib/interests/schema";
import { isDataSaver } from "@/lib/ui/data-saver";
import { SaveButton, useSaveControl } from "@/components/app/SaveControl";
import { cardFacts, cardMarket, cardPrice, cardUtility } from "./listing-card-model";

/**
 * The property card, to the results image (3EB3E2A9).
 *
 * The photograph carries the marks: Verified top-left, the heart top-right,
 * the market tag on the photo's foot. The body carries the words in the
 * order a person compares them: title, where, the figure, the facts.
 *
 * WHAT IS REAL AND WHAT IS NOT. A listing with `listing_photos` rows shows
 * its own photograph. One without shows the scene photograph for its kind
 * through `MediaFrame` (the manifest wires whatever is on disk) and says
 * "No photographs yet" on the frame, so a category plate is never mistaken
 * for a picture of this property. The Verified pill appears only on a row a
 * person checked; a rating never appears without real reviews.
 */

const PERIOD_KEY: Record<string, keyof Dictionary["catalogue"]["card"]> = {
  year: "perYear",
  month: "perMonth",
  quarter: "perQuarter",
  night: "night",
  guest: "head",
};

function fractionClass(minorUnits: number, whenKobo: string): string {
  return isGlanceCompact(minorUnits) ? "" : whenKobo;
}

const FACT_ICON: Record<string, UiIconName> = {
  beds: "bed",
  baths: "bath",
  parking: "parking",
  size: "grid",
  kind: "house",
  instant: "bolt",
};

export function ListingCard({
  listing,
  locale,
  t,
  index,
  intent,
  saved,
  wide = false,
  dense = false,
}: {
  listing: Listing;
  locale: Locale;
  t: Dictionary;
  /** Position in a freshly assembled list, for the entrance stagger. */
  index?: number;
  intent?: PropertyType[];
  /**
   * The STORED truth about the heart, from `saved_items`, when the page that
   * drew this card already knows it.
   *
   * The card used to call `useSaveControl(listing.id)` with nothing, so the
   * heart rendered from the device store alone and a signed-in reader's
   * hearted listing came back empty after a reload - on `/search`, on
   * `/rent`, and most visibly on `/saved`, where the `StayCard` half passed
   * its stored value and drew a filled heart beside a `ListingCard` drawing
   * an empty one, on the board whose entire job is the shortlist. The write
   * always worked; this is the read back, which is the half of the ONE LAW
   * that says the UI shows the new reality. (R2 finding 4.)
   *
   * Optional because a surface that genuinely does not know must not claim
   * `false`: `undefined` leaves `useSaveControl` on the device store it
   * already falls back to, which is the honest answer for a guest.
   */
  saved?: boolean;
  /** One across, the 16:10 photograph of the stays shelf. */
  wide?: boolean;
  /**
   * Two of these cards share a 390px row.
   *
   * Set by the grids that draw two-up, and by nothing else. It is a fact about
   * the LAYOUT, which only the grid knows, so it is passed rather than
   * guessed: a card on the saved board and a card on the rent shelf are full
   * width at 390 and have room for all three facts, and a card that dropped a
   * fact there would be hiding something for no reason.
   */
  dense?: boolean;
}) {
  const router = useRouter();
  const photo = listing.photos[0];
  /*
   * WHERE THIS OPENS IS DECIDED BY WHAT THE LISTING IS, not by a prop.
   *
   * This was `side === "stays" ? "/stay" : "/listing"` off a `side` prop that
   * defaulted to `"property"` and that NO CALL SITE IN THE TREE PASSED. The
   * property search's own category rail offers Shortlets, Apartments, Villas
   * and Hotels, so four of its nine markets opened a Stays object inside the
   * Property shell, and a saved hotel did the same from the shortlist. The
   * prop is deleted rather than threaded through the three pages, because a
   * prop nobody passes is how this happened. See `lib/listings/href.ts`.
   */
  const href = hrefForListing(listing.kind, listing.id);
  const copy = t.catalogue.card;

  /* Prefetch on intent, never on a data-saver connection. */
  const prefetched = useRef(false);
  const [warmed, setWarmed] = useState(false);
  const warm = () => {
    if (prefetched.current) return;
    if (isDataSaver()) return;
    prefetched.current = true;
    setWarmed(true);
  };

  /* A view transition carries the photograph into the detail hero. */
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

  // "Lagos, Lagos" reads as a bug, so a place stated twice collapses.
  const where =
    listing.area && listing.area !== listing.city
      ? `${listing.area}, ${listing.city}`
      : listing.area || listing.city;

  const price = cardPrice(listing);
  const facts = cardFacts(listing, t);
  const power = cardUtility(listing);
  const marketKey = cardMarket(listing);
  const market =
    marketKey === "sale"
      ? copy.forSale
      : marketKey === "night"
        ? copy.perNight
        : marketKey === "head"
          ? copy.perHead
          : copy.forRent;
  const periodKey = listing.pricePeriod ? PERIOD_KEY[listing.pricePeriod] : undefined;
  const suffix = listing.intent === "sale" ? "" : periodKey ? copy[periodKey] : "";

  const cardStyle =
    index !== undefined
      ? ({ "--card-i": Math.min(index, 5) } as React.CSSProperties)
      : undefined;

  const tunableKind: PropertyType | null = isPropertyType(listing.kind) ? listing.kind : null;
  const save = useSaveControl(listing.id, saved);

  /* The facts row: beds, baths, then the floor area when the lister gave one,
     then what the place is. Four at most, so a card stays one row. */
  const row: { key: string; label: string; icon: UiIconName; numeric?: boolean }[] = facts.map(
    (fact) => ({
      key: fact.key,
      label: fact.label,
      icon: FACT_ICON[fact.key] ?? "sparkle",
      ...(fact.numeric !== undefined ? { numeric: fact.numeric } : {}),
    }),
  );
  if (listing.sizeSqm !== undefined && listing.sizeSqm > 0) {
    row.splice(Math.min(2, row.length), 0, {
      key: "size",
      label: `${formatNumber(listing.sizeSqm, locale)} ${copy.sqm}`,
      icon: "grid",
      numeric: true,
    });
  }
  /*
   * THREE FACTS, as the target render draws them: beds, baths and the floor
   * area. The building noun is dropped once those three exist, because the
   * render does not carry it and a fourth chip on a card this size wraps the
   * row onto a second line. It survives where it is the only thing there is
   * to say - a plot of land has no beds and no baths, and the render's own
   * land card reads "Land, 5,000 sqm" - which is why it is dropped by rank
   * rather than removed from the model.
   */
  const ranked = row.length > 3 ? row.filter((fact) => fact.key !== "kind") : row;

  /*
   * TWO FACTS AND A "+N" ON THE TWO-UP CARD, THREE ON THE WIDE ONE.
   *
   * The target render draws beds, baths and the floor area on one line. Ours
   * wrapped onto two at 390, because a two-up card is about 150px of content
   * and three glyph-and-label pairs need closer to 165. The row was tightened
   * as far as it goes; going further meant dropping the fact row below the
   * type scale's floor, and illegible text is not a fix, it is the same bug
   * with fewer pixels.
   *
   * So the narrow card states the two facts people compare (how many bedrooms,
   * how many bathrooms) and marks the rest with a count. The mark is not
   * decoration: it carries the facts it stands for in its accessible name and
   * in its tooltip, and the card it sits on opens the property where all of
   * them are drawn in full. Nothing is hidden, one line is kept, and no
   * character on this card is smaller than the floor.
   *
   * A card that is not two-up (the saved board, the rent shelf, the wide
   * card) has the width for all three and keeps them.
   */
  const factLimit = dense ? 2 : 3;
  const shown = ranked.slice(0, factLimit);
  const spilled = ranked.slice(factLimit, 3);

  return (
    <article
      className={`nf-glass nf-glass--card nf-pcard group ${wide ? "nf-pcard--wide" : ""} ${index !== undefined ? "nf-card-in" : ""}`}
      style={cardStyle}
      data-testid="listing-card"
    >
      {/* The controls sit OUTSIDE the link. An anchor may not contain a
          button, and a screen reader must hear two controls, not one. */}
      <div className="nf-pcard__controls">
        <SaveButton
          saved={save.saved}
          pending={save.pending}
          onToggle={save.toggle}
          title={listing.title}
          surface="media"
        />
        {intent !== undefined && tunableKind && (
          <IntentTune type={tunableKind} t={t} interests={intent} />
        )}
      </div>
      {save.note && (
        <p
          role="status"
          className={`nf-pcard__note ${save.note.tone === "error" ? "text-[var(--nf-state-error)]" : ""}`}
        >
          {save.note.text}
        </p>
      )}

      <Link
        href={href}
        prefetch={warmed ? true : undefined}
        onClick={handleClick}
        onPointerDown={warm}
        onPointerEnter={warm}
        onFocus={warm}
        className="flex h-full flex-col"
      >
        <div
          className="nf-pcard__media"
          style={{ viewTransitionName: `listing-photo-${listing.id}` }}
        >
          <div className="nf-pcard__photo">
            <MediaFrame
              hue={listing.hue}
              index={index ?? 0}
              kind={listing.kind}
              sizes={wide ? "(max-width: 640px) 100vw, 50vw" : "(max-width: 640px) 50vw, 25vw"}
            />
            {photo && (
              <Image
                src={photo}
                alt=""
                fill
                sizes={wide ? "(max-width: 640px) 100vw, 50vw" : "(max-width: 640px) 50vw, 25vw"}
                className="object-cover"
              />
            )}
          </div>

          {/* Verified and Example can never both be true: a check constraint,
              a trigger and the mapper each enforce it. */}
          {listing.verified && (
            <span className="nf-pcard__mark nf-pcard__mark--verified">
              <UiIcon name="verified" size={12} />
              {t.common.verified}
            </span>
          )}
          {/* The example disclosure: the register's outline mark, carrying
              the shared `nf-badge--example` class so the source guard in
              `example-notice.test.ts` can see every card renderer says it. */}
          {listing.isDemo && (
            <span className="nf-badge--example nf-pcard__mark nf-pcard__mark--example">
              <UiIcon name="info" size={12} />
              {copy.example}
            </span>
          )}
          <span className="nf-pcard__mark nf-pcard__mark--market">
            <UiIcon name={marketKey === "sale" ? "key" : marketKey === "rent" ? "home" : "calendar-booking"} size={12} />
            {market}
          </span>
          {!photo && <span className="nf-pcard__nophoto">{copy.noPhotos}</span>}
        </div>

        <div className="nf-pcard__body">
          <h3 className="nf-pcard__title">{listing.title}</h3>

          <p className="nf-pcard__where">
            <UiIcon name="location" size={11} className="mt-3xs" />
            <span>{where}</span>
          </p>

          {price.lead === "none" && (
            <p className="nf-pcard__sub font-semibold">{t.common.priceOnRequest}</p>
          )}

          {price.lead === "headline" && (
            <p className="nf-pcard__price">
              <Amount
                minorUnits={price.minor}
                locale={locale}
                currency={listing.currency}
                glance
                secondaryClassName={fractionClass(price.minor, "text-[0.6em] font-semibold opacity-70")}
              />
              {suffix && <span className="nf-pcard__price-suffix">{suffix}</span>}
            </p>
          )}

          {/* A tenancy leads with the move-in total, the one figure this
              product exists to print, and keeps the rent beneath it. */}
          {price.lead === "moveIn" && (
            <>
              <p className="nf-pcard__price">
                {price.approximate && (
                  <span className="nf-pcard__price-suffix mr-2xs ml-0">from</span>
                )}
                <Amount
                  minorUnits={price.minor}
                  locale={locale}
                  currency={listing.currency}
                  glance
                  secondaryClassName={fractionClass(price.minor, "text-[0.6em] font-semibold opacity-70")}
                />
                <span className="nf-pcard__price-suffix">{copy.moveIn}</span>
              </p>
              <p className="nf-pcard__sub">
                {copy.rent}{" "}
                <Amount
                  minorUnits={price.rentMinor}
                  locale={locale}
                  currency={listing.currency}
                  glance
                  suffix={price.rentSuffix}
                  className="whitespace-nowrap font-semibold text-[var(--nf-content-secondary)]"
                  secondaryClassName={fractionClass(price.rentMinor, "text-[0.85em] font-semibold")}
                />
              </p>
            </>
          )}

          {shown.length > 0 && (
            <ul className="nf-pcard__facts" data-testid="card-facts">
              {shown.map((fact) => (
                <li key={fact.key} className="nf-pcard__fact">
                  <UiIcon name={fact.icon} size={11} />
                  <span className={fact.numeric ? "nf-numeric" : undefined}>{fact.label}</span>
                </li>
              ))}
              {spilled.length > 0 && (
                <li
                  className="nf-pcard__fact nf-pcard__fact--more"
                  title={spilled.map((fact) => fact.label).join(", ")}
                  data-testid="card-facts-more"
                >
                  <span aria-hidden="true">+{spilled.length}</span>
                  {/* The facts themselves, for anybody who cannot see the
                      count. A "+1" with nothing behind it is a decoration. */}
                  <span className="sr-only">{spilled.map((fact) => fact.label).join(", ")}</span>
                </li>
              )}
            </ul>
          )}

          {/* The one Nigerian field that earns a line in a grid: what happens
              when the light goes. Absent when the host has not answered. */}
          {power && (
            <p className="nf-pcard__sub mt-inline-tight inline-flex items-start gap-inline-tight">
              <UiIcon name="bolt" size={12} className="mt-3xs shrink-0" />
              <span className="break-words">{power}</span>
            </p>
          )}
        </div>
      </Link>
    </article>
  );
}
