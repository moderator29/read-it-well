"use client";

import Image from "next/image";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { useOverlay } from "@/lib/ui/use-overlay";
import { PhotoFrame } from "./PhotoFrame";

/**
 * The listing lightbox.
 *
 * Tapping a listing photograph used to do nothing at all - not in the hero, not
 * anywhere else on the platform. This is the one surface that opens the
 * photography full screen, and it is shared rather than duplicated: the hero and
 * the photo grid both sit under one provider and call `open(index)`, so a single
 * viewer instance is mounted per page and the two can never disagree about which
 * photo is showing.
 *
 * It behaves the way a native photo viewer behaves: the track is a real
 * scroll-snapping row so a swipe is the browser's own, arrow keys move between
 * frames, Escape closes, page scroll is locked while it is open, and focus goes
 * back to whatever opened it. The entrance is a fade plus a small scale, and
 * under `prefers-reduced-motion` it collapses to the fade alone.
 */

type ViewerApi = {
  /** Opens the viewer on a given photo index. No-op when there is nothing to show. */
  open(index: number): void;
};

const PhotoViewerContext = createContext<ViewerApi | null>(null);

/** The viewer is optional: a listing with no photography renders no provider. */
export function usePhotoViewer(): ViewerApi | null {
  return useContext(PhotoViewerContext);
}

export function PhotoViewerProvider({
  title,
  photos,
  hue,
  children,
}: {
  title: string;
  /** Photo URLs, best first. */
  photos: string[];
  hue: number;
  children: ReactNode;
}) {
  const [index, setIndex] = useState<number | null>(null);

  const api = useMemo<ViewerApi>(
    () => ({
      open(next: number) {
        if (photos.length === 0) return;
        setIndex(Math.max(0, Math.min(photos.length - 1, next)));
      },
    }),
    [photos.length],
  );

  return (
    <PhotoViewerContext.Provider value={api}>
      {children}
      {index !== null && (
        <Lightbox
          title={title}
          photos={photos}
          hue={hue}
          startIndex={index}
          onClose={() => setIndex(null)}
        />
      )}
    </PhotoViewerContext.Provider>
  );
}

const FOCUSABLE = 'button:not([disabled]),[tabindex]:not([tabindex="-1"])';

function Lightbox({
  title,
  photos,
  hue,
  startIndex,
  onClose,
}: {
  title: string;
  photos: string[];
  hue: number;
  startIndex: number;
  onClose(): void;
}) {
  const track = useRef<HTMLDivElement | null>(null);
  const surface = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const [active, setActive] = useState(startIndex);
  const [broken, setBroken] = useState<Record<number, true>>({});

  useEffect(() => setMounted(true), []);

  /*
   * The surface mounts at its closed state and flips open on the next frame, so
   * the transition has a starting frame to run from. Without it the browser
   * paints the end state immediately and the viewer materialises rather than
   * arriving - the same reason the Sheet primitive does this.
   */
  useEffect(() => {
    if (!mounted) return;
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [mounted]);

  /*
   * Escape, the Tab trap, the scroll lock and the focus return, from the one
   * shared implementation rather than a fourth copy of three quarters of it.
   *
   * The lock is the reason this matters here in particular. A lightbox opens
   * from inside the "Show all photos" sheet, which is already holding the page
   * still. The version this replaces set `body.style.overflow` outright and
   * restored what it had captured, so closing the photo handed scrolling back
   * to a page nobody could see, underneath a sheet that was still open. The
   * hook counts its openers, so the page only moves again when the last one
   * has gone.
   */
  const close = useCallback(() => onClose(), [onClose]);
  useOverlay({ open: mounted, onClose: close, panelRef: surface, autoFocus: false });

  /* First focus, with `preventScroll`: the viewer covers the page it opened
     from, and letting the browser scroll to the control it just focused would
     move that page behind it. Putting focus BACK on close is the hook's, which
     captured the opener before this ran. */
  useEffect(() => {
    if (!mounted) return;
    const node = surface.current;
    const first = node?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? node)?.focus({ preventScroll: true });
  }, [mounted]);

  /* The track opens on the photo that was tapped, not on the first one. */
  useEffect(() => {
    if (!mounted) return;
    const el = track.current;
    if (!el) return;
    el.scrollLeft = startIndex * el.clientWidth;
  }, [mounted, startIndex]);

  const go = useCallback((next: number) => {
    const el = track.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(el.children.length - 1, next));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
    setActive(clamped);
  }, []);

  /* The arrows, which are this viewer's own and belong to nothing else. Escape
     and Tab are handled by `useOverlay` above. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        go(active + 1);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(active - 1);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [active, go]);

  const onScroll = useCallback(() => {
    const el = track.current;
    if (!el || el.clientWidth === 0) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    setActive((current) => (current === next ? current : next));
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      ref={surface}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} photos`}
      tabIndex={-1}
      data-testid="listing-lightbox"
      data-open={entered}
      className={[
        // Above the Sheet primitive's 80/81, so a photo opened from the
        // "Show all" sheet is never painted behind the sheet it came from.
        "fixed inset-0 z-[90] bg-black outline-none",
        "transition-opacity duration-200 ease-out motion-reduce:transition-none",
        "motion-safe:transition-[opacity,transform] motion-safe:duration-200",
        entered ? "opacity-100 motion-safe:scale-100" : "opacity-0 motion-safe:scale-[0.98]",
      ].join(" ")}
    >
      <div
        ref={track}
        onScroll={onScroll}
        className="nf-scroll-x flex h-full w-full snap-x snap-mandatory"
      >
        {photos.map((photo, i) => (
          <div
            key={`${photo}-${i}`}
            className="relative h-full w-full shrink-0 snap-center snap-always overflow-hidden"
          >
            {broken[i] ? (
              <PhotoFrame hue={hue} index={i} />
            ) : (
              <Image
                src={photo}
                alt={`${title}, photo ${i + 1} of ${photos.length}`}
                fill
                sizes="100vw"
                onError={() => setBroken((prev) => ({ ...prev, [i]: true }))}
                className="object-contain"
              />
            )}
          </div>
        ))}
      </div>

      {/* Chrome sits above the track and clears the notch and the home indicator. */}
      <div className="nf-safe-top pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close photos"
          data-testid="lightbox-close"
          className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-black/55 text-white backdrop-blur-md transition-transform active:scale-90 motion-reduce:transition-none"
        >
          <UiIcon name="close" size={20} />
        </button>
        <p className="nf-numeric pointer-events-none mt-1.5 rounded-full bg-black/55 px-3 py-1.5 text-[0.8125rem] font-semibold text-white backdrop-blur-md">
          <span className="sr-only">Photo </span>
          {active + 1} / {photos.length}
        </p>
      </div>

      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(active - 1)}
            disabled={active === 0}
            aria-label="Previous photo"
            className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-black/55 text-white backdrop-blur-md disabled:opacity-0 sm:grid"
          >
            <UiIcon name="arrow-left" size={20} />
          </button>
          <button
            type="button"
            onClick={() => go(active + 1)}
            disabled={active === photos.length - 1}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-black/55 text-white backdrop-blur-md disabled:opacity-0 sm:grid"
          >
            <UiIcon name="arrow-right" size={20} />
          </button>
        </>
      )}
    </div>,
    document.body,
  );
}
