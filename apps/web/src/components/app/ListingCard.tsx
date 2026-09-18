"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { isGlanceCompact, type Dictionary, type Locale } from "@vallo/i18n";
import type { Listing } from "@/lib/listings/types";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Amount } from "@/components/ui/Amount";
import { IntentTune } from "@/components/app/IntentTune";
import { MediaFrame } from "@/components/app/MediaFrame";
import { isPropertyType, type PropertyType } from "@/lib/interests/schema";
import { isDataSaver } from "@/lib/ui/data-saver";
import { SaveButton, useSaveControl } from "@/components/app/SaveControl";
import { cardFacts, cardMarket, cardPrice, cardUtility } from "./listing-card-model";

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
 * is wrong by a factor of ten. Three things guarantee it here. Every figure
 * carries `whitespace-nowrap`, so it can never wrap mid-figure. `glance`
 * abbreviates deliberately at a threshold owned by `@vallo/i18n`, so a yearly
 * rent reads ₦4.5m by choice while a nightly rate keeps its full ₦95,000. And
 * the words beside a figure ("to move in", "from", "Rent") are SIBLINGS of it
 * rather than its `suffix`, in a wrapping row, so when the words run out of
 * width the words wrap and the number does not.
 *
 * That third guarantee is newer than the other two. The price used to own its
 * own row with nothing beside it, which was the simplest way to keep it whole
 * and also the reason the card could not name what the figure was for.
 *
 * BOTH THEMES, ONE STRUCTURE. Nothing here is drawn differently in light and
 * dark. Every colour is a semantic token, and the only surface that is
 * deliberately theme-independent is the scrim over the photograph, because what
 * is underneath it is a photograph at noon as much as at midnight.
 */

/**
 * What `Amount` should do with the part after the decimal separator, here.
 *
 * THE SIGNIFICANT DIGIT WAS BEING DRAWN AS THOUGH IT WERE KOBO. `Amount` mutes
 * everything after the separator at 0.6em, which is exactly right for
 * "₦95,000.00", where the ".00" is noise. Under `glance` the same split lands
 * on a COMPACTED figure: ₦6,750,000 renders as "₦6" then ".8" then "m", and
 * that ".8" is worth ₦800,000. At 0.6em in the muted tone the card reads as ₦6,
 * which is a different number by an order of magnitude, and it was on every
 * rental in the catalogue.
 *
 * So the fraction keeps the figure's own size and colour whenever the glance
 * rule has actually compacted, and drops to the muted tail only when it is
 * genuinely kobo. `isGlanceCompact` is exported from `@vallo/i18n` for exactly
 * this, and its docstring says so: one threshold, applied in one place.
 *
 * The compacted answer is the EMPTY STRING rather than a class, because
 * `Amount` reads `secondaryClassName ?? muted` and an empty string is not
 * nullish: it wins, and the span then inherits the figure's size, weight and
 * colour, which is the whole point.
 */
function fractionClass(minorUnits: number, whenKobo: string): string {
  return isGlanceCompact(minorUnits) ? "" : whenKobo;
}

export function ListingCard({
  listing,
  locale,
  t,
  index,
  intent,
  side = "property",
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
  /**
   * Which side's detail page the card opens.
   *
   * `/listing/[id]` and `/stay/[id]` serve the same row, but the URL decides
   * the shell: a card tapped on the Stays shelf must open in the Stays shell,
   * and `sideOfPath` treats `/listing/` as Property. The stays surfaces pass
   * `"stays"`; everything else keeps the property route it always had.
   */
  side?: "property" | "stays";
}) {
  const router = useRouter();
  const photo = listing.photos[0];
  const href = `${side === "stays" ? "/stay" : "/listing"}/${listing.id}`;

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

  /*
   * WHAT THE PRICE BUYS, FROM THE RECORD RATHER THAN FROM THE MARKET.
   *
   * This tested for `pricePeriod === "year"` and called everything else a
   * night, which is right for exactly two of the five periods the schema can
   * hold. A shortlet let by the MONTH printed its monthly rate as a nightly
   * one, and so did a quarterly tenancy: the same defect the landing rail had,
   * where a year's rent was captioned "per night" on the front page.
   *
   * It now asks `cardPrice`, which owns the harder question underneath it:
   * WHICH figure leads. On a tenancy that is the move-in total and the rent
   * moves beneath it, which is the product rule in `PRODUCT.md` section 5 and
   * the one thing this card exists to say that no competitor's does. The
   * period words still come from `PERIOD_SUFFIX_SHORT`, the platform's one map
   * from period to words, so the card, the rail and the detail page cannot
   * disagree about what a figure means.
   */
  const price = cardPrice(listing);

  const facts = cardFacts(listing, t);
  const market = t.landing.card.market[cardMarket(listing)];
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

  const save = useSaveControl(listing.id);

  return (
    <article
      /* `h-full` and a column, so a row of cards in a CSS grid squares its
         own bottoms. Without it the grid stretched the list item and the card
         inside it kept its content height, so paired cards ended ragged and a
         page of twenty read as a page that had not finished loading. */
      className={`nf-card nf-card--interactive group relative flex h-full flex-col overflow-hidden ${index !== undefined ? "nf-card-in" : ""}`}
      style={cardStyle}
    >
      {/*
        OUTSIDE the card's own Link, and it has to be. An anchor may not contain
        a button: the browser's own activation behaviour for the anchor swallows
        it, and a screen reader announces one control where there are two.

        THE HEART IS UNCONDITIONAL and the tuner is not. Saving is offered to
        everybody, because a signed-out tap is kept on the device rather than
        refused (see `SaveControl`), and because `/saved` has always told people
        to tap a heart the grid did not have. The tuner needs an account to
        write to and a market the interests column can actually hold, so it is
        rendered only when both are true.
      */}
      <div className="pointer-events-none absolute inset-x-md top-md z-10 flex flex-col items-end gap-inline-tight">
        <div className="pointer-events-auto flex items-center gap-inline-tight">
          {/* Drawn at 36px, tappable at 44. `nf-icon-btn` guarantees the
              target through an overflowing pseudo-element precisely so a call
              site can size the visible control to its surface; the class's own
              comment says so. Two 44px discs on a 171px card would be the
              loudest thing on it. */}
          <SaveButton
            saved={save.saved}
            pending={save.pending}
            onToggle={save.toggle}
            title={listing.title}
            className="h-9 w-9"
          />
          {intent !== undefined && tunableKind && (
            <IntentTune type={tunableKind} t={t} interests={intent} />
          )}
        </div>

        {/*
          WHAT THE SAVE SAID, over the media rather than under the card.

          A note that appends to the card would change the card's height, and a
          row of cards that reflows under a resting thumb is how somebody opens
          the wrong property. This floats in space the media already owns, so
          nothing moves. It clears itself after a moment; `role="status"`
          announces it once without stealing focus.
        */}
        {save.note && (
          <p
            role="status"
            className={`nf-caption max-w-full rounded-[var(--nf-radius-control)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-elevated)] px-xs py-3xs font-medium ${
              save.note.tone === "error"
                ? "text-[var(--nf-state-error)]"
                : "text-[var(--nf-content-secondary)]"
            }`}
          >
            {save.note.text}
          </p>
        )}
      </div>

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
            The media.

            TWO SHAPES, AND WHICH ONE YOU GET IS DECIDED BY WHETHER THERE IS A
            PHOTOGRAPH. See the long note at the head of this file.
          */}
        {/*
            NO FIXED RATIO ON THE INFORMATION BAND, and this was got wrong once
            before fixing it. `aspect-ratio` with absolutely positioned content
            does not grow: the children are out of flow, the box stays at 16:9,
            and the last line of the band is clipped by it. The band is now
            sized by what it says, in normal flow, which lands at roughly 16:9
            for a one-line power answer and grows a line when the answer needs
            two. A photograph keeps 4:3, because a photograph has a shape.
          */}
        <div
          className={`relative w-full shrink-0 overflow-hidden ${photo ? "aspect-[4/3]" : ""}`}
          style={{ viewTransitionName: `listing-photo-${listing.id}` }}
        >
          <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.045] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
            <MediaFrame hue={listing.hue} index={index ?? 0} kind={listing.kind} ghost={!photo} />
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

          {photo ? (
            <>
              {/*
                THE SCRIM, ONLY WHERE THERE IS A PHOTOGRAPH AND ONLY AS DEEP AS
                THE LINE IT HAS TO CARRY.

                It was a fixed 96px. In a two-up grid at 390px the media box is
                about 128px tall, so a third of every picture was a permanent
                black gradient, including on the cards with no picture under it
                to make legible. It is 56px now, which is the location line and
                its breathing room, and it is not drawn at all when the frame is
                drawing rather than photographing.

                Theme independent on purpose: what is underneath it is a
                photograph in daylight as much as at night.
              */}
              <div
                className="absolute inset-x-0 bottom-0 h-14"
                style={{ backgroundImage: "var(--nf-scrim-media)" }}
                aria-hidden="true"
              />

              <p className="nf-body-sm absolute bottom-3 left-3 right-3 flex items-start gap-inline-tight font-medium text-[var(--nf-content-on-media)]">
                <UiIcon
                  name="location"
                  size="sm"
                  className="mt-3xs shrink-0 text-[var(--nf-content-on-media-muted)]"
                />
                <span className="break-words">{where}</span>
              </p>
            </>
          ) : (
            /*
              ------------------------------------------------ THE INFORMATION
              BAND, which is what this product actually looks like.

              Read the head of the file for the argument. In short: zero rows in
              `listing_photos`, so this is not a fallback, it is every card on
              every surface. The box stops reserving a photograph's proportions
              for a photograph that is not coming, and prints instead the two
              questions a Nigerian renter answers before any other - what is
              this for, and what happens when the light goes - with the drawn
              scene left underneath at a quarter strength so the card still has
              a picture's silhouette.

              The ground is `--nf-media-ground-*`, which is a real depth of the
              surface family in BOTH themes, so the ordinary content tokens are
              the correct ink here. `--nf-content-on-media` is deliberately not
              used: that family is theme-independent white, for text over a
              photograph, and this is not one.
              THE CONTROLS GET THE TOP OF THE BAND AND THE WORDS GET THE REST.

              The market was first tried beside them, with their width reserved
              on the same line, and at 171px "TO RENT" then broke across two
              lines to fit what was left. Nothing in an overline should wrap.
              So the band clears the control row entirely and the words run the
              full width underneath it, which also leaves a strip of the drawn
              scene visible at the top where it reads as a picture rather than
              as a texture behind text.

              The clearance is a `calc` of where the control row starts, how
              tall it is and the gap under it, not a measured number, so it
              cannot drift when the control changes size. `MapDock` reserves its
              corner the same way. The first attempt counted the height and
              forgot the inset, and the overline landed eight pixels inside the
              buttons.
            */
            <div className="relative flex flex-col p-card-sm pt-[calc(var(--nf-space-md)+2.25rem+var(--nf-gap-inline))]">
              <p className="nf-overline text-[var(--nf-content-secondary)]">{market}</p>

              <div className="mt-3xs">
                {power && (
                  <p className="nf-body-sm font-semibold leading-snug text-[var(--nf-content-primary)] break-words">
                    {power}
                  </p>
                )}
                {/* The honest line, and it is the shortest true one available.
                    "No photographs yet" states the position without promising
                    an upload on an agent's behalf, and without reaching for any
                    of the six words the vocabulary bans. It disappears by
                    itself the moment a photograph exists, and it is in the
                    dictionary, because a card read on a Hausa phone is read in
                    Hausa. */}
                <p className="nf-caption mt-3xs text-[var(--nf-content-muted)]">
                  {t.landing.card.noPhotos}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-card">
          {/*
            ------------------------------------------------------ DISCLOSURE

            ONE MARK, IN THE BODY, AND THE ARGUMENT THAT SETTLES IT.

            Two files in this tree used to give opposite instructions. This one
            drew a filled pill on the picture and argued that a two-up grid has
            no room for a paragraph, which is true: `ExampleNotice` is three
            sentences and four or five wrapped lines at 171px, and it pushed
            the price off the visible tile. `ExampleNotice` argued that a small
            filled pill in the corner of a property card is the visual grammar
            of Featured, Superhost and Instant book, and that drawing a
            disclosure in the costume of a promotion is worse than drawing
            nothing. That is also true.

            Both were right about the other one. So the mark is neither: it is
            an OUTLINED chip, in the body, above the price, where nothing reads
            as an endorsement and nothing costs five lines. Two more things fall
            out of moving it off the media. The example chip used to be a 12 per
            cent cyan wash composited against a pale sky in the light theme, so
            the one disclosure the card carried was the least legible thing on
            it; on the card surface with a hairline it is legible in both. And
            the sun disc in the drawn scene lands behind `left-3 top-3` on one
            hue in five, which put a grey circle through the word "Example" and
            through the "V" of "Verified". Nothing is drawn there now.

            THE FULL SENTENCE IS NOT LOST. It is still on the detail page, in
            the hero above the price, which is the screen where somebody forms a
            belief detailed enough to act on. A card's job is to be honest
            enough that nobody opens it by mistake.

            THEY CAN NEVER BOTH APPEAR: `verified` is false on every example row
            and a check constraint, a trigger and the mapper each enforce it
            independently.
          */}
          {listing.verified && (
            <p className="nf-caption mb-inline-tight inline-flex items-center gap-inline-tight rounded-[var(--nf-radius-control)] border border-[var(--nf-status-verified)] px-xs py-3xs font-semibold text-[var(--nf-status-verified)]">
              <UiIcon name="verified" size="xs" />
              {t.common.verified}
            </p>
          )}
          {listing.isDemo && (
            <p className="nf-caption mb-inline-tight inline-flex items-center gap-inline-tight rounded-[var(--nf-radius-control)] border border-[var(--nf-state-warning)] px-xs py-3xs font-semibold text-[var(--nf-state-warning)]">
              <UiIcon name="info" size="xs" />
              Example
            </p>
          )}

          {/* ------------------------------------------------------- PRIMARY 2
              The price, on its own row, above the title.

              Above, because in a grid of properties the price is what somebody
              is actually comparing, and it used to sit at the bottom of the
              card under three other rows. `whitespace-nowrap` is the guarantee
              that it cannot break mid figure; `glance` is the deliberate
              abbreviation that stops it needing to. */}
          {price.lead === "none" && (
            <p className="nf-body-sm font-semibold text-[var(--nf-content-muted)]">
              {t.common.priceOnRequest}
            </p>
          )}

          {price.lead === "headline" && (
            <p className="whitespace-nowrap">
              <Amount
                minorUnits={price.minor}
                locale={locale}
                currency={listing.currency}
                glance
                suffix={price.suffix}
                className="text-[var(--nf-text-h4)] font-bold leading-none tracking-tight text-[var(--nf-content-primary)]"
                secondaryClassName={fractionClass(
                  price.minor,
                  "text-[0.6em] font-semibold text-[var(--nf-content-muted)]",
                )}
              />
            </p>
          )}

          {/*
            THE MOVE-IN TOTAL, WHICH IS THE ONE FIGURE THIS PRODUCT EXISTS TO
            PRINT.

            The label sits OUTSIDE `Amount` rather than in its `suffix`,
            because `suffix` joins the words to the figure inside one span and
            `whitespace-nowrap` on that span would then push a 171px card's
            price off its own edge. Outside, the figure keeps its nowrap
            guarantee and the words wrap under it when there is no room, which
            is the correct give: a clipped price is worse than no price, a
            wrapped label is not.

            "from" appears only when the total was summed from the parts the
            lister happened to name rather than stated outright. It is a floor,
            and saying so costs four characters.
          */}
          {price.lead === "moveIn" && (
            <>
              <p className="flex flex-wrap items-baseline gap-inline-tight">
                {price.approximate && (
                  <span className="nf-caption font-semibold text-[var(--nf-content-muted)]">
                    from
                  </span>
                )}
                <Amount
                  minorUnits={price.minor}
                  locale={locale}
                  currency={listing.currency}
                  glance
                  className="whitespace-nowrap text-[var(--nf-text-h4)] font-bold leading-none tracking-tight text-[var(--nf-content-primary)]"
                  secondaryClassName={fractionClass(
                    price.minor,
                    "text-[0.6em] font-semibold text-[var(--nf-content-muted)]",
                  )}
                />
                <span className="nf-caption font-semibold text-[var(--nf-content-secondary)]">
                  {t.landing.card.moveIn}
                </span>
              </p>
              <p className="nf-caption mt-inline-tight text-[var(--nf-content-muted)]">
                {t.landing.card.rent}{" "}
                <Amount
                  minorUnits={price.rentMinor}
                  locale={locale}
                  currency={listing.currency}
                  glance
                  suffix={price.rentSuffix}
                  className="whitespace-nowrap font-semibold"
                  secondaryClassName={fractionClass(price.rentMinor, "text-[0.85em] font-semibold")}
                />
              </p>
            </>
          )}

          {/*
            THE TITLE GETS THREE LINES, AND THE REASON IT MAY BE CLAMPED AT
            ALL IS THAT IT NO LONGER CARRIES A FACT OF ITS OWN.

            `line-clamp-2` cut "Five bedroom villa for sale i..." on the one row
            where the title was the ONLY statement of the market, so the clamp
            was not shortening a description, it was deleting the difference
            between a purchase and a tenancy. That fact now has its own label in
            the band above, which is what makes a clamp here defensible rather
            than a truncation of the kind rule 16 bans.

            Three rather than two, because at 171px a Lagos listing title is
            routinely five or six lines and the untruncated version pushed the
            facts row a screen down. Every word of it is on the detail page one
            tap away, which is not true of the market label.
          */}
          <h3 className="nf-body mt-inline-tight line-clamp-3 font-semibold leading-snug text-[var(--nf-content-primary)] break-words">
            {listing.title}
          </h3>

          {/* ------------------------------------------------------- PRIMARY 3
              Where it is.

              It used to be printed over the bottom of the picture. With no
              photograph under it that was white text on a black gradient over
              a drawing, which is three treatments arguing, and it was the one
              line on the card carrying `truncate`: "Chevron Drive, Lag..." and
              "Oniru Victoria Islan..." both lost the half that carries the
              price signal in Lagos. In the body it has the card's full width,
              wraps rather than clips, and reads in the body's own ink.

              It stays on the picture when there IS one, where the eye already
              is and where the scrim exists to make it legible. */}
          {!photo && (
            <p className="nf-caption mt-inline-tight flex items-start gap-inline-tight text-[var(--nf-content-secondary)]">
              <UiIcon
                name="location"
                size="xs"
                className="mt-3xs shrink-0 text-[var(--nf-content-muted)]"
              />
              <span className="break-words">{where}</span>
            </p>
          )}

          {/* ------------------------------------------------------ SECONDARY
              One quiet row, fixed order, muted. Everything in it is a fact the
              reader might filter on, and none of it is worth full contrast.

              THE MARKET LEADS IT WHEN THERE IS A PHOTOGRAPH, at one step more
              contrast than the rest, because it is not trivia: it is the
              difference between a figure somebody pays once and a figure
              somebody pays every year. It is a word and never a colour, per
              rule 13. With no photograph the information band above is already
              carrying it at the top of the card, where it is stronger still,
              and printing it twice would be noise. */}
          <ul className="nf-caption mt-inline flex flex-wrap items-center gap-x-inline gap-y-inline-tight text-[var(--nf-content-muted)]">
            {photo && (
              <li className="font-semibold text-[var(--nf-content-secondary)]">{market}</li>
            )}
            {facts.map((fact, i) => (
              <li key={fact.key} className="flex items-center gap-inline">
                {/* A dot between facts rather than a gap. At 12px muted, a
                    gap alone lets "3" and "2" read as "32". Never before the
                    first item in the row, whichever item that turns out to
                    be. */}
                {(photo || i > 0) && (
                  <span aria-hidden="true" className="text-[var(--nf-content-muted)] opacity-50">
                    &middot;
                  </span>
                )}
                <span className={fact.numeric ? "nf-numeric" : undefined}>{fact.label}</span>
              </li>
            ))}
          </ul>

          {/* ----------------------------------------------------------- POWER
              The one Nigerian field that earns space in a grid. Absent, and
              therefore invisible, when the host has not answered.

              It is in the BODY only when a photograph owns the box above,
              because the information band carries it otherwise and carries it
              louder, which is where it belongs on a card that has no picture
              to sell.

              THE SURFACE IS `--nf-surface-inset`, NOT `--nf-surface-secondary`.
              In the light theme `secondary`, `primary` and `elevated` all
              resolve to pure white, so on a white card this chip had no
              background at all and the component relied on a surface step that
              does not exist in the designed twin. `inset` is the token that
              does exist for exactly this. */}
          {photo && power && (
            <p className="nf-caption mt-inline inline-flex max-w-full items-start gap-inline-tight rounded-[var(--nf-radius-control)] bg-[var(--nf-surface-inset)] px-sm py-2xs font-medium text-[var(--nf-content-secondary)]">
              {/* Muted, not brand blue. A brand-coloured mark in the quietest
                  row on the card pulls the eye to the least important thing on
                  it. This was a sparkle while the stroked set had nothing that
                  meant electricity; the bolt was added the same night this
                  comment asked for it. */}
              <UiIcon name="bolt" size="xs" className="mt-3xs shrink-0" />
              <span className="break-words">{power}</span>
            </p>
          )}
        </div>
      </Link>
    </article>
  );
}
