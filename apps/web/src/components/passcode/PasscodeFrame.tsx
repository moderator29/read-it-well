"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { VectorMark } from "@/components/auth/VectorMark";
import { useNightDoor } from "@/components/auth/NightDoor";

/** Longer than the startup's own ceiling and release (4,000 + 500ms). */
const STARTUP_WAIT_MS = 5000;

/**
 * THE SCREEN EVERY PASSCODE STEP IS DRAWN ON. docs/PASSCODE.md;
 * MOTION_SYSTEM.md section 6; directive D32.
 *
 * REBUILT 6 OCTOBER 2026. The founder's assessment of the dome, the ring and
 * the glass spheres was that the screen was bad, and it is the screen a
 * returning member sees more than any other. What it became, in the spec's
 * words: the ground quiet and monotone, matching Get Started so the two feel
 * like one family; a small mark at the top, in the same place Get Started's
 * sits (`app/welcome/lockup.ts`); a short line naming who is signing in; and
 * the dots as the subject of the screen. The face in the ring and the padlock
 * went with the dome: one subject per screen, and a ring of photograph above
 * the dots was a second one.
 *
 * THE LOCK IS ALWAYS DARK; THE SETTINGS CARD FOLLOWS THE THEME. The overlay is
 * a night island (`data-theme="dark"`), so the lock reads the same in either
 * theme. The inline frame on the settings screen is an ordinary card on the
 * member's own ground (W11, 6 October 2026: it was a dark island on a light
 * page, which is the thing D28.1 forbids), so it carries no `data-theme` and
 * `passcode.css` gives it a Light answer.
 *
 * `opening` is the door: the right code has landed, and the frame's contents
 * leave so the app can come forward through it (PasscodeLock; the arrival is
 * the startup's own `open` threshold, `app/css/threshold.css`). The mark
 * stays to the last frame, the way the startup's lockup does.
 *
 * `overlay` draws it as a modal <dialog>: `showModal()` puts it in the top
 * layer and makes everything behind it inert (the shell's rail and tab bar
 * included), which is what a lock needs. It is server-rendered `open` so the
 * lock is on screen before any script runs, then promoted to modal once
 * hydrated. Escape is swallowed: a lock cannot be dismissed. Without
 * `overlay` (the settings screen) it is an ordinary section.
 *
 * AFTER THE STARTUP, NOT OVER IT (D32: launching and unlocking are one
 * gesture). The top layer is above every z-index, the startup's overlay
 * included, so promoting the lock at hydration on a locked cold start cut the
 * brand moment off mid-assembly. While the startup is on screen
 * (`data-splash="on"`) the promotion waits for the startup's release, and the
 * door parts onto the lock with the startup's mark settling on the lock's own
 * (`startup.css`). The lock is not any less of a lock in that wait: it is
 * already drawn, open and opaque over the whole screen (`passcode.css` keeps
 * `#main` from carrying it in the page's entrance, so `position: fixed` means
 * the screen), a locked page was never rendered behind it (the gate draws
 * the lock INSTEAD of the page) or is inert behind it (the guard), the
 * shell around it (rail, tab bar, header) is made inert until it is promoted,
 * focus is held inside it, and the startup overlay above it catches every
 * pointer until its door opens. `STARTUP_WAIT_MS` promotes it regardless, should the
 * startup never let go.
 */
export function PasscodeFrame({
  overlay,
  titleId,
  title,
  subtitle,
  children,
  testId,
  opening = false,
}: {
  overlay: boolean;
  titleId: string;
  title: string;
  subtitle?: string | null;
  /** Kept for the callers; the line naming who is signing in is `title`. */
  name?: string;
  /** Kept for the callers; the rebuilt frame draws no photograph. */
  avatarUrl?: string | null;
  /** Kept for the callers; the mark is the vector, not a spaced-capitals name. */
  wordmark?: string;
  children: ReactNode;
  testId?: string;
  /** Kept for the callers; the rebuilt frame has no ring to put a focal in. */
  focal?: "face" | "lock";
  /** The right code landed: the contents leave through the door. */
  opening?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  /* The lock and setting a code are night doors (the founder, 30 September
     2026): dark whatever the theme, chrome included (lib/theme/night-door.ts).
     The settings screen's inline frame follows the theme. */
  useNightDoor(overlay);

  useEffect(() => {
    const dialog = ref.current;
    if (!overlay || !dialog) return;
    const root = document.documentElement;
    const refuse = (event: Event) => event.preventDefault();
    dialog.addEventListener("cancel", refuse);

    let observer: MutationObserver | null = null;
    let wait = 0;
    /* While the startup plays, focus stays inside the lock: it is not modal
       yet, so nothing else makes the shell behind it unreachable by Tab. */
    const hold = (event: FocusEvent) => {
      const target = event.target as Node | null;
      if (target && !dialog.contains(target)) dialog.querySelector<HTMLElement>(".nf-passcode__title")?.focus();
    };
    /*
     * ...and the shell behind it is INERT while it waits (audit A5). Focus
     * held by `hold` stops Tab, but not a screen reader: TalkBack's
     * double-tap activates whatever its cursor is on, and the dock's links
     * are on the page beneath a lock that is not modal yet. So every element
     * beside the lock's line of ancestors (the rail, the tab bar, the header)
     * is made inert, which takes it out of the accessibility tree and out of
     * reach of every pointer and key, exactly as `showModal()` will. Never the
     * startup's overlay, which must keep catching the tap that skips it, and
     * never anything that was inert already (the guard's page): only what
     * this lock set is given back, the moment it is promoted or leaves.
     */
    const shelved: HTMLElement[] = [];
    const shelve = () => {
      for (let node: Element | null = dialog; node && node !== document.body; node = node.parentElement) {
        const parent: Element | null = node.parentElement;
        if (!parent) break;
        for (const sibling of Array.from(parent.children)) {
          if (sibling === node || !(sibling instanceof HTMLElement) || sibling.inert) continue;
          if (sibling.matches("script, style, link, template, .nf-startup")) continue;
          sibling.inert = true;
          shelved.push(sibling);
        }
      }
    };
    const stopWaiting = () => {
      observer?.disconnect();
      observer = null;
      window.clearTimeout(wait);
      document.removeEventListener("focusin", hold, true);
      for (const el of shelved.splice(0)) el.inert = false;
    };
    const promote = () => {
      stopWaiting();
      try {
        if (!dialog.isConnected || dialog.matches(":modal")) return;
        /* Whatever had focus inside the lock keeps it: `showModal` would
           otherwise move it back to the title under a finger mid-code. */
        const active = document.activeElement;
        const kept = active instanceof HTMLElement && dialog.contains(active) ? active : null;
        if (dialog.open) dialog.close();
        dialog.showModal();
        kept?.focus({ preventScroll: true });
      } catch {
        /* An old engine without :modal or showModal keeps the fixed layer. */
      }
    };

    if (root.dataset.splash === "on") {
      shelve();
      /* Where `showModal()` would put focus, the waiting lock puts it too:
         on its title, so a screen reader starts inside the lock. */
      if (!dialog.contains(document.activeElement)) {
        dialog.querySelector<HTMLElement>(".nf-passcode__title")?.focus({ preventScroll: true });
      }
      document.addEventListener("focusin", hold, true);
      observer = new MutationObserver(() => {
        if (root.dataset.splash !== "on") promote();
      });
      observer.observe(root, { attributes: true, attributeFilter: ["data-splash"] });
      wait = window.setTimeout(promote, STARTUP_WAIT_MS);
    } else {
      promote();
    }
    return () => {
      stopWaiting();
      dialog.removeEventListener("cancel", refuse);
    };
  }, [overlay]);

  const body = (
    <>
      <span className="nf-passcode__wash" aria-hidden="true" />
      <header className="nf-passcode__top">
        <VectorMark size={44} label="Vallo" className="nf-passcode__mark" />
      </header>
      <div className="nf-passcode__body">
        {/* The dialog opens with focus on its title, so a screen reader reads
            "Welcome back" first and no key starts out looking pressed. */}
        <h1 id={titleId} className="nf-passcode__title" tabIndex={-1} autoFocus={overlay}>
          {title}
        </h1>
        {subtitle ? <p className="nf-passcode__subtitle">{subtitle}</p> : null}
        {children}
      </div>
    </>
  );

  const door = opening ? { "data-door": "open" } : {};
  if (!overlay) {
    return (
      <section
        className="nf-passcode nf-passcode--inline"
        aria-labelledby={titleId}
        data-testid={testId}
        {...door}
      >
        {body}
      </section>
    );
  }
  return (
    <dialog
      ref={ref}
      open
      className="nf-passcode nf-passcode--overlay"
      data-theme="dark"
      aria-labelledby={titleId}
      data-testid={testId}
      {...door}
    >
      {body}
    </dialog>
  );
}
