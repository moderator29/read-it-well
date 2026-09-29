"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { useBack } from "@/lib/nav/use-back";
import { useClientCopy } from "@/lib/i18n/client-copy";
import { ListingActions } from "./ListingActions";
import type { SavePlaceTarget } from "@/components/app/SaveControl";
import type { SharedKind } from "@/components/app/messages/share";
import type { ListingKind } from "@/lib/listings/types";
import { PhotoFrame } from "./PhotoFrame";
import { usePhotoViewer } from "./PhotoViewer";

/**
 * The immersive media hero.
 *
 * Reference 3 opens on photography that runs to all four edges of the phone
 * with nothing but floating circular glass controls on top of it, and the
 * content sheet then rides up over its lower edge. This is that hero: edge to
 * edge at every breakpoint rather than collapsing into an inset rounded box
 * from `sm` up, tall enough on a phone to be the screen rather than a banner,
 * square-cornered because the radius belongs to the sheet that overlaps it, and
 * with its own safe-area padding so the controls clear the notch the moment the
 * shell stops painting a header above this route.
 *
 * Panes are a scroll-snapping track, so the swipe is the browser's own: smooth
 * on touch, keyboard reachable, no gesture library. Tapping a pane opens the
 * shared lightbox at that photo, which is the affordance the platform was
 * missing entirely.
 *
 * Every pane is painted on the listing's deterministic gradient with the same
 * skyline silhouette the cards use, so a photo that has not arrived, or a CDN
 * that cannot be reached, degrades to a branded frame instead of a broken
 * image. A listing with no photography at all still gets one honest pane.
 */

export function ListingGallery({
  listingId,
  title,
  hue,
  kind,
  photos,
  plates = [],
  drawn = false,
  initialSaved = false,
  backFallback = "/home",
  mark,
  shareKind = "listing",
  place,
  shareTitle,
  floatingBack = true,
}: {
  /**
   * A back control that stays on screen after the photograph has scrolled
   * away. On by default; the property listing turns it off because its sticky
   * section tabs carry their own (`ListingSectionTabs`).
   */
  floatingBack?: boolean;
  listingId: string;
  title: string;
  /**
   * STORE-16: what the share sheet carries, when the page has one built
   * from structured fields. The lister's own title can name a street.
   */
  shareTitle?: string;
  hue: number;
  /**
   * Stand-in photography for a place with no photographs of its own: the
   * filed category plates (restaurant-01 and its siblings). Drawn
   * in the hero, never counted as this place's photos, and labelled so.
   */
  plates?: string[];
  /**
   * Draw the kind rather than a scene photograph behind a missing
   * photograph: a modest example (`lib/listings/example-imagery.ts`).
   */
  drawn?: boolean;
  /**
   * Which market this is, so the frame drawn behind a missing photograph is a
   * drawing of THIS kind of place rather than the same city skyline every
   * listing used to get. See `MediaFrame`.
   */
  kind: ListingKind;
  /** Photo URLs, best first. May be empty. */
  photos: string[];
  initialSaved?: boolean;
  /** Where back goes when this page was opened directly. */
  backFallback?: string;
  /**
   * The pill on the photograph's foot (9E8B56ED: For Rent, then Verified;
   * BB0C2C85: Stays). Only what the read can stand behind: the market is
   * always known, and Verified appears only where a person checked.
   */
  mark?: { label: string; icon?: UiIconName; verified?: boolean; verifiedLabel?: string };
  /**
   * What `listingId` is for the share path: `stay` on `/stay/<id>`, where the
   * id belongs to an accommodation rather than to a catalogue listing. Passed
   * straight to `ListingActions`, which owns the sheet.
   */
  shareKind?: SharedKind;
  /**
   * The shortlist target when this hero belongs to a catalogue place rather
   * than to a platform listing: an accommodation on `/stay`, a business venue
   * on `/restaurant`. Passed to `ListingActions`, which owns the heart; see
   * its note on why the heart wrote nothing on those two faces.
   */
  place?: SavePlaceTarget;
}) {
  /* The gallery's floating back circle is icon-only, so its accessible name is
     the ONLY thing a screen reader has to go on. It was the English literal
     "Back" on a page whose every other word is translated. */
  const t = useClientCopy();
  const viewer = usePhotoViewer();
  const track = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);
  const [broken, setBroken] = useState<Record<number, true>>({});

  // One pane per photo; the stand-in plates when there is no photography
  // yet, and one honest drawn pane when there is neither.
  const standIn = photos.length === 0 && plates.length > 0;
  const panes: (string | null)[] = photos.length > 0 ? photos : standIn ? plates : [null];
  const count = photos.length;

  const onScroll = useCallback(() => {
    const el = track.current;
    if (!el || el.clientWidth === 0) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    setActive((current) => (current === next ? current : next));
  }, []);

  const go = useCallback(
    (index: number) => {
      const el = track.current;
      if (!el) return;
      const clamped = Math.max(0, Math.min(panes.length - 1, index));
      el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
      setActive(clamped);
    },
    [panes.length],
  );

  /*
     Shared with PageHeader and BackButton. This is the control a guest actually
     reaches for on a listing, and it is the one the founder's "land on a screen
     I have never opened" is about: a listing opened from a notification, a
     share link or a redirect had none of the shelf behind it, and `router.back()`
     went wherever the machinery had been.

     `/listing/[id]` declares `/search` as its parent, so back lands on the
     shelf, and `useBack` still returns through history to the exact filtered
     search when the previous entry can be PROVED to be it. See
     `lib/nav/route-parents.ts`.
  */
  const back = useBack(backFallback);

  /*
   * THE BACK CONTROL MUST NOT SCROLL AWAY WITH THE PHOTOGRAPH.
   *
   * These pages hide the dock, so once the hero left the screen there was no
   * visible way off a stay or a restaurant at all. A second, fixed back
   * control fades in when the hero's own leaves the viewport. It is fixed, so
   * it moves nothing when it appears, and it is `inert` while hidden so
   * keyboard and screen reader users meet exactly one back at a time.
   */
  const heroBack = useRef<HTMLDivElement | null>(null);
  const [heroBackGone, setHeroBackGone] = useState(false);
  useEffect(() => {
    const node = heroBack.current;
    if (!floatingBack || !node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setHeroBackGone(!entry.isIntersecting);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [floatingBack]);

  return (
    <>
    <section
      aria-label={`${title} photos`}
      data-testid="listing-gallery"
      /* The hero is a photograph: its controls, chips and scrims keep the
         night material in both themes. */
      data-theme="dark"
      /*
       * Full bleed at every breakpoint, and the cancel now takes the SAME VALUE
       * as the thing it cancels.
       *
       * This was `-mx-5 md:-mx-8`: the page gutter's old fixed pair, written out
       * by hand. The gutter is `--nf-pad-shell`, which has been
       * `clamp(1.5rem, 0.9rem + 2vw, 2.5rem)` for some time - 24px on a phone,
       * 40px on a wide screen - so those two numbers agreed with it at no width
       * at all. At 390px the bleed fell 4px short of the edge on each side and
       * left a sliver of page showing down both sides of the photograph; around
       * 768px it overhung by about 2px, which is a horizontal scrollbar on a
       * screen that should not have one.
       *
       * `-mx-gutter` is that clamp negated, so it cancels exactly at every width
       * and the `md:` step goes away: the clamp already does the responsive
       * part. See `/home` and `/search`, which were converted first.
       *
       * The vertical pair cancels the shell's top padding so the media starts at
       * the very top of the content area. `-mt-xl` is the 32px it was.
       * `sm:-mt-2xl` is 48 where it was 40, which is 8px more of the photograph
       * covered above 640px and the one part of this change that needs eyes.
       *
       * Once the shell stops welding its 64px header onto this route the same
       * rule puts the hero under the status bar with no further change here.
       */
      className="relative -mx-gutter -mt-xl sm:-mt-2xl"
    >
      <div
        ref={track}
        onScroll={onScroll}
        /* A scroller a keyboard could not reach (axe
           `scrollable-region-focusable`). Focusable and named, so the arrow
           keys move through the photographs. A group, not a region: the
           section around it is already the landmark. */
        tabIndex={0}
        role="group"
        aria-label={t.a11y.photoGallery.replace("{title}", title)}
        className="nf-scroll-x flex aspect-[4/3] w-full snap-x snap-mandatory sm:aspect-[16/9] lg:aspect-[2/1]"
      >
        {panes.map((photo, i) => (
          <div
            key={photo ?? `pane-${i}`}
            className="relative h-full w-full shrink-0 snap-center snap-always overflow-hidden"
            /*
             * The lead pane carries the same view-transition-name the listing
             * card tagged its photo box with, so a browser that supports the
             * View Transitions API morphs the card's photo into this frame
             * instead of cutting to it. Every other browser just never reads
             * this property: no feature check needed on the receiving end.
             */
            style={i === 0 ? { viewTransitionName: `listing-photo-${listingId}` } : undefined}
          >
            <PhotoFrame hue={hue} index={i} kind={kind} drawn={drawn} />
            {photo && !broken[i] && (
              <Image
                src={photo}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 64rem"
                priority={i === 0}
                onError={() => setBroken((prev) => ({ ...prev, [i]: true }))}
                className={`object-cover ${i === 0 ? "nf-gallery-kenburns" : ""}`}
              />
            )}
            {/*
              The pane is tappable rather than the image being wrapped, so the
              scroll track keeps a plain div as its snap child and the hit area
              still covers the whole frame.
            */}
            {photo && viewer && (
              <button
                type="button"
                onClick={() => viewer.open(i)}
                aria-label={`View photo ${i + 1} full screen`}
                data-testid="gallery-open"
                className="absolute inset-0 z-[1] cursor-zoom-in"
              />
            )}
          </div>
        ))}
      </div>

      {/* Scrims: the controls sit on light sky at the top and the counter on
          whatever the photograph does at the bottom. Both need their own. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-32 [background-image:var(--nf-scrim-media-top)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-24 [background-image:var(--nf-scrim-media)]"
        aria-hidden="true"
      />

      {/* `nf-safe-top` is padding rather than an offset, so the glass controls
          clear the notch while the photography still runs behind it. */}
      <div ref={heroBack} className="nf-safe-top pointer-events-none absolute left-3 top-3 z-20 sm:left-4 sm:top-4">
        <button
          type="button"
          onClick={back}
          aria-label={t.common.back}
          /* THE WALKER'S HANDLE. `scripts/design/proof-nav.mjs` finds every
             drawn back control by this attribute. Five of the platform's seven
             back controls did not carry it, so a browser walk reported them as
             drawing nothing at all and two route lists were built on that
             reading. The attribute says what the object IS, which is why it is
             not a class name and not the accessible name. */
          data-nav-back=""
          className="pointer-events-auto grid h-11 w-11 place-items-center nf-btn nf-btn--glass nf-btn--sm nf-btn--icon text-[var(--nf-content-on-media)] transition-transform active:scale-90 motion-reduce:transition-none"
        >
          <UiIcon name="arrow-left" size={16} />
        </button>
      </div>

      <ListingActions
        listingId={listingId}
        title={shareTitle ?? title}
        initialSaved={initialSaved}
        shareKind={shareKind}
        place={place}
      />

      {/*
        Clear of the sheet, not under it.

        The content sheet rides up over the hero's lower edge by 2rem, 2.5rem
        from `sm`. The counter sat 1rem from that edge and the dots 1.25rem, so
        both were inside the overlap and the sheet - later in the DOM, same
        z-10 - painted straight over them. On the owner's screenshot that read
        as "1 /" with the photo count sliced off underneath. Their offsets now
        start above the overlap and keep the 0.25rem the dots always had on the
        counter.
      */}
      {mark && (
        <p className="nf-gallery-marks" data-testid="gallery-marks">
          <span className="nf-badge nf-badge--info nf-gallery-mark">
            {mark.icon && <UiIcon name={mark.icon} size={16} />}
            {mark.label}
          </span>
          {mark.verified && (
            <span className="nf-badge nf-badge--verified nf-gallery-mark">
              <UiIcon name="verified" size={16} />
              {mark.verifiedLabel ?? t.common.verified}
            </span>
          )}
        </p>
      )}
      {standIn && (
        <p
          data-testid="gallery-standin"
          /* Not interactive, but it is a media CHIP carrying words, and the
             photo counter twelve lines below is the same chip at the same corner
             on the same rung. A capsule beside a rectangle in one file is the
             confusion the shape law removes.

             THE RUNG IS `--nf-radius-sm`, NOT THE CONTROL ROLE, AND THAT IS
             THE WHOLE OF THE CORRECTION. Both chips draw 27 to 28px tall, so
             14px of corner clamps to half the height and the browser paints a
             capsule from source text that says rectangle (ledger 13.5: the
             ruling is about the RATIO, never the token name). 10px on 28px
             leaves the straight edge the governing images draw.

             CENTRED ON THE PHOTOGRAPH, NOT IN THE FOOT'S RIGHT CORNER. The
             foot's left carries the marks (the market, then Verified), and at
             390 a verified venue's two marks run to x 243 while this chip
             started at x 238: Verified drew 4px under it (audit 2 follow-up).
             The card met the same collision with its market tag and centred
             its no-photo mark (`.nf-pcard__nophoto`); this is that answer.
             Nothing else sits at the centre (the arrows are at the sides from
             `sm`, the dots are hidden for stand-in plates), and it lets a tap
             through to the lightbox under it. */
          className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-[var(--nf-radius-xs)] nf-media-chip nf-media-chip--muted px-sm py-2xs font-medium"
        >
          {t.catalogue.card.noPhotos}
        </p>
      )}
      {count > 0 && (
        <p
          data-testid="gallery-counter"
          /* `--nf-radius-sm`, the same 28px-plate ratio as the stand-in chip
             above it. See the note there. */
          className="nf-numeric absolute bottom-12 right-3 z-10 rounded-[var(--nf-radius-xs)] nf-media-chip px-sm py-2xs font-semibold sm:bottom-14 sm:right-4"
        >
          <UiIcon name="picture" size={16} className="mr-2xs inline-block align-[-2px]" />
          <span className="sr-only">Photo </span>
          {Math.min(active + 1, count)}/{count}
        </p>
      )}

      {panes.length > 1 && (
        <>
          {/* Pointer devices get arrows; touch gets the swipe it already had. */}
          <button
            type="button"
            onClick={() => go(active - 1)}
            disabled={active === 0}
            aria-label="Previous photo"
            className="absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center nf-btn nf-btn--glass nf-btn--sm nf-btn--icon text-[var(--nf-content-on-media)] disabled:opacity-0 sm:grid"
          >
            <UiIcon name="arrow-left" size={16} />
          </button>
          <button
            type="button"
            onClick={() => go(active + 1)}
            disabled={active === panes.length - 1}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center nf-btn nf-btn--glass nf-btn--sm nf-btn--icon text-[var(--nf-content-on-media)] disabled:opacity-0 sm:grid"
          >
            <UiIcon name="arrow-right" size={16} />
          </button>

          {/*
            THE DOTS ONLY WHERE THERE IS NO COUNTER.

            The render states the position as "1/12" at the photograph's
            bottom right and draws no dots at all. Ours drew both, and the
            centred dot row ran straight through the "Verified" pill at the
            bottom left, which is the collision in the founder's shot. Where
            a counter exists it is the one statement of position; the dots
            stay for a pane run that has no count to show, which is the
            stand-in plates.
          */}
          <ul
            className={`pointer-events-none absolute bottom-13 left-1/2 z-10 -translate-x-1/2 items-center gap-2xs sm:bottom-15 ${
              count > 0 || standIn ? "hidden" : "flex"
            }`}
            aria-hidden="true"
          >
            {panes.map((photo, i) => (
              <li
                key={photo ?? `dot-${i}`}
                className={`h-1.5 rounded-full transition-all motion-reduce:transition-none ${
                  i === active
                    ? "w-4 bg-[var(--nf-content-on-media)]"
                    : "w-1.5 bg-[var(--nf-content-on-media-muted)]"
                }`}
              />
            ))}
          </ul>
        </>
      )}
    </section>
    {floatingBack && (
      <button
        type="button"
        onClick={back}
        aria-label={t.common.back}
        aria-hidden={heroBackGone ? undefined : true}
        tabIndex={heroBackGone ? undefined : -1}
        inert={!heroBackGone}
        data-nav-back=""
        data-testid="floating-back"
        data-shown={heroBackGone ? "" : undefined}
        className="nf-floating-back grid h-11 w-11 place-items-center nf-btn nf-btn--glass nf-btn--sm nf-btn--icon"
      >
        <UiIcon name="arrow-left" size={16} />
      </button>
    )}
    {/*
      NO THUMBNAIL STRIP. The render has none: the hero is the photography
      and the counter says how many there are. Ours drew four tiles under
      the hero and, on a listing whose photographs had not resolved, four
      empty dark boxes, which the founder photographed. The panes still
      swipe, the counter still counts, and tapping one still opens the
      lightbox at that photograph.
    */}
    </>
  );
}
