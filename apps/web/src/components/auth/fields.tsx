"use client";

import { useState } from "react";

/**
 * The form furniture the auth screens share.
 *
 * Lifted out of `AuthPanel` when the email form moved to its own route. These
 * are deliberately local to auth rather than reaching for `components/ui/Field`:
 * the auth fields carry an "Optional" chip on the label row, a four-segment
 * strength meter and a show/hide toggle that no other field on the platform
 * needs, and folding all three into the shared primitive would put auth-only
 * behaviour in front of every form in the product.
 */

/** One headed group inside the sign-up form. */
export function FormGroup({
  title,
  step,
  note,
  children,
}: {
  title: string;
  step: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-[var(--nf-border-subtle)] pt-5 first:border-t-0 first:pt-0 [&+section]:mt-7">
      <div className="mb-3.5 flex items-baseline justify-between gap-3">
        <h2 className="text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
          {title}
        </h2>
        <span className="nf-numeric shrink-0 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[var(--nf-content-muted)]">
          {step}
        </span>
      </div>
      {note && (
        <p className="mb-4 text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)]">
          {note}
        </p>
      )}
      <div className="space-y-3.5">{children}</div>
    </section>
  );
}

/** Label row with an optional marker chip for non-required fields. */
function LabelRow({
  htmlFor,
  label,
  optional,
}: {
  htmlFor: string;
  label: string;
  optional?: boolean;
}) {
  return (
    <span className="flex items-center justify-between gap-2">
      <label htmlFor={htmlFor} className="nf-label">
        {label}
      </label>
      {optional && <span className="nf-chip mb-1.5 px-2 py-0.5 text-[0.625rem]">Optional</span>}
    </span>
  );
}

function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-[0.75rem] text-[var(--nf-state-error)]">
      {error}
    </p>
  );
}

export function Field({
  id,
  name,
  type,
  label,
  placeholder,
  autoComplete,
  error,
  optional,
}: {
  id: string;
  name: string;
  type: string;
  label: string;
  placeholder: string;
  autoComplete: string;
  error?: string;
  optional?: boolean;
}) {
  const errorId = `${id}-error`;
  return (
    <div>
      <LabelRow htmlFor={id} label={label} optional={optional} />
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="nf-field"
      />
      <FieldError id={errorId} error={error} />
    </div>
  );
}

/**
 * Native select dressed as a platform field. The browser picker keeps the
 * control fully accessible on mobile; only the closed face is restyled, with
 * an inline chevron replacing the platform arrow.
 */
export function SelectField({
  id,
  name,
  label,
  placeholder,
  options,
  error,
}: {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  options: readonly string[];
  error?: string;
}) {
  const errorId = `${id}-error`;
  return (
    <div>
      <LabelRow htmlFor={id} label={label} />
      <div className="relative">
        <select
          id={id}
          name={name}
          defaultValue=""
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="nf-field appearance-none pr-11"
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[var(--nf-content-muted)]"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </div>
      <FieldError id={errorId} error={error} />
    </div>
  );
}

/**
 * Password field with a client-side show/hide toggle.
 *
 * The toggle is a real button (not a decorated span) so it is reachable by
 * keyboard, and it announces its state via aria-pressed plus a swapped label.
 * Toggling only flips the input type; the value never leaves the field. The
 * value is controlled by the parent so the strength meter and the confirm
 * check can react as the user types.
 */
export function PasswordField({
  id,
  label,
  placeholder,
  autoComplete,
  error,
  value,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  autoComplete: string;
  error?: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const errorId = `${id}-error`;

  return (
    <div>
      <LabelRow htmlFor={id} label={label} />
      <div className="relative">
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="nf-field pr-12"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-[var(--nf-radius-lg)] text-[var(--nf-content-muted)] transition-colors hover:text-[var(--nf-content-secondary)]"
        >
          <EyeGlyph off={visible} />
        </button>
      </div>
      <FieldError id={errorId} error={error} />
    </div>
  );
}

type StrengthScore = 0 | 1 | 2 | 3 | 4;

/**
 * Client-side strength estimate from length, letter case, digits and symbols.
 * Anything under 8 characters is always weak, matching the server minimum.
 * This is guidance only; the server never trusts it.
 */
function scorePassword(pw: string): StrengthScore {
  if (!pw) return 0;
  if (pw.length < 8) return 1;
  let met = 1; // length criterion already met
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) met += 1;
  if (/\d/.test(pw)) met += 1;
  if (/[^A-Za-z0-9]/.test(pw)) met += 1;
  return met as StrengthScore;
}

const STRENGTH_LABELS: Record<StrengthScore, string> = {
  0: "",
  1: "Weak",
  2: "Fair",
  3: "Good",
  4: "Strong",
};

const STRENGTH_COLOURS: Record<StrengthScore, string> = {
  0: "transparent",
  1: "var(--nf-state-error)",
  2: "var(--nf-state-warning)",
  3: "var(--nf-electric-300)",
  4: "var(--nf-state-success)",
};

/** Four-segment strength bar with a text label, announced politely. */
export function StrengthMeter({ password }: { password: string }) {
  const score = scorePassword(password);
  const colour = STRENGTH_COLOURS[score];

  return (
    <div className="-mt-1.5">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1.5">
          {([1, 2, 3, 4] as const).map((segment) => (
            <span
              key={segment}
              className="h-1 flex-1 rounded-full transition-colors"
              style={{
                background: segment <= score ? colour : "var(--nf-border-subtle)",
              }}
            />
          ))}
        </div>
        <span
          aria-live="polite"
          className="min-w-[3.25rem] text-right text-[0.6875rem] font-semibold"
          style={{ color: score === 0 ? "var(--nf-content-muted)" : colour }}
        >
          {STRENGTH_LABELS[score]}
        </span>
      </div>
    </div>
  );
}

/** Minimal stroke eye, with a slash when the password is shown. */
function EyeGlyph({ off }: { off: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.9" />
      {off && <path d="m4.5 4.5 15 15" />}
    </svg>
  );
}
