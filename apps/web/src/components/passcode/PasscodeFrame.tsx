"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AuthCurveBlock } from "@/components/auth/slate";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { initial } from "@/lib/text/initial";

/**
 * THE SCREEN EVERY PASSCODE STEP IS DRAWN ON. docs/PASSCODE.md.
 *
 * The top is the shared Slate block (`AuthCurveBlock` from
 * `components/auth/slate.tsx`, compact) so the lock reads as the same door
 * as sign-in: brand navy in light mode, inverted to a light block in dark
 * mode, through the `--nf-slate-*` roles in `app/css/auth.css`. Under the
 * arc: the member's avatar, one headline, one line, and the keypad on the
 * plain ground (`app/css/passcode.css`).
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
  name,
  avatarUrl,
  children,
  testId,
}: {
  overlay: boolean;
  titleId: string;
  title: string;
  subtitle?: string | null;
  name: string;
  avatarUrl?: string | null;
  children: ReactNode;
  testId?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

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
      <AuthCurveBlock compact brandHref={null} brandLabel="Vallo" />
      <div className="nf-passcode__body">
        <span className="nf-passcode__avatar" aria-hidden="true">
          {avatarUrl ? (
            <RemoteImage src={avatarUrl} alt="" width={128} height={128} sizes="72px" />
          ) : (
            <span>{initial(name, "V")}</span>
          )}
        </span>
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

  if (!overlay) {
    return (
      <section className="nf-slate nf-passcode nf-passcode--inline" aria-labelledby={titleId} data-testid={testId}>
        {body}
      </section>
    );
  }
  return (
    <dialog ref={ref} open className="nf-slate nf-passcode nf-passcode--overlay" aria-labelledby={titleId} data-testid={testId}>
      {body}
    </dialog>
  );
}
