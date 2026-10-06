"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { VectorMark } from "@/components/auth/VectorMark";
import { useNightDoor } from "@/components/auth/NightDoor";

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
 * ALWAYS DARK. The frame is a night island (`data-theme="dark"`), so the lock
 * reads the same in either theme and in every layout that hosts it.
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
    try {
      if (!dialog.matches(":modal")) {
        if (dialog.open) dialog.close();
        dialog.showModal();
      }
    } catch {
      /* An old engine without :modal or showModal keeps the fixed layer. */
    }
    const refuse = (event: Event) => event.preventDefault();
    dialog.addEventListener("cancel", refuse);
    return () => dialog.removeEventListener("cancel", refuse);
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
        data-theme="dark"
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
