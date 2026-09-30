"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useOverlay } from "@/lib/ui/use-overlay";
import { WholePrefetchLink } from "@/components/app/WholePrefetchLink";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { useUnreadConversations } from "@/lib/messages/unread-live";

export type DockMoreItem = { href: string; label: string; icon: UiIconName };

/** The tray row that carries the live unread-conversations count. */
const MESSAGES_HREF = "/messages";

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
  unreadLabel,
  unreadPreview,
}: {
  items: DockMoreItem[];
  label: string;
  active: string;
  /**
   * B1: "{label}, {count} unread conversations". With it, and a Messages row
   * in the tray (a member's tray), the button and the row carry the live
   * unread-conversations count (`lib/messages/unread-live.ts`).
   */
  unreadLabel?: string;
  /** Dev preview only: a fixed figure instead of the live read. */
  unreadPreview?: number;
}) {
  const [openOn, setOpenOn] = useState<string | null>(null);
  /* Open is remembered against the route it was opened on, so arriving
     somewhere closes the tray without an effect that sets state. */
  const open = openOn === active;
  const trayId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  /*
   * F-15: THE TRAY IS AN OVERLAY LIKE EVERY OTHER. It handled Escape and a tap
   * outside by itself, and took no part in `useOverlay`, so the Android back
   * button (`lib/native/back-button.ts`, which asks "is an overlay up?" of
   * the body lock that hook holds) could not see it: back left the page with
   * the tray still open. Registering it gives it the shared Escape (the same
   * path the back button dispatches), the body lock and focus return. It
   * keeps its own focus: opening it does not move the cursor into the tray.
   */
  const close = useCallback(() => {
    setOpenOn(null);
    button.current?.focus();
  }, []);
  useOverlay({ open, onClose: close, panelRef: root, autoFocus: false });

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpenOn(null);
    };
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  /*
   * B1: THE LIVE UNREAD COUNT. Messages lives in this tray, so the count of
   * conversations waiting on the reader rides the button (a small brand
   * count, no container behind any tab) and the Messages row (the shared
   * `count` badge). Real time: the store re-reads on every message change
   * the reader may see, on return to the tab and on navigation.
   */
  const hasMessages = unreadLabel !== undefined && items.some((item) => item.href === MESSAGES_HREF);
  const live = useUnreadConversations(hasMessages && unreadPreview === undefined, active);
  const unread = hasMessages ? (unreadPreview ?? live ?? 0) : 0;
  const unreadText = unread > 99 ? "99+" : String(unread);
  const buttonLabel =
    unread > 0 && unreadLabel ? unreadLabel.replace("{label}", label).replace("{count}", String(unread)) : label;

  const activeItem = items.find((item) => {
    const path = item.href.split("?")[0]!;
    return active === path || active.startsWith(`${path}/`);
  });

  return (
    <div ref={root} className="nf-dockmore" data-open={open || undefined}>
      <ul id={trayId} className="nf-dockmore__tray" hidden={!open} aria-label={label}>
        {items.map((item, index) => (
          <li key={item.href} style={{ "--nf-i": index } as React.CSSProperties}>
            {/* Fetched whole as the tray opens (it is `hidden` until then, and
                Next prefetches only what is on screen), so the page a reader
                picks is already here: each is 10 to 25 KB on the wire. */}
            <WholePrefetchLink
              href={item.href}
              onClick={() => setOpenOn(null)}
              aria-current={item === activeItem ? "page" : undefined}
              aria-label={
                item.href === MESSAGES_HREF && unread > 0 && unreadLabel
                  ? unreadLabel.replace("{label}", item.label).replace("{count}", String(unread))
                  : undefined
              }
              className="nf-dockmore__item"
            >
              <span className="nf-dockmore__glyph" aria-hidden="true">
                {/* Line glyphs, the side navigation's own set (the founder,
                    29 September 2026): the tray is navigation, and the
                    glass objects it drew read as a second icon family. */}
                <UiIcon name={item.icon} size="md" />
              </span>
              <span className="nf-dockmore__label">{item.label}</span>
              {item.href === MESSAGES_HREF && unread > 0 ? (
                <span className="nf-badge nf-badge--count nf-numeric nf-dockmore__count" aria-hidden="true">
                  {unreadText}
                </span>
              ) : null}
            </WholePrefetchLink>
          </li>
        ))}
      </ul>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={trayId}
        aria-label={buttonLabel}
        onClick={() => setOpenOn(open ? null : active)}
        className="nf-dock-island nf-dockmore__button"
        data-lit={activeItem ? true : undefined}
      >
        <span className="nf-dockmore__icon nf-dockmore__icon--grid" aria-hidden="true">
          <UiIcon name="grid" size="md" filled weight="bold" />
        </span>
        <span className="nf-dockmore__icon nf-dockmore__icon--close" aria-hidden="true">
          <UiIcon name="close" size="md" />
        </span>
        {unread > 0 ? (
          /* key: a new figure re-mounts the mark, so it pops once (CSS). */
          <span key={unreadText} className="nf-dockmore__unread nf-numeric" aria-hidden="true">
            {unreadText}
          </span>
        ) : null}
      </button>
    </div>
  );
}
