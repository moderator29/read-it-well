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
import type { CSSProperties, ReactNode, TouchEvent as ReactTouchEvent } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { useOverlay } from "@/lib/ui/use-overlay";
import { readSheetMarker } from "@/lib/ui/use-sheet-history";
import type { ListingKind } from "@/lib/listings/types";
import { PhotoFrame } from "./PhotoFrame";
import { useClientMount } from "@/lib/ui/client-mount";

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
  kind,
  children,
}: {
  title: string;
  /** Photo URLs, best first. */
  photos: string[];
  hue: number;
  /**
   * Which market this is, so the frame drawn behind a missing photograph is a
   * drawing of THIS kind of place rather than the same city skyline every
   * listing used to get. See `MediaFrame`.
   */
  kind: ListingKind;
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
          kind={kind}
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
  kind,
  startIndex,
  onClose,
}: {
  title: string;
  photos: string[];
  hue: number;
  kind: ListingKind;
  startIndex: number;
  onClose(): void;
}) {
  const track = useRef<HTMLDivElement | null>(null);
  const surface = useRef<HTMLDivElement | null>(null);
  /* One hook, four call sites. This was `useState(false)` plus
     `useEffect(() => setMounted(true), [])` in this file and in three others,
     which is a second render scheduled for a fact React already knew. See
     `client-mount.ts`. */
  const mounted = useClientMount();
  const [entered, setEntered] = useState(false);
  const [active, setActive] = useState(startIndex);
  const [broken, setBroken] = useState<Record<number, true>>({});


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
  /*
   * THE VIEWER IS A HISTORY ENTRY, so the way out is always the one a person
   * already knows. Opening pushes an entry on the same address (the App
   * Router's own state spread in, or it reloads on the way back, the same
   * reason `FirstRun` does it), so the browser's back, the iPhone edge swipe
   * and Android's hardware back close the photographs FIRST and leave the
   * listing where it was. Closing from inside (the X, Escape, a swipe down)
   * pops that entry itself, so history never keeps a dead viewer entry that
   * would make the next back press look like it did nothing.
   */
  const pushed = useRef(false);
  /* Read through a ref so a new `onClose` identity from the provider can never
     re-run the effect below and push a second entry. */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!mounted) return;
    try {
      /* Already on our own entry is React's development double-mount, not a
         second opening: pushing again would cost the reader a second back. */
      const current = (window.history.state ?? {}) as Record<string, unknown>;
      if (current.nfPhotoViewer) {
        /* already ours */
      } else if (readSheetMarker(current)) {
        /* Opened from the "Show all" sheet, which closes as this opens. The
           sheet's entry is REUSED rather than stacked on: the sheet's own
           hook only pops its entry while its marker is on top, so pushing
           over it would leave a dead entry behind and cost the reader a
           back press that does nothing. The marker is dropped, so the sheet
           leaves history alone. */
        const { nfSheet: _sheet, ...rest } = current;
        window.history.replaceState({ ...rest, nfPhotoViewer: true }, "");
      } else {
        window.history.pushState({ ...current, nfPhotoViewer: true }, "");
      }
      pushed.current = true;
    } catch {
      /* A sandbox that refuses history still gets the X, Escape and the swipe. */
    }
    const onPop = () => {
      pushed.current = false;
      onCloseRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [mounted]);

  const close = useCallback(() => {
    if (pushed.current && (window.history.state as { nfPhotoViewer?: boolean } | null)?.nfPhotoViewer) {
      pushed.current = false;
      /* popstate above does the actual close, so there is one path out. */
      window.history.back();
      return;
    }
    onClose();
  }, [onClose]);
  useOverlay({ open: mounted, onClose: close, panelRef: surface, autoFocus: false });

  /*
   * SWIPE DOWN TO DISMISS, the gesture every phone photo viewer teaches.
   *
   * The track is `touch-action: pan-x pinch-zoom`, so a sideways swipe is still
   * the browser's own snap scroll and a pinch still zooms, while a vertical drag
   * is left to this handler instead of doing nothing. The photograph follows
   * the finger and the ground fades with the distance; past a quarter of the
   * way (or on a quick flick) it closes, otherwise it springs back. Only
   * `transform` and `opacity` move. Under reduced motion nothing follows the
   * finger: the gesture still closes past the threshold, it just does not
   * animate on the way.
   */
  const [drag, setDrag] = useState(0);
  const gesture = useRef<{ x: number; y: number; t: number; axis: "x" | "y" | null } | null>(null);
  const reduced = useRef(false);
  useEffect(() => {
    reduced.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }, []);
  const onTouchStart = useCallback((event: ReactTouchEvent) => {
    /* Pinched in, a vertical drag is the reader panning the enlarged photo,
       never a dismissal. */
    if (event.touches.length !== 1 || (window.visualViewport?.scale ?? 1) > 1.01) {
      gesture.current = null;
      return;
    }
    const t = event.touches[0]!;
    gesture.current = { x: t.clientX, y: t.clientY, t: performance.now(), axis: null };
  }, []);
  const onTouchMove = useCallback((event: ReactTouchEvent) => {
    const g = gesture.current;
    const t = event.touches[0];
    if (!g || !t || event.touches.length !== 1) return;
    const dx = t.clientX - g.x;
    const dy = t.clientY - g.y;
    if (g.axis === null && Math.hypot(dx, dy) > 8) g.axis = Math.abs(dy) > Math.abs(dx) ? "y" : "x";
    if (g.axis !== "y") return;
    if (!reduced.current) setDrag(Math.max(0, dy));
  }, []);
  const onTouchEnd = useCallback(
    (event: ReactTouchEvent) => {
      const g = gesture.current;
      gesture.current = null;
      if (!g || g.axis !== "y") return;
      const t = event.changedTouches[0];
      const dy = t ? t.clientY - g.y : 0;
      const velocity = dy / Math.max(1, performance.now() - g.t);
      const height = surface.current?.clientHeight ?? 800;
      if (dy > height * 0.22 || (dy > 60 && velocity > 0.6)) {
        close();
        return;
      }
      setDrag(0);
    },
    [close],
  );

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
      data-theme="dark"
      data-open={entered}
      data-dragging={drag > 0 ? "" : undefined}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      style={
        drag > 0
          ? ({
              "--nf-viewer-drag": `${drag}px`,
              "--nf-viewer-fade": String(1 - Math.min(drag / 520, 0.75)),
              "--nf-viewer-scale": String(1 - Math.min(drag / 3000, 0.12)),
            } as CSSProperties)
          : undefined
      }
      className={[
        // Above the Sheet primitive's 80/81, so a photo opened from the
        // "Show all" sheet is never painted behind the sheet it came from.
        "nf-photo-viewer fixed inset-0 z-[90] outline-none",
        "transition-opacity duration-200 ease-out motion-reduce:transition-none",
        "motion-safe:transition-[opacity,transform] motion-safe:duration-200",
        entered ? "opacity-100 motion-safe:scale-100" : "opacity-0 motion-safe:scale-[0.98]",
      ].join(" ")}
    >
      <div
        ref={track}
        onScroll={onScroll}
        className="nf-scroll-x nf-photo-viewer__track flex h-full w-full snap-x snap-mandatory"
      >
        {photos.map((photo, i) => (
          <div
            key={`${photo}-${i}`}
            className="relative h-full w-full shrink-0 snap-center snap-always overflow-hidden"
          >
            {broken[i] ? (
              <PhotoFrame hue={hue} index={i} kind={kind} />
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
      <div className="nf-photo-viewer__chrome pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-sm">
        <button
          type="button"
          onClick={close}
          aria-label="Close photos"
          data-testid="lightbox-close"
          className="pointer-events-auto grid h-11 w-11 place-items-center nf-btn nf-btn--glass nf-btn--sm nf-btn--icon text-[var(--nf-content-on-media)] transition-transform active:scale-90 motion-reduce:transition-none"
        >
          <UiIcon name="close" size={20} />
        </button>
        <p className="nf-numeric pointer-events-none rounded-[var(--nf-radius-xs)] nf-media-chip nf-media-chip--caption px-sm py-xs font-semibold">
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
            className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center nf-btn nf-btn--glass nf-btn--sm nf-btn--icon text-[var(--nf-content-on-media)] disabled:opacity-0 sm:grid"
          >
            <UiIcon name="arrow-left" size={20} />
          </button>
          <button
            type="button"
            onClick={() => go(active + 1)}
            disabled={active === photos.length - 1}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center nf-btn nf-btn--glass nf-btn--sm nf-btn--icon text-[var(--nf-content-on-media)] disabled:opacity-0 sm:grid"
          >
            <UiIcon name="arrow-right" size={20} />
          </button>
        </>
      )}
    </div>,
    document.body,
  );
}
