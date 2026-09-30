"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AuthCurveBlock } from "@/components/auth/slate";
import { focalObject } from "@/components/auth/focal-art";
import { FocalArtImage } from "@/components/auth/FocalArtImage";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { initial } from "@/lib/text/initial";

/**
 * THE SCREEN EVERY PASSCODE STEP IS DRAWN ON. docs/PASSCODE.md.
 *
 * The top is the shared Slate block (`AuthCurveBlock` from
 * `components/auth/slate.tsx`, compact) so the lock reads as the same door
 * as sign-in: the founder's 3D glass door of 30 September, a bright blue
 * bowl with the lockup, and the member's avatar in a glowing ring across its
 * curve (the block's `focal`). Under it: one headline, one line, the ring
 * dots and the round glass keys (`app/css/passcode.css`).
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
  wordmark,
  children,
  testId,
  focal = "face",
}: {
  overlay: boolean;
  titleId: string;
  title: string;
  subtitle?: string | null;
  name: string;
  avatarUrl?: string | null;
  /** The name in the top block (`passcode.wordmark`). */
  wordmark: string;
  children: ReactNode;
  testId?: string;
  /**
   * What sits in the ring: the member's face (welcome back; the 3D padlock
   * when there is no photo), or the 3D padlock (setting or resetting the
   * code). Presentation only.
   */
  focal?: "face" | "lock";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const lock = focalObject("passcode-lock");

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
      <AuthCurveBlock
        compact
        brandHref={null}
        brandLabel="Vallo"
        wordmark={wordmark}
        focal={
          focal === "face" && avatarUrl ? (
            <span className="nf-passcode__avatar">
              <RemoteImage src={avatarUrl} alt="" width={192} height={192} sizes="96px" />
            </span>
          ) : lock.kind === "object" ? (
            <FocalArtImage art={lock} />
          ) : (
            <span className="nf-passcode__avatar">
              <span>{initial(name, "V")}</span>
            </span>
          )
        }
      />
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
