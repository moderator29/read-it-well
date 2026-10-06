"use client";

import { useEffect, useState, type ReactNode } from "react";
import { feedback } from "@/lib/ui/feedback";

/**
 * The dots and the keypad. docs/PASSCODE.md; MOTION_SYSTEM.md section 6.
 *
 * THE DOTS ARE THE SUBJECT OF THE SCREEN (the craft doctrine, section 4: "on
 * a passcode screen the dots"). Large and generously spaced, and the motion
 * is the whole thing, because this is the most repeated interaction in the
 * product and it has to feel right on the thousandth time:
 *
 *   a digit lands     its dot fills with a pop, 1.0 to 1.15 to 1.0 on the
 *                     `land` curve over 160ms, with one light haptic from the
 *                     key (`feedback("select")`, the light weight)
 *   a wrong code      the row shakes 6px once on `whip` over 160ms, still
 *                     full, then the fill leaves on the `leave` curve. NO red
 *                     flash: the message beneath says what happened, quietly
 *   the right code    the last dot fills and holds (PasscodeLock opens the
 *                     door 80ms later)
 *
 * Large round keys, a delete key, a press you can feel (the key sinks on the
 * press curve with a soft bloom), and the physical keyboard too: digits type,
 * Backspace deletes. The bottom-left slot is where a biometric key can sit
 * (`accessory`), which the lock uses once the person has chosen the keypad
 * over the biometric door it offers first.
 */

export function PasscodeDots({
  length,
  filled,
  shake,
  label,
}: {
  length: number;
  filled: number;
  /** Changes every wrong attempt, so the shake and the clearing replay. */
  shake: number;
  label: string;
}) {
  /* Keyed by the attempt, so each wrong code starts its own shake. */
  return <DotsRow key={shake} length={length} filled={filled} erring={shake > 0} label={label} />;
}

/**
 * How long a wrong code keeps the row full: the 160ms shake, then the 240ms
 * leave fade of the fill (`passcode.css`). After it the row is simply empty.
 */
export const WRONG_CLEAR_MS = 400;

function DotsRow({ length, filled, erring, label }: { length: number; filled: number; erring: boolean; label: string }) {
  /* The attempt's dots stay full while the row shakes and then fade out, so
     the person sees the code they typed leave rather than vanish. */
  const [clearing, setClearing] = useState(erring);
  useEffect(() => {
    if (!erring) return;
    const timer = window.setTimeout(() => setClearing(false), WRONG_CLEAR_MS);
    return () => window.clearTimeout(timer);
  }, [erring]);
  const typing = clearing && filled > 0;
  return (
    <div
      className={`nf-passcode__dots${clearing ? " nf-passcode__dots--wrong" : ""}`}
      data-count={length}
      role="img"
      aria-label={label}
      data-testid="passcode-dots"
    >
      {Array.from({ length }, (_, i) => {
        /* A digit typed during the clearing is a new attempt and shows as one. */
        const on = typing ? i < filled : clearing || i < filled;
        const leaving = clearing && !typing;
        return (
          <span
            key={i}
            className={`nf-passcode__dot${on ? " nf-passcode__dot--on" : ""}${leaving ? " nf-passcode__dot--leaving" : ""}`}
          />
        );
      })}
    </div>
  );
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

export function Keypad({
  onDigit,
  onDelete,
  disabled,
  label,
  deleteLabel,
  accessory,
}: {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  disabled?: boolean;
  label: string;
  deleteLabel: string;
  accessory?: ReactNode;
}) {
  useEffect(() => {
    if (disabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        feedback("select");
        onDigit(event.key);
      } else if (event.key === "Backspace") {
        event.preventDefault();
        onDelete();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [disabled, onDigit, onDelete]);

  /* The light haptic is the digit landing, so it comes with the digit. */
  const press = (digit: string) => {
    feedback("select");
    onDigit(digit);
  };

  return (
    <div className="nf-passcode__keypad" role="group" aria-label={label} data-testid="passcode-keypad">
      {KEYS.map((digit) => (
        <button key={digit} type="button" className="nf-passcode__key" disabled={disabled} onClick={() => press(digit)}>
          {digit}
        </button>
      ))}
      <span className="nf-passcode__key-slot">{accessory}</span>
      <button type="button" className="nf-passcode__key" disabled={disabled} onClick={() => press("0")}>
        0
      </button>
      {/* Delete is not a digit landing, so it carries no haptic: a haptic
          that does not help somebody understand what happened is removed
          (craft doctrine, section 6). */}
      <button
        type="button"
        className="nf-passcode__key nf-passcode__key--quiet"
        disabled={disabled}
        onClick={onDelete}
        aria-label={deleteLabel}
      >
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false">
          <path
            d="M9 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6-7 6-7Zm3.5 4.5 5 5m0-5-5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
