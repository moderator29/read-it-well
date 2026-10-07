"use client";

import { useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { animate, useMotionValue } from "framer-motion";
import "@/app/css/ported.css";
import { useMotionGate } from "@/components/motion/useMotionGate";
import { Button } from "@/components/ui/Button";
import type { UiIconName } from "@/design-system/icons/UiIcon";
import { cn } from "@/lib/cn";
import { SPRING_SETTLE, springFor, useDrive } from "./ported-motion";

/**
 * BATCH TRAY: THE BULK-ACTION BAR FOR MULTI-SELECT.
 *
 * Ported from the founder's component library (docs/design/COMPONENT_LIBRARY.md,
 * "Batch gesture tray"). It appears when something is selected and goes away when
 * nothing is.
 *
 * WHERE: admin queues, saved items, photo management and the bulk actions the
 * host workspace already has. The owner of each of those screens owns the
 * selection and the actions; this draws the tray and reports what was chosen.
 *
 * WHAT IT DOES NOT DECIDE. The tray never counts, never pluralises and never
 * decides whether an action is allowed. `count` and the formatted `countLabel`
 * come from the caller (so four locales and real plural rules stay with the
 * i18n layer), and an action that cannot run on this selection is passed
 * `disabled`. Bulk actions on money (a payout, a refund, a ledger entry) do not
 * belong in a tray at all: they are `DragToConfirm` actions, one at a time.
 *
 * THE GESTURE. Drag the grip down and the tray follows your finger; let go past
 * 56px (or with a downward flick) and it clears the selection, otherwise it
 * springs back. Clearing a selection is harmless and one tap to redo, so it is
 * the right thing to give a gesture. It is never the only way: Clear is a real
 * button, and Escape inside the tray clears too.
 *
 * A DESTRUCTIVE ACTION IS NEVER ONE TAP. An action with `tone: "danger"` renders
 * as the product's danger button and the caller is expected to put its own
 * confirmation behind `onSelect` (a sheet, or `DragToConfirm` if it is
 * irreversible). The tray also never places a danger action flush beside the
 * lone primary, since it has no primary: every action is the quiet glass button,
 * so nothing here competes with the screen's own primary.
 *
 * LAYOUT AND MOTION. Fixed above the floating dock using the toast host's
 * clearance (`--nf-tabbar-clearance`), so it never covers the dock; at the
 * bottom edge on a wide screen where the dock is a side rail. Open and closed
 * are a data attribute and the stylesheet's: while nothing is selected it is
 * below the screen, `visibility: hidden` and `inert`, so it costs nothing and
 * cannot be tabbed into; selecting rises it on `land` and clearing sends it
 * away on `leave`, a known track, so CSS. The only framer-motion is the grip's
 * drag: a `useMotionValue` that the surface follows one to one, and a release
 * short of the threshold springs back from wherever the finger left it
 * (interruptible). The value is written into the surface by `useDrive`
 * (ported-motion.ts) rather than through an `m` element, which needs a feature
 * bundle the platform does not load (D49.1), and the tray must be fully usable
 * from its first frame. Pointer events, not framer's `drag` prop, for the same
 * reason.
 * Quiet readers (system reduced motion, Calm, Off) get an instant appear,
 * disappear and snap-back.
 *
 * ANNOUNCING. `countLabel` is in a polite live region, so each change in the
 * selection is read once as the number changes.
 *
 * SHAPE. An Island-weight surface at radius 26 (the sheet's glass panel); its
 * buttons are the product's radius-14 buttons at the 44px rung; Clear is a
 * circular icon control.
 */

export type BatchAction = {
  id: string;
  label: string;
  icon?: UiIconName;
  onSelect: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
};

/** Downward travel, in px, past which letting go clears the selection. */
const DISMISS_AT = 56;

/* Module level and stable, as `useDrive` requires. */
const writeSurface = (el: HTMLElement, y: number) => {
  el.style.transform = y === 0 ? "" : `translate3d(0, ${y}px, 0)`;
};

export function BatchTray({
  count,
  countLabel,
  label,
  clearLabel,
  onClear,
  actions,
  className,
  "data-testid": testId,
}: {
  /** How many items are selected. The tray is open when this is above zero. */
  count: number;
  /** The caller's formatted sentence for the count, already localised. */
  countLabel: string;
  /** The toolbar's accessible name. */
  label: string;
  clearLabel: string;
  onClear: () => void;
  actions: readonly BatchAction[];
  className?: string;
  "data-testid"?: string;
}) {
  const open = count > 0;
  const { quiet } = useMotionGate();
  const dragY = useMotionValue(0);
  const surfaceRef = useDrive<HTMLDivElement, number>(dragY, writeSurface);
  const gesture = useRef<{ startY: number; from: number; lastY: number; lastT: number; v: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragY.stop();
    gesture.current = { startY: e.clientY, from: dragY.get(), lastY: e.clientY, lastT: e.timeStamp, v: 0 };
    setDragging(true);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g) return;
    const dt = e.timeStamp - g.lastT;
    if (dt > 0) g.v = (e.clientY - g.lastY) / dt;
    g.lastY = e.clientY;
    g.lastT = e.timeStamp;
    const dy = g.from + e.clientY - g.startY;
    /* Down follows the finger; up resists, a quarter of the travel, capped. */
    dragY.set(dy >= 0 ? dy : Math.max(-12, dy / 4));
  };

  const finish = (cancelled: boolean, at: number) => {
    const g = gesture.current;
    gesture.current = null;
    setDragging(false);
    if (!g) return;
    /* A finger that rested before lifting is not throwing. */
    if (at - g.lastT > 80) g.v = 0;
    const y = dragY.get();
    if (!cancelled && (y > DISMISS_AT || (y > 16 && g.v > 0.6))) {
      onClear();
      /* It leaves from where the finger let go; the next selection starts home. */
      animate(dragY, 0, { duration: 0 });
      return;
    }
    animate(dragY, 0, springFor(quiet, SPRING_SETTLE));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Escape" || !open) return;
    e.stopPropagation();
    onClear();
  };

  return (
    <div
      role="toolbar"
      aria-label={label}
      className={cn("nf-batch", className)}
      data-open={open || undefined}
      data-dragging={dragging || undefined}
      data-testid={testId}
      inert={!open}
      onKeyDown={onKeyDown}
    >
      <div ref={surfaceRef} className="nf-batch__surface">
        <div
          className="nf-batch__grip"
          aria-hidden="true"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => finish(false, e.timeStamp)}
          onPointerCancel={(e) => finish(true, e.timeStamp)}
        />
        <div className="nf-batch__row">
          <p className="nf-batch__count" role="status" aria-live="polite">
            {open ? countLabel : ""}
          </p>
          <div className="nf-batch__actions">
            {actions.map((action) => (
              <Button
                key={action.id}
                variant={action.tone === "danger" ? "danger" : "glass"}
                size="sm"
                leadingIcon={action.icon}
                disabled={action.disabled}
                onClick={action.onSelect}
              >
                {action.label}
              </Button>
            ))}
          </div>
          <Button variant="icon" round aria-label={clearLabel} leadingIcon="close" onClick={onClear} />
        </div>
      </div>
    </div>
  );
}
