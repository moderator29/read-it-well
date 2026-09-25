"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

export type DockMoreItem = { href: string; label: string; icon: UiIconName };

/**
 * THE SIXTH SLOT AND THE SUB-NAV IT OPENS (Track M, 25 September 2026).
 *
 * The founder chose the pump.fun bottom bar: a floating capsule with a round
 * button standing apart beside it, and asked for "a sub nav in bottom to make
 * it the 6 icon on bottom nav". The capsule keeps its five slots; this is the
 * sixth, and it opens a tray that rises out of the dock with the destinations
 * that used to be reachable only through the drawer: Messages, Plans, Saved,
 * the Assistant, Agreements, Price Check, Settings and Help.
 *
 * It is a disclosure, not a menu: the tray is a list of ordinary links, so
 * Tab walks it and a screen reader reads it as navigation. Escape, a tap
 * outside and arriving somewhere all close it. The glyph turns from a grid to
 * a close mark so the button says what the next tap will do.
 */
export function DockMore({
  items,
  label,
  active,
}: {
  items: DockMoreItem[];
  label: string;
  active: string;
}) {
  const [openOn, setOpenOn] = useState<string | null>(null);
  /* Open is remembered against the route it was opened on, so arriving
     somewhere closes the tray without an effect that sets state. */
  const open = openOn === active;
  const trayId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenOn(null);
        button.current?.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpenOn(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const activeItem = items.find((item) => {
    const path = item.href.split("?")[0]!;
    return active === path || active.startsWith(`${path}/`);
  });

  return (
    <div ref={root} className="nf-dockmore" data-open={open || undefined}>
      <ul id={trayId} className="nf-dockmore__tray" hidden={!open} aria-label={label}>
        {items.map((item, index) => (
          <li key={item.href} style={{ "--nf-i": index } as React.CSSProperties}>
            <Link
              href={item.href}
              onClick={() => setOpenOn(null)}
              aria-current={item === activeItem ? "page" : undefined}
              className="nf-dockmore__item"
            >
              <span className="nf-dockmore__glyph" aria-hidden="true">
                <UiIcon name={item.icon} size="md" />
              </span>
              <span className="nf-dockmore__label">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={trayId}
        aria-label={label}
        onClick={() => setOpenOn(open ? null : active)}
        className="nf-dock-island nf-dockmore__button"
        data-lit={activeItem ? true : undefined}
      >
        <span className="nf-dockmore__icon nf-dockmore__icon--grid" aria-hidden="true">
          <UiIcon name="grid" size="md" />
        </span>
        <span className="nf-dockmore__icon nf-dockmore__icon--close" aria-hidden="true">
          <UiIcon name="close" size="md" />
        </span>
      </button>
    </div>
  );
}
