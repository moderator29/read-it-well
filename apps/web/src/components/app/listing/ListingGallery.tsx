"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { canGoBackInApp } from "@/lib/ui/history";
import { ListingActions } from "./ListingActions";

/**
 * Listing gallery.
 *
 * The page opens on the photography, edge to edge on phones, with the back
 * control, share and save floating over it and the position counter reading
 * from the real photo count. Panes are a scroll-snapping track, so the swipe is
 * the browser's own: it is smooth on touch, keyboard reachable, and it needs no
 * gesture library.
 *
 * Every pane is painted on the listing's deterministic gradient with the same
 * skyline silhouette the cards use, so a photo that has not arrived, or a CDN
 * that cannot be reached, degrades to a branded frame instead of a broken
 * image. A listing with no photography at all still gets one honest pane.
 */

const HUES: [string, string][] = [
  ["#1E3A8A", "#172554"],
  ["#155E75", "#0F172A"],
  ["#0C4A6E", "#111827"],
  ["#334155", "#0F172A"],
  ["#1E40AF", "#1E1B4B"],
  ["#312E81", "#0F172A"],
];

/** The branded frame under every pane: skyline, horizon light, soft ground. */
function Placeholder({ angle, from, to }: { angle: number; from: string; to: string }) {
  return (
    <div
      className="absolute inset-0"
      style={{ background: `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)` }}
    >
      <svg
        viewBox="0 0 400 300"
        className="absolute inset-0 h-full w-full opacity-70"
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        <path
          d="M0 300V190h34v-52h30v52h28v-84h44v84h26v-40h38v40h30v-66h40v66h34v-30h32v30h30v-46h34v46Z"
          fill="rgba(0,0,0,0.42)"
        />
        <circle cx="322" cy="62" r="26" fill="rgba(255,255,255,0.16)" />
      </svg>
    </div>
  );
}

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
  const track = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);
  const [broken, setBroken] = useState<Record<number, true>>({});

  const [from, to] = HUES[hue % HUES.length] ?? HUES[0]!;
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

  /* Shared with PageHeader and BackButton. This is the control a guest
     actually reaches for on a listing, so it is the one that was throwing away
     the search they arrived from. See `lib/ui/history.ts`. */
  function back() {
    if (canGoBackInApp()) router.back();
    else router.push(backFallback);
  }

  return (
    <section
      aria-label={`${title} photos`}
      data-testid="listing-gallery"
      className="relative -mx-5 -mt-8 sm:mx-0 sm:mt-0"
    >
      <div
        ref={track}
        onScroll={onScroll}
        className="nf-scroll-x flex aspect-[4/3] w-full snap-x snap-mandatory sm:aspect-[16/9] sm:rounded-[var(--nf-radius-lg)]"
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
            <Placeholder angle={i % 2 === 0 ? 150 : 205} from={from} to={to} />
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
          </div>
        ))}
      </div>

      {/* Scrims: the controls sit on light sky at the top and the counter on
          whatever the photograph does at the bottom. Both need their own. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/45 to-transparent sm:rounded-t-[var(--nf-radius-lg)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 to-transparent sm:rounded-b-[var(--nf-radius-lg)]"
        aria-hidden="true"
      />

      <button
        type="button"
        onClick={back}
        aria-label="Back"
        className="absolute left-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-black/45 text-white backdrop-blur-md transition-transform active:scale-90 sm:left-4 sm:top-4"
      >
        <UiIcon name="arrow-left" size={16} />
      </button>

      <ListingActions listingId={listingId} title={title} initialSaved={initialSaved} />

      {count > 0 && (
        <p
          data-testid="gallery-counter"
          className="nf-numeric absolute bottom-3 right-3 z-10 rounded-full bg-black/55 px-2.5 py-1 text-[0.75rem] font-semibold text-white backdrop-blur-md sm:bottom-4 sm:right-4"
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
            className="absolute left-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-black/45 text-white backdrop-blur-md disabled:opacity-0 sm:grid"
          >
            <UiIcon name="arrow-left" size={16} />
          </button>
          <button
            type="button"
            onClick={() => go(active + 1)}
            disabled={active === panes.length - 1}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-black/45 text-white backdrop-blur-md disabled:opacity-0 sm:grid"
          >
            <UiIcon name="arrow-right" size={16} />
          </button>

          <ul
            className="pointer-events-none absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5"
            aria-hidden="true"
          >
            {panes.map((photo, i) => (
              <li
                key={photo ?? `dot-${i}`}
                className={`h-1.5 rounded-full transition-all ${
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
