"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import "@/app/css/auth.css";

/**
 * THE CODE FIELD, DRAWN AS CELLS (30 September).
 *
 * ONE REAL INPUT, STILL. The reasons `VerifyCodeForm` gives for refusing a
 * box per digit all stand: a single field is what password managers, the
 * mail app's "copy code" and the phone's one-time-code suggestion fill in
 * one go, and what a screen reader reads as one labelled field. So the input
 * is the whole of the control, sitting over the cells with its own text made
 * transparent; the cells are a picture of its value, hidden from assistive
 * technology.
 *
 * THE MOTION. Each digit pops into its cell as it arrives; the cell waiting
 * for the next digit carries a soft caret; a wrong code shakes the row once
 * (`wrongCount` restarts it on every refusal); a surplus paste lights every
 * cell as an error. Transform and opacity only, answered for reduced motion,
 * Calm and Off in auth.css ("THE CODE").
 *
 * Every attribute the plain field carried is here unchanged: `one-time-code`
 * autocomplete, the numeric keyboard, 16px type (iOS never zooms), no
 * capitalisation or correction, and the error wired through aria-invalid and
 * aria-describedby. The value is never truncated: a surplus is the form's to
 * say, not this component's to hide.
 *
 * THE BOXES BEHAVE LIKE BOXES (U1, 6 October). One input, but it reads as six:
 *
 *   FORWARD AND BACK. The caret is held at the end of the value whenever it
 *     is not selecting, so a digit always lands in the next box and Backspace
 *     always takes the last one; the waiting box follows. (A caret parked in
 *     the middle of an invisible value was the one way the cells and the
 *     input could disagree about where the next digit goes.)
 *   ONE PASTE, ONE SUBMIT. `onComplete` fires when the value BECOMES whole,
 *     once per arrival, not on every render that happens to hold six digits:
 *     a paste, the phone's code suggestion and an autofill that writes twice
 *     each send the form once.
 *   A REFUSED CODE IS SELECTED. The server cannot say which digit was wrong
 *     (it answers for the whole code), so no single box is marked: the row
 *     is, and every digit is selected and painted as selected, so typing the
 *     code again replaces it in one go. The refusal sentence says so.
 *   WHAT A SCREEN READER HEARS. One edit field named by its label, described
 *     by how long the code is and how many digits are in (`progress`), and,
 *     when refused, by the refusal itself, which is also announced once as
 *     it arrives (`role="alert"`). The cells are a picture and are hidden.
 */
export function CodeInput({
  id,
  name,
  label,
  length,
  value,
  onChange,
  onComplete,
  error,
  wrongCount,
  placeholder,
  cellsLabel,
  progress,
}: {
  id: string;
  name: string;
  label: string;
  length: number;
  value: string;
  onChange: (value: string) => void;
  /** Called once each time the value becomes a whole code (see above). */
  onComplete?: () => void;
  error?: string | null | undefined;
  /** How many times the server has refused a code; each one shakes once and selects the digits. */
  wrongCount: number;
  placeholder: string;
  /** "6 digit code": the field's description, read with its label. */
  cellsLabel: string;
  /** "{n} of {total} in": how far the code has got, read with the description. */
  progress?: string;
}) {
  const [focused, setFocused] = useState(false);
  /* Whether the whole value is selected, so the cells can draw what the
     invisible input is doing. */
  const [selectedAll, setSelectedAll] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const digits = value.slice(0, length).split("");
  const over = value.length > length;
  const next = Math.min(digits.length, length - 1);

  /* ONE PASTE, ONE SUBMIT: the arrival at a whole code, counted once. */
  const wasWhole = useRef(value.length === length);
  const complete = useRef(onComplete);
  useEffect(() => {
    complete.current = onComplete;
  });
  useEffect(() => {
    const whole = value.length === length;
    if (whole && !wasWhole.current) complete.current?.();
    wasWhole.current = whole;
  }, [value, length]);

  /* A REFUSED CODE IS SELECTED, ready to be typed over in one go. */
  useEffect(() => {
    if (wrongCount === 0) return;
    const el = input.current;
    if (!el || el.value.length === 0) return;
    el.focus({ preventScroll: true });
    el.select();
    setSelectedAll(true);
  }, [wrongCount]);

  /* FORWARD AND BACK: a caret that is not selecting lives at the end. */
  const onSelect = (event: SyntheticEvent<HTMLInputElement>) => {
    const el = event.currentTarget;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const len = el.value.length;
    if (start === end && end !== len) el.setSelectionRange(len, len);
    setSelectedAll(len > 0 && start === 0 && end === len);
  };

  const describedBy = [hintId, error ? errorId : null].filter(Boolean).join(" ");

  return (
    <div className="nf-auth-field nf-code" data-error={error ? "" : undefined}>
      <label htmlFor={id} className="nf-label">
        {label}
      </label>
      <div
        className="nf-code__box"
        /* Two names for one shake, alternating, so every refusal restarts
           the animation rather than matching a rule that already ran. */
        data-shake={wrongCount === 0 ? undefined : wrongCount % 2 === 0 ? "b" : "a"}
      >
        <div className="nf-code__cells" aria-hidden="true">
          {Array.from({ length }, (_, i) => {
            const digit = digits[i];
            return (
              <span
                key={i}
                className="nf-code__cell"
                data-filled={digit ? "" : undefined}
                data-next={focused && !digit && i === next ? "" : undefined}
                data-over={over ? "" : undefined}
                data-selected={focused && selectedAll && digit ? "" : undefined}
              >
                {digit ? (
                  /* Keyed by the digit, so a changed digit pops in again. */
                  <span key={`${i}-${digit}`} className="nf-code__digit">
                    {digit}
                  </span>
                ) : null}
              </span>
            );
          })}
        </div>
        <input
          ref={input}
          id={id}
          name={name}
          type="text"
          inputMode="numeric"
          /* `one-time-code` is what makes iOS and Android offer the code from
             the message above the keyboard. */
          autoComplete="one-time-code"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          placeholder={placeholder}
          value={value}
          onChange={(event) => {
            setSelectedAll(false);
            onChange(event.target.value);
          }}
          onSelect={onSelect}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setSelectedAll(false);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="nf-code__input nf-numeric"
        />
      </div>
      {/* The description: how long the code is and how far it has got. Not a
          live region: the reader hears each digit as it is typed already. */}
      <span id={hintId} className="sr-only">
        {progress ? `${cellsLabel}. ${progress}` : cellsLabel}
      </span>
      {error ? (
        <p id={errorId} role="alert" className="nf-slate-field__error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** "{n} of {total} in", filled, for the field's description. */
export function codeProgress(template: string, n: number, total: number): string {
  return template.replace("{n}", String(Math.min(n, total))).replace("{total}", String(total));
}
