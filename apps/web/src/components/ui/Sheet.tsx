"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { useOverlay } from "@/lib/ui/use-overlay";

/**
 * The bottom sheet.
 *
 * There were eight hand-rolled sheets on this platform and not one of them had
 * a drag handle, a detent, spring physics, drag-to-dismiss or a focus trap.
 * Several declared `aria-modal="true"` while trapping nothing, which is worse
 * than not claiming it. Two never locked body scroll, so the page behind them
 * moved under your finger. All of them animated in with an 18px fade.
 *
 * On iOS that last detail is the single clearest tell that a screen is a web
 * page rather than an app: real sheets come up from the edge, can be thrown
 * back down, and stop at detents.
 *
 * What this owns, so no call site has to think about it again:
 *   - slide from the bottom edge on a spring, not a fade
 *   - a drag handle that actually drags, tracking the finger 1:1
 *   - detents, with the nearest one chosen on release by position AND velocity,
 *     so a fast flick dismisses even from near the top
 *   - drag-to-dismiss past the lowest detent
 *   - a focus trap, focus restoration, and Escape
 *   - body scroll lock
 *   - the home-indicator inset
 *
 * The last four of those are NOT written here. Escape, the Tab trap, the
 * counted scroll lock and the focus return all come from
 * `lib/ui/use-overlay`, which is the one implementation the whole platform
 * shares. This file kept its own for a while and the two disagreed in the way
 * that matters: this one set `body.style.overflow` outright, so a sheet opened
 * over a drawer handed scrolling back to the page underneath the moment the
 * sheet closed, while the drawer was still up. The hook counts its openers.
 *
 * What is still local is the FIRST focus. This sheet has always focused its
 * first control with `preventScroll`, because a sheet that scrolls the page
 * behind it as it opens is exactly the tell this primitive exists to remove,
 * and the hook has no reason to know that.
 */

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Sheet({
  open,
  onOpenChange,
  title,
  /**
   * Fractions of viewport height, ascending. `[0.5, 0.92]` gives a half-height
   * resting position and a near-full one. The sheet opens at the LAST detent.
   */
  detents = [0.92],
  /** Hides the visible title while keeping it as the accessible name. */
  hideTitle = false,
  footer,
  children,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  title: string;
  detents?: number[];
  hideTitle?: boolean;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  // Drag state is a ref, not state: it changes every pointermove and must not
  // drive a React render per frame.
  const drag = useRef<{ startY: number; startOffset: number; lastY: number; lastT: number; v: number } | null>(
    null,
  );
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  /*
   * `entered` is why the sheet slides instead of appearing.
   *
   * The surface is only in the DOM while open, so it arrives already at its
   * final state. A CSS transition needs a frame at the START value to animate
   * from; with none, the browser paints the end state immediately and the
   * spring never runs - the sheet just materialises, which is precisely the
   * thing this primitive exists to stop.
   *
   * So it mounts closed and flips open on the next animation frame, giving the
   * transition its starting frame. Two frames rather than one because a single
   * rAF can still land inside the same style recalculation in Safari.
   */
  const [entered, setEntered] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [open]);

  const heights = useCallback(() => {
    const vh = typeof window === "undefined" ? 0 : window.innerHeight;
    const sorted = [...detents].sort((a, b) => a - b);
    const tallest = sorted[sorted.length - 1] ?? 0.92;
    // Offset 0 is the tallest detent. A shorter detent sits further DOWN, so
    // its offset is the difference in height, in pixels.
    return { vh, offsets: sorted.map((d) => (tallest - d) * vh).sort((a, b) => a - b) };
  }, [detents]);

  /* Escape, the Tab trap, the counted scroll lock and the focus return, from
     the one shared implementation. `autoFocus` is off because the effect below
     needs `preventScroll`, which the hook does not pass. */
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  useOverlay({ open, onClose: close, panelRef: sheetRef, autoFocus: false });

  /*
   * First focus, and the drag offset reset.
   *
   * `restoreFocus` is still read on the way out, and it is not a duplicate of
   * what the hook does. The hook restores to whatever was focused when it ran;
   * this restores across the open/closed boundary of a sheet that stays mounted
   * while closed. Both land on the opener, and whichever runs second finds
   * focus already there and moves nothing.
   */
  useEffect(() => {
    if (!open) {
      restoreFocus.current?.focus?.();
      restoreFocus.current = null;
      return;
    }
    restoreFocus.current = document.activeElement as HTMLElement | null;
    setOffset(0);
    const node = sheetRef.current;
    if (!node) return;
    const first = node.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? node).focus({ preventScroll: true });
  }, [open]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = {
      startY: e.clientY,
      startOffset: offset,
      lastY: e.clientY,
      lastT: e.timeStamp,
      v: 0,
    };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dt = e.timeStamp - d.lastT;
    if (dt > 0) d.v = (e.clientY - d.lastY) / dt; // px per ms, positive = downward
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;
    // Upward past the tallest detent resists rather than tearing off the top.
    const raw = d.startOffset + (e.clientY - d.startY);
    setOffset(raw < 0 ? raw / 4 : raw);
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (!d) return;

    const { vh, offsets } = heights();
    const dismissAt = (offsets[offsets.length - 1] ?? 0) + vh * 0.12;

    // A fast downward flick dismisses from anywhere. Velocity matters as much
    // as position, which is what makes a sheet feel thrown rather than dragged.
    if (d.v > 0.7 || offset > dismissAt) {
      onOpenChange(false);
      return;
    }
    // Otherwise settle on the nearest detent, biased by the direction of travel.
    const projected = offset + d.v * 90;
    const nearest = offsets.reduce((best, o) =>
      Math.abs(o - projected) < Math.abs(best - projected) ? o : best,
    );
    setOffset(nearest);
  };

  if (!mounted || !open) return null;

  return createPortal(
    <>
      <div
        className="nf-sheet-backdrop"
        data-open={entered}
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="nf-sheet outline-none"
        data-open={entered}
        data-dragging={dragging || undefined}
        style={{ ["--nf-sheet-y" as string]: `${Math.max(0, offset)}px` }}
      >
        {/*
          The grip owns the drag. Putting it on the whole surface would fight
          every scrollable list and every slider inside the sheet.
        */}
        <div
          className="nf-sheet__grip"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-hidden="true"
        />
        <h2
          id={titleId}
          className={
            hideTitle
              ? "sr-only"
              : "shrink-0 px-5 pb-3 text-[1.0625rem] font-bold tracking-tight text-[var(--nf-content-primary)]"
          }
        >
          {title}
        </h2>
        <div className="nf-sheet__body px-5 pb-5">{children}</div>
        {footer ? <div className="shrink-0 px-5 pb-4">{footer}</div> : null}
      </div>
    </>,
    document.body,
  );
}
