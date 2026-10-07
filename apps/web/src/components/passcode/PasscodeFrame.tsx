"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Image from "next/image";
import { LogoMark } from "@/design-system/brand/Logo";
import { focalObject } from "@/components/auth/focal-art";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { initial } from "@/lib/text/initial";
import { useNightDoor } from "@/components/auth/NightDoor";
import { photo } from "@/lib/site/photos";

/**
 * THE SCREEN EVERY PASSCODE STEP IS DRAWN ON. docs/PASSCODE.md.
 *
 * The returning greeting (the founder's reference 6, 7 October 2026,
 * docs/design/PREMIUM-STANDARD.md): a lit Vallo scene fills the top (one of
 * the landing's night photographs, with Vallo's mark and wordmark over it),
 * and a raised sheet rises over it with a large rounded top. The member's
 * face sits on the sheet's edge in a white ring with a blue glow; in the
 * sheet, the greeting, a line, the way to switch account (`aside`), and the
 * step's own controls: the biometric door, or the dots and the keypad of
 * glass spheres, which arrive WITH the sheet (`app/css/passcode.css`, "the
 * scene", "the sheet", "the ring" and "the spheres"). On a wide screen the
 * scene is the whole window and the sheet a centred raised card.
 *
 * `opening` is the right answer's door (`open-door.ts`): the sheet and the
 * scene leave on `leave` while the app comes forward. `door` says which
 * controls the sheet holds, so its height can change as one move.
 *
 * ALWAYS DARK. The frame is a night island (`data-theme="dark"`), so the
 * lock reads the same in either theme and in every layout that hosts it.
 *
 * What sits in the ring (`focal`): on the lock, the member's photo, else the
 * initial of their name; on setup, the 3D padlock. Presentation only.
 *
 * `overlay` draws it as a modal <dialog>: `showModal()` puts it in the top
 * layer and makes everything behind it inert (the shell's rail and tab bar
 * included), which is what a lock needs. It is server-rendered `open` so the
 * lock is on screen before any script runs, then promoted to modal once
 * hydrated. Escape is swallowed: a lock cannot be dismissed. Without
 * `overlay` (the settings screen) it is an ordinary section.
 */
export type PasscodeFocal = "face" | "lock";

/** What the ring shows: the photo, the padlock, or the initial. Pure, for the tests. */
export function ringContent(
  focal: PasscodeFocal,
  avatarUrl: string | null | undefined,
  lockReady: boolean
): "photo" | "padlock" | "initial" {
  if (focal === "face") return avatarUrl ? "photo" : "initial";
  return lockReady ? "padlock" : "initial";
}

export function PasscodeFrame({
  overlay,
  titleId,
  title,
  subtitle,
  name,
  avatarUrl,
  children,
  testId,
  focal = "face",
  aside,
  opening = false,
  door = "keypad",
}: {
  overlay: boolean;
  titleId: string;
  title: string;
  subtitle?: string | null;
  name: string;
  avatarUrl?: string | null;
  /** The name in the top block (`passcode.wordmark`); the drawn wordmark is the brand asset, so this is kept for the callers. */
  wordmark: string;
  children: ReactNode;
  testId?: string;
  /**
   * What sits in the ring: the member's face (welcome back; their initial
   * when there is no photo), or the 3D padlock (setting or resetting the
   * code). Presentation only.
   */
  focal?: PasscodeFocal;
  /** Under the title: the lock's "Switch account". */
  aside?: ReactNode;
  /** The right answer has landed: the door opens (`open-door.ts`). */
  opening?: boolean;
  /** Which controls the sheet holds: the biometric offer or the keypad. */
  door?: "biometric" | "keypad";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const lock = focalObject("passcode-lock");
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

  const ring = ringContent(focal, avatarUrl, lock.kind === "object");

  const ringEl = (
    <span className="nf-passcode__ring" aria-hidden="true" data-ring={ring} data-testid="passcode-ring">
      {ring === "photo" && avatarUrl ? (
        <RemoteImage src={avatarUrl} alt="" width={192} height={192} sizes="96px" className="nf-passcode__face" />
      ) : ring === "padlock" && lock.kind === "object" ? (
        <Image
          src={lock.src}
          alt=""
          width={256}
          height={256}
          sizes="80px"
          priority
          draggable={false}
          className="nf-passcode__object"
        />
      ) : (
        <span className="nf-passcode__initial">{initial(name, "V")}</span>
      )}
    </span>
  );

  const body = (
    <>
      {/* The lit scene, behind everything: decorative, the dialog is named by its title. */}
      <div className="nf-passcode__scene" aria-hidden="true">
        {overlay ? (
          <Image
            src={photo("villa-pool-portrait")}
            alt=""
            fill
            sizes="(min-width: 48rem) 100vw, 100vw"
            priority
            draggable={false}
            className="nf-passcode__photo"
          />
        ) : null}
        <span className="nf-passcode__brand" role="img" aria-label="Vallo">
          <LogoMark size={34} className="nf-passcode__mark" priority />
          <Image
            src="/brand/vallo-wordmark.png"
            alt=""
            aria-hidden
            width={758}
            height={167}
            sizes="96px"
            priority
            className="nf-passcode__word"
          />
        </span>
      </div>
      <div className="nf-passcode__sheet" data-door={door}>
        {ringEl}
        <div className="nf-passcode__body">
          {/* The dialog opens with focus on its title, so a screen reader reads
              the greeting first and no key starts out looking pressed. */}
          <h1 id={titleId} className="nf-passcode__title" tabIndex={-1} autoFocus={overlay}>
            {title}
          </h1>
          {subtitle ? <p className="nf-passcode__subtitle">{subtitle}</p> : null}
          {aside ? <div className="nf-passcode__aside">{aside}</div> : null}
          {children}
        </div>
      </div>
    </>
  );

  if (!overlay) {
    return (
      <section
        className="nf-passcode nf-passcode--inline"
        data-theme="dark"
        aria-labelledby={titleId}
        data-testid={testId}
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
      data-door={opening ? "open" : undefined}
      aria-labelledby={titleId}
      data-testid={testId}
    >
      {body}
    </dialog>
  );
}
