"use client";

import { useRef, useState, type ReactNode } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import "@/app/css/catalogue.css";
import "@/app/css/list-views.css";

const REVEAL = 96;
const OPEN_AT = 56;

/**
 * SWIPE LEFT TO REVEAL REMOVE, on touch only (plan item 28).
 *
 * The card follows the finger up to 96px left and rests open past 56px,
 * uncovering one Remove action behind it; a swipe back or a tap anywhere on
 * the open card closes it. A mouse or pen never starts it, and a vertical
 * drag is left to the page (`touch-action: pan-y`), so scrolling a Saved
 * list is exactly what it was. A swipe that moved the card swallows the tap
 * that ends it, so the card's own link does not open by accident.
 *
 * Only `transform` moves. Under reduced motion the card snaps rather than
 * glides (the transition is removed in `list-views.css`). The Remove action
 * is the same one the quiet button under the card calls, so keyboard and
 * screen reader users have it without swiping.
 */
export function SwipeToRemove({
  children,
  onRemove,
  label,
  disabled = false,
}: {
  children: ReactNode;
  onRemove: () => void;
  label: string;
  disabled?: boolean;
}) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; base: number; locked: "x" | "y" | null } | null>(null);
  const moved = useRef(false);

  return (
    <div className="nf-swipe" data-open={dx <= -OPEN_AT || undefined} data-active={dx !== 0 || dragging || undefined}>
      <button
        type="button"
        className="nf-swipe__action"
        onClick={onRemove}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden={dx === 0 || undefined}
      >
        <UiIcon name="trash" size={20} />
        <span>{label}</span>
      </button>
      <div
        className="nf-swipe__card"
        data-dragging={dragging || undefined}
        style={{ transform: dx === 0 ? undefined : `translateX(${dx}px)` }}
        onPointerDown={(event) => {
          if (event.pointerType !== "touch" || disabled) return;
          start.current = { x: event.clientX, y: event.clientY, base: dx, locked: null };
          moved.current = false;
        }}
        onPointerMove={(event) => {
          const s = start.current;
          if (!s) return;
          const mx = event.clientX - s.x;
          const my = event.clientY - s.y;
          if (!s.locked) {
            if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
            s.locked = Math.abs(mx) > Math.abs(my) ? "x" : "y";
            if (s.locked === "x") setDragging(true);
          }
          if (s.locked !== "x") return;
          moved.current = true;
          setDx(Math.max(-REVEAL, Math.min(0, s.base + mx)));
        }}
        onPointerUp={() => {
          const s = start.current;
          start.current = null;
          setDragging(false);
          if (!s || s.locked !== "x") return;
          /* Nothing in a list vibrates (CRAFT_DOCTRINE 6). Opening the row
             only shows Remove; the removal itself is the commit, and it is
             felt there. */
          setDx((now) => (now <= -OPEN_AT ? -REVEAL : 0));
        }}
        onPointerCancel={() => {
          start.current = null;
          setDragging(false);
          setDx(0);
        }}
        onClickCapture={(event) => {
          if (moved.current || dx !== 0) {
            event.preventDefault();
            event.stopPropagation();
            moved.current = false;
            setDx(0);
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
