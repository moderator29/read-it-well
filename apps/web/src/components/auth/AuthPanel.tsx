"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import type { AuthFormState } from "@/lib/auth/actions";
import { startAppleOAuth, startGoogleOAuth } from "@/lib/auth/actions";
import type { ProviderId, ProviderState } from "@/lib/auth/providers";
import { HEAR_ABOUT_OPTIONS } from "@/lib/auth/signup-options";
import { NIGERIAN_STATES } from "@/lib/data/nigeria";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { AppleMark, GoogleMark, MailMark } from "./ProviderMarks";

const EMPTY: AuthFormState = { ok: false };

/**
 * Auth panel.
 *
 * Layout follows the supplied reference: heading, sub, then a stack of full
 * width provider rows. Google and Apple are offered alongside email. Apple is
 * kept because App Store guideline 4.8 requires Sign in with Apple wherever
 * other third party sign in is offered, and the product ships on iOS.
 *
 * Sign-up collects the full profile (names, discovery source, state, optional
 * referral); sign-in stays lean with email and password only. The extra
 * sign-up copy is authored here in English until the auth dictionary grows the
 * matching keys.
 */
export function AuthPanel({
  mode,
  t,
  providers,
  action,
  notice,
}: {
  mode: "sign-in" | "sign-up";
  t: Dictionary;
  providers: ProviderState[];
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  /** A message from the auth callback, for example an expired link. */
  notice?: string | undefined;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY);
  const [showEmail, setShowEmail] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const isSignUp = mode === "sign-up";

  const configured = (id: ProviderId) => providers.find((p) => p.id === id)?.configured ?? false;

  const oauth: { id: ProviderId; label: string; mark: React.ReactNode }[] = [
    { id: "google", label: t.auth.continueWithGoogle, mark: <GoogleMark /> },
    { id: "apple", label: t.auth.continueWithApple, mark: <AppleMark /> },
  ];

  // Live mismatch feedback on the confirm field; the server re-checks it.
  const mismatch = confirm.length > 0 && confirm !== password;
  const confirmError = mismatch ? "Passwords do not match." : state.fieldErrors?.confirmPassword;

  return (
    <div className="w-full">
      <h1 className="nf-h2 text-center">
        {isSignUp ? t.auth.createAccount : `${t.auth.welcomeBack} 👋`}
      </h1>
      <p className="mt-1.5 text-center text-[0.875rem] text-[var(--nf-content-muted)]">
        {isSignUp ? t.auth.signUpToStart : t.auth.signInToContinue}
      </p>

      {notice ? (
        <p
          role="status"
          className="nf-card mt-4 px-4 py-3 text-center text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]"
        >
          {notice}
        </p>
      ) : null}

      {/*
       * Demo entry. Temporary scaffold while the auth environment is not wired:
       * it drops a short-lived demo cookie and opens the app so the whole
       * platform can be explored and reviewed. Replace with a real session once
       * Supabase auth env is in place.
       */}
      <Link
        href="/home"
        onClick={() => {
          document.cookie = "nf_demo=1; path=/; max-age=86400; samesite=lax";
        }}
        className="nf-btn nf-btn--primary mt-6 w-full py-3.5"
      >
        <UiIcon name="sparkle" size={16} />
        {t.auth.exploreDemo}
      </Link>

      <div className="my-5 flex items-center gap-4" aria-hidden="true">
        <span className="h-px flex-1 bg-[var(--nf-border-subtle)]" />
        <span className="text-[0.75rem] uppercase tracking-[0.14em] text-[var(--nf-content-muted)]">
          {t.auth.orContinue}
        </span>
        <span className="h-px flex-1 bg-[var(--nf-border-subtle)]" />
      </div>

      <div className="space-y-2.5">
        {!showEmail ? (
          <button
            type="button"
            onClick={() => setShowEmail(true)}
            className="nf-auth-row"
          >
            <span className="nf-auth-row__mark nf-auth-row__mark--email">
              <MailMark size={16} />
            </span>
            <span className="flex-1 text-left">{t.auth.continueWithEmail}</span>
          </button>
        ) : (
          /* The email row expands in place into the form, so the panel keeps
             its shape and nothing jumps. */
          <form action={formAction} className="nf-rise space-y-3.5 text-left" noValidate>
            {isSignUp && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    id="firstName"
                    name="firstName"
                    type="text"
                    label="First name"
                    placeholder="Ada"
                    autoComplete="given-name"
                    error={state.fieldErrors?.firstName}
                  />
                  <Field
                    id="surname"
                    name="surname"
                    type="text"
                    label="Surname"
                    placeholder="Okafor"
                    autoComplete="family-name"
                    error={state.fieldErrors?.surname}
                  />
                </div>
                <Field
                  id="nickname"
                  name="nickname"
                  type="text"
                  label="Nickname"
                  optional
                  placeholder="What friends call you"
                  autoComplete="nickname"
                  error={state.fieldErrors?.nickname}
                />
              </>
            )}

            <Field
              id="email"
              name="email"
              type="email"
              label={t.auth.emailLabel}
              placeholder={t.auth.emailPlaceholder}
              autoComplete="email"
              error={state.fieldErrors?.email}
            />

            <PasswordField
              id="password"
              label={t.auth.passwordLabel}
              placeholder={t.auth.passwordPlaceholder}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              error={state.fieldErrors?.password}
              value={password}
              onChange={setPassword}
            />
            {isSignUp && <StrengthMeter password={password} />}

            {isSignUp && (
              <>
                <PasswordField
                  id="confirmPassword"
                  label="Confirm password"
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  error={confirmError}
                  value={confirm}
                  onChange={setConfirm}
                />

                <SelectField
                  id="hearAbout"
                  name="hearAbout"
                  label="Where did you hear about us"
                  placeholder="Select an option"
                  options={HEAR_ABOUT_OPTIONS}
                  error={state.fieldErrors?.hearAbout}
                />
                <SelectField
                  id="state"
                  name="state"
                  label="Where do you stay"
                  placeholder="Select your state"
                  options={NIGERIAN_STATES}
                  error={state.fieldErrors?.state}
                />

                <Field
                  id="referralCode"
                  name="referralCode"
                  type="text"
                  label="Referral code"
                  optional
                  placeholder="Enter your code"
                  autoComplete="off"
                  error={state.fieldErrors?.referralCode}
                />
              </>
            )}

            <button
              type="submit"
              disabled={pending}
              aria-busy={pending || undefined}
              className="nf-btn nf-btn--primary w-full py-3.5"
            >
              {pending ? t.common.loading : isSignUp ? t.common.signUp : t.common.signIn}
            </button>

            {!isSignUp && (
              <p className="text-center">
                {/* No reset route exists yet, so this routes back to sign-in
                    rather than dead-ending on a 404. */}
                <Link
                  href="/sign-in"
                  className="text-[0.8125rem] text-[var(--nf-content-muted)] underline-offset-4 hover:text-[var(--nf-content-secondary)] hover:underline"
                >
                  {t.auth.forgotPassword}
                </Link>
              </p>
            )}
          </form>
        )}

        {state.message && (
          <p
            role="alert"
            className="rounded-[var(--nf-radius-md)] border border-[color-mix(in_oklab,var(--nf-state-warning)_35%,transparent)] bg-[var(--nf-state-warning-surface)] px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-[var(--nf-state-warning)]"
          >
            {state.message}
          </p>
        )}

        {/* Each provider is its own form posting to the OAuth start action.
            A form rather than an onClick so the handshake begins on the server,
            where the redirect belongs: a client-side redirect would have to
            know the callback URL, and only the server does. Until a provider is
            switched on in the Supabase dashboard and named in
            NEXT_PUBLIC_AUTH_PROVIDERS, the control stays disabled and says so
            below, rather than sending someone to an error page. */}
        {oauth.map((p) => (
          <form key={p.id} action={p.id === "google" ? startGoogleOAuth : startAppleOAuth}>
            <button type="submit" disabled={!configured(p.id)} className="nf-auth-row w-full">
              <span className="nf-auth-row__mark">{p.mark}</span>
              <span className="flex-1 text-left">{p.label}</span>
            </button>
          </form>
        ))}

        {oauth.some((p) => !configured(p.id)) && (
          <p className="pt-1 text-center text-[0.75rem] text-[var(--nf-content-muted)]">
            {t.auth.providerUnavailable}
          </p>
        )}
      </div>

      <p className="mt-6 text-center text-[0.875rem] text-[var(--nf-content-secondary)]">
        {isSignUp ? t.auth.haveAccount : t.auth.noAccount}{" "}
        <Link
          href={isSignUp ? "/sign-in" : "/sign-up"}
          className="font-semibold text-[var(--nf-electric-300)] underline-offset-4 hover:underline"
        >
          {isSignUp ? t.common.signIn : t.common.signUp}
        </Link>
      </p>

      <p className="mt-4 text-center text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)]">
        {t.auth.termsNotice}
      </p>
    </div>
  );
}

/** Label row with an optional marker chip for non-required fields. */
function LabelRow({ htmlFor, label, optional }: { htmlFor: string; label: string; optional?: boolean }) {
  return (
    <span className="flex items-center justify-between gap-2">
      <label htmlFor={htmlFor} className="nf-label">
        {label}
      </label>
      {optional && (
        <span className="nf-chip mb-1.5 px-2 py-0.5 text-[0.625rem]">Optional</span>
      )}
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

function Field({
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
function SelectField({
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
function PasswordField({
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
function StrengthMeter({ password }: { password: string }) {
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
