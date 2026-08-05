"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ListingActions } from "./ListingActions";
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
  photos,
  initialSaved = false,
  backFallback = "/home",
}: {
  listingId: string;
  title: string;
  hue: number;
  /** Photo URLs, best first. May be empty. */
  photos: string[];
  initialSaved?: boolean;
  /** Where back goes when this page was opened directly. */
  backFallback?: string;
}) {
  const router = useRouter();
  const viewer = usePhotoViewer();
  const track = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);
  const [broken, setBroken] = useState<Record<number, true>>({});

  // One pane per photo, and one honest pane when there is no photography yet.
  const panes: (string | null)[] = photos.length > 0 ? photos : [null];
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

  function back() {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) router.back();
    else router.push(backFallback);
  }

  return (
    <section
      aria-label={`${title} photos`}
      data-testid="listing-gallery"
      /*
       * Full bleed at every breakpoint. `-mx-5 md:-mx-8` cancels the shell's own
       * inline padding, and `-mt-8 sm:-mt-10` cancels its top padding so the
       * media starts at the very top of the content area. Once the shell stops
       * welding its 64px header onto this route the same rule puts the hero
       * under the status bar with no further change here.
       */
      className="relative -mx-5 -mt-8 md:-mx-8 sm:-mt-10"
    >
      <div
        ref={track}
        onScroll={onScroll}
        className="nf-scroll-x flex aspect-[4/5] w-full snap-x snap-mandatory sm:aspect-[16/9] lg:aspect-[2/1]"
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
            <PhotoFrame hue={hue} index={i} />
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
        className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-32 bg-gradient-to-b from-black/50 to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-24 bg-gradient-to-t from-black/45 to-transparent"
        aria-hidden="true"
      />

      {/* `nf-safe-top` is padding rather than an offset, so the glass controls
          clear the notch while the photography still runs behind it. */}
      <div className="nf-safe-top pointer-events-none absolute left-3 top-3 z-20 sm:left-4 sm:top-4">
        <button
          type="button"
          onClick={back}
          aria-label="Back"
          className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-black/45 text-white backdrop-blur-md transition-transform active:scale-90 motion-reduce:transition-none"
        >
          <UiIcon name="arrow-left" size={18} />
        </button>
      </div>

      <ListingActions listingId={listingId} title={title} initialSaved={initialSaved} />

      {count > 0 && (
        <p
          data-testid="gallery-counter"
          className="nf-numeric absolute bottom-4 right-3 z-10 rounded-full bg-black/55 px-2.5 py-1 text-[0.75rem] font-semibold text-white backdrop-blur-md sm:bottom-5 sm:right-4"
        >
          <span className="sr-only">Photo </span>
          {Math.min(active + 1, count)} / {count}
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
            className="absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-black/45 text-white backdrop-blur-md disabled:opacity-0 sm:grid"
          >
            <UiIcon name="arrow-left" size={17} />
          </button>
          <button
            type="button"
            onClick={() => go(active + 1)}
            disabled={active === panes.length - 1}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-black/45 text-white backdrop-blur-md disabled:opacity-0 sm:grid"
          >
            <UiIcon name="arrow-right" size={17} />
          </button>

          <ul
            className="pointer-events-none absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 sm:bottom-6"
            aria-hidden="true"
          >
            {panes.map((photo, i) => (
              <li
                key={photo ?? `dot-${i}`}
                className={`h-1.5 rounded-full transition-all motion-reduce:transition-none ${
                  i === active ? "w-4 bg-white" : "w-1.5 bg-white/55"
                }`}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
