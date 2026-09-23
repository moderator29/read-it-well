"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode, RefObject } from "react";
import { useOverlay } from "@/lib/ui/use-overlay";
import { useClientMount } from "@/lib/ui/client-mount";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";

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

/**
 * THE HEIGHT OF WHAT THE PERSON CAN ACTUALLY SEE, which is not `innerHeight`.
 *
 * `window.innerHeight` is the LAYOUT viewport. On iOS and on Android Chrome the
 * software keyboard does not change it: it slides a panel over the bottom of
 * the page and the number stays exactly what it was. `visualViewport.height` is
 * the part still visible above the keyboard, and it is the number every
 * calculation in this file wants.
 *
 * The detents are fractions of "the screen", and the dismissal threshold is the
 * lowest detent plus twelve per cent of "the screen". With a keyboard up and
 * `innerHeight` in hand, both are computed against a viewport that is roughly
 * half hidden, so the threshold sits well below the visible area: the sheet
 * cannot be dragged far enough to reach it, and drag-to-dismiss stops working
 * at the moment a finger is already near the bottom of the screen.
 *
 * The wallet's withdraw and transfer drawers are a form sheet with a focused
 * amount field, which means the keyboard is up for the whole of the
 * interaction. This is not an edge case on those two screens, it is the only
 * case.
 *
 * `innerHeight` stays as the fallback because `visualViewport` is absent in
 * jsdom and in older WebViews, and on a desktop browser the two agree.
 *
 * NOT VERIFIED ON A REAL DEVICE. The finding this closes says the same thing
 * about itself, and it has not been run on a phone with a keyboard up.
 * What is verified is that the arithmetic now reads the visible height where a
 * visible height exists.
 */
function viewportHeight(): number {
  if (typeof window === "undefined") return 0;
  return window.visualViewport?.height ?? window.innerHeight;
}

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
  initialFocus,
  footer,
  closeLabel,
  reset,
  apply,
  children,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  title: string;
  detents?: number[];
  hideTitle?: boolean;
  /**
   * THE FILTER SHEET'S ANATOMY, as three opt-in props. The search render
   * draws a header row (title left, a glass close square right) and a footer
   * row (Reset in glass beside Apply in the lit primary). Nothing renders
   * unless asked, so the thirty-nine sheets standing on this file keep their
   * look.
   *
   * `closeLabel` is the close control's accessible name and its on switch: a
   * string rather than a boolean because an unlabelled X is invisible to a
   * screen reader and this platform ships four locales.
   */
  closeLabel?: string;
  /** The footer's quiet action. Label is the localised word. */
  reset?: { label: string; onClick(): void; disabled?: boolean };
  /** The footer's lit primary. `loading` keeps the label and shows the line. */
  apply?: { label: string; onClick(): void; disabled?: boolean; loading?: boolean };
  /**
   * What the keyboard lands on when the sheet opens. Defaults to the first
   * focusable node, which is very often the wrong one. See the note on the
   * focus effect below.
   */
  initialFocus?: RefObject<HTMLElement | null>;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

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

  /*
   * The client latch for `createPortal`, and it was the FIFTH hand-rolled copy.
   *
   * `createPortal` needs `document.body`, which does not exist while rendering
   * on the server, so this component must return `null` on the server AND on
   * the first client render - if the two disagree, React throws a hydration
   * mismatch on the most-used overlay in the product.
   *
   * This stood here as `useState(false)` plus `useEffect(() => setMounted(true))`
   * under an `eslint-disable` for `react-hooks/set-state-in-effect`, with a long
   * argument that the rule was right in general and wrong here. The argument was
   * sound about the REQUIREMENT and wrong about the only way to meet it:
   * `useSyncExternalStore` asks exactly this question through the channel React
   * provides for it, with no state to set, no second render scheduled and no
   * disable comment to maintain. Four other components had already moved.
   *
   * The disable is gone with the code it excused, which is the point worth
   * keeping: a well-argued suppression is still a suppression, and four files
   * agreeing on a better answer is stronger evidence than any argument written
   * beside the worse one.
   */
  const mounted = useClientMount();

  /*
   * RESETTING ON `open` HAPPENS DURING RENDER NOW, NOT IN TWO EFFECTS.
   *
   * `setEntered(false)` sat in the entrance effect and `setOffset(0)` sat in the
   * focus effect, so opening the sheet took an extra render pass each and the
   * two halves of one reset lived sixty lines apart. Both are the same thing:
   * state that has to go back to its initial value when a PROP changes, which
   * React documents as an adjustment made while rendering, guarded by comparing
   * against the previous value. It is cheaper than an effect - React re-runs
   * this component before touching the DOM, so nothing paints the stale value -
   * and it puts the whole reset in one place where it can be read at once.
   *
   * The guard is what makes it safe: without `prevOpen !== open` this is an
   * infinite render loop.
   *
   * `entered` must be false at the moment `open` becomes true, and that is the
   * load-bearing half. The transition needs a frame at the start value to
   * animate from; see the note above. Doing it here rather than in the effect
   * below also closes the gap where a fast reopen could have committed
   * `entered: true` from the previous cycle before the reset ran.
   */
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    setEntered(false);
    setOffset(0);
  }

  useEffect(() => {
    if (!open) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [open]);

  /*
   * The detents as a stable primitive, and this is not tidiness.
   *
   * `detents` is a prop with an ARRAY DEFAULT, so an unspecified one is a fresh
   * `[0.92]` on every render and a specified one is usually an inline literal at
   * the call site, which is also fresh every render. Anything memoised on it is
   * therefore memoised on nothing.
   *
   * That was harmless while `heights` was only called from `onPointerUp`. It
   * stopped being harmless the moment the visual-viewport effect below took it
   * as a dependency: `setOffset` and `setDragging` re-render on every
   * pointermove, so the effect would have removed and re-added two listeners on
   * every frame of every drag. A string of the sorted values compares by value,
   * so `heights` is stable while the detents are, and the subscription happens
   * once per open.
   */
  const detentKey = [...detents].sort((a, b) => a - b).join(",");

  const heights = useCallback(() => {
    const vh = viewportHeight();
    const sorted = detentKey ? detentKey.split(",").map(Number) : [];
    const tallest = sorted[sorted.length - 1] ?? 0.92;
    // Offset 0 is the tallest detent. A shorter detent sits further DOWN, so
    // its offset is the difference in height, in pixels.
    return { vh, offsets: sorted.map((d) => (tallest - d) * vh).sort((a, b) => a - b) };
  }, [detentKey]);

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
    const node = sheetRef.current;
    if (!node) return;
    /*
     * FIRST FOCUS IS THE SHEET'S OPENING SENTENCE, and the default was reading
     * out the exit.
     *
     * `querySelector(FOCUSABLE)` returns the first focusable node in DOM order,
     * and in every drawer on this platform that is the Close button, because
     * Close sits in the header and the header comes first. So opening "Add
     * money" put the keyboard on Close, and a screen reader said "Add money to
     * your wallet, dialog" and then "Close, button": the sheet announces what
     * it is for and then offers to go away.
     *
     * `initialFocus` lets the call site name the node instead. For a form sheet
     * it is the first field; for a result sheet it is the primary action. The
     * default is unchanged, because a sheet that has not thought about it is
     * still better off trapping focus somewhere inside itself than leaving it
     * on the page behind.
     *
     * The ref may be attached to a node that has not rendered, or to one that
     * is disabled while a request is in flight, so this checks the node is
     * still focusable before using it rather than focusing nothing.
     */
    const wanted = initialFocus?.current;
    const target =
      wanted && node.contains(wanted) && !wanted.hasAttribute("disabled")
        ? wanted
        : (node.querySelector<HTMLElement>(FOCUSABLE) ?? node);
    target.focus({ preventScroll: true });
  }, [open, initialFocus]);

  /*
   * THE KEYBOARD CHANGES THE VIEWPORT UNDER A SETTLED SHEET.
   *
   * `heights()` reads the visible height every time it is called, so a drag
   * that starts after the keyboard is already up is computed correctly. What it
   * cannot fix on its own is a sheet that settled at a detent BEFORE the
   * keyboard appeared: its offset is a pixel value derived from the old height,
   * and it stays there while the viewport shrinks around it, so a half-height
   * sheet becomes a nearly-full one or slides most of the way off the bottom.
   *
   * On a focused field that is the ordinary sequence: the sheet opens, it
   * settles, the field takes focus, the keyboard comes up.
   *
   * So it re-settles to the nearest detent for the new height. `scroll` is
   * listened for as well as `resize` because iOS fires only `scroll` when the
   * visual viewport is panned rather than resized, and the offsets move either
   * way. Nothing here runs when the sheet is closed or while a finger is down:
   * re-settling mid-drag would fight the drag.
   */
  useEffect(() => {
    const vv = typeof window === "undefined" ? null : window.visualViewport;
    if (!open || !vv) return;
    const resettle = () => {
      if (drag.current) return;
      const { offsets } = heights();
      setOffset((current) =>
        offsets.reduce((best, o) => (Math.abs(o - current) < Math.abs(best - current) ? o : best), 0),
      );
    };
    vv.addEventListener("resize", resettle);
    vv.addEventListener("scroll", resettle);
    return () => {
      vv.removeEventListener("resize", resettle);
      vv.removeEventListener("scroll", resettle);
    };
  }, [open, heights]);

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
        /*
         * The upward resistance above is REAL now, and it was dead code.
         *
         * `onPointerMove` computes a damped negative offset when the sheet is
         * dragged past its tallest detent, and this line clamped it to zero, so
         * the resistance the comment described resisted nothing: the surface
         * simply did not move. A rubber band that does not band is worse than
         * none, because the sheet reads as stuck.
         *
         * The clamp is kept as a floor on the DAMPED value rather than on the
         * raw one, so the surface can lift by at most a quarter of the overdrag
         * and cannot be torn off the top of the screen.
         */
        style={{ ["--nf-sheet-y" as string]: `${Math.max(-56, offset)}px` }}
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
        {closeLabel ? (
          <div className="nf-sheet__head px-gutter">
            <h2
              id={titleId}
              className={
                hideTitle
                  ? "sr-only"
                  : "min-w-0 text-[length:var(--nf-text-h4)] font-bold tracking-tight text-[var(--nf-content-primary)]"
              }
            >
              {title}
            </h2>
            <button
              type="button"
              aria-label={closeLabel}
              onClick={() => onOpenChange(false)}
              className="nf-icon-btn nf-icon-btn--glass"
            >
              <UiIcon name="close" size={20} />
            </button>
          </div>
        ) : (
          <h2
            id={titleId}
            className={
              hideTitle
                ? "sr-only"
                : "shrink-0 px-gutter pb-sm text-[length:var(--nf-text-body-lg)] font-bold tracking-tight text-[var(--nf-content-primary)]"
            }
          >
            {title}
          </h2>
        )}
        <div className="nf-sheet__body px-gutter pb-lg">{children}</div>
        {reset || apply ? (
          <div className="nf-sheet__foot px-gutter">
            {reset ? (
              <Button variant="glass" size="lg" full disabled={reset.disabled} onClick={reset.onClick}>
                {reset.label}
              </Button>
            ) : (
              <span aria-hidden="true" />
            )}
            {apply ? (
              <Button
                variant="primary"
                size="lg"
                full
                glow
                disabled={apply.disabled}
                loading={apply.loading}
                onClick={apply.onClick}
              >
                {apply.label}
              </Button>
            ) : null}
          </div>
        ) : null}
        {footer ? <div className="shrink-0 px-gutter pb-md">{footer}</div> : null}
      </div>
    </>,
    document.body,
  );
}
