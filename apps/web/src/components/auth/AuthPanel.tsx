"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import type { AuthFormState } from "@/lib/auth/actions";
import type { ProviderId, ProviderState } from "@/lib/auth/providers";
import { AppleMark, GoogleMark, MailMark, XMark } from "./ProviderMarks";

const EMPTY: AuthFormState = { ok: false };

export function AuthPanel({
  mode,
  t,
  providers,
  action,
}: {
  mode: "sign-in" | "sign-up";
  t: Dictionary;
  providers: ProviderState[];
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY);
  const [showEmail, setShowEmail] = useState(false);
  const isSignUp = mode === "sign-up";

  const configured = (id: ProviderId) => providers.find((p) => p.id === id)?.configured ?? false;

  const oauth: { id: ProviderId; label: string; mark: React.ReactNode }[] = [
    { id: "google", label: t.auth.continueWithGoogle, mark: <GoogleMark /> },
    { id: "apple", label: t.auth.continueWithApple, mark: <AppleMark /> },
    { id: "x", label: t.auth.continueWithX, mark: <XMark /> },
  ];

  return (
    <div className="nf-card w-full max-w-[26rem] p-7 sm:p-8">
      <h1 className="nf-h2 text-center">
        {isSignUp ? t.auth.createAccount : t.auth.welcomeBack}
      </h1>
      <p className="mt-2 text-center text-[0.875rem] text-[var(--nf-content-muted)]">
        {isSignUp ? t.auth.signUpToStart : t.auth.signInToContinue}
      </p>

      <div className="mt-7 space-y-2.5">
        {/* Email is a disclosure, not a separate page, so the panel stays calm. */}
        {!showEmail ? (
          <button
            type="button"
            onClick={() => setShowEmail(true)}
            className="nf-btn nf-btn--glass w-full justify-start gap-3 px-4 py-3.5"
          >
            <MailMark />
            <span className="flex-1 text-left">{t.auth.continueWithEmail}</span>
          </button>
        ) : (
          <form action={formAction} className="space-y-3.5 text-left" noValidate>
            {isSignUp && (
              <Field
                id="fullName"
                name="fullName"
                type="text"
                label={t.auth.fullNameLabel}
                placeholder={t.auth.fullNamePlaceholder}
                autoComplete="name"
                error={state.fieldErrors?.fullName}
              />
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
            <Field
              id="password"
              name="password"
              type="password"
              label={t.auth.passwordLabel}
              placeholder={t.auth.passwordPlaceholder}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              error={state.fieldErrors?.password}
            />

            <button type="submit" disabled={pending} className="nf-btn nf-btn--primary w-full py-3.5">
              {pending ? t.common.loading : isSignUp ? t.common.signUp : t.common.signIn}
            </button>

            {!isSignUp && (
              <p className="text-center">
                <Link
                  href="/forgot-password"
                  className="text-[0.8125rem] text-[var(--nf-content-muted)] underline-offset-4 hover:text-[var(--nf-content-secondary)] hover:underline"
                >
                  {t.auth.forgotPassword}
                </Link>
              </p>
            )}
          </form>
        )}

        {/*
         * Server response. An unconfigured backend says so out loud rather than
         * showing a success state that did not happen.
         */}
        {state.message && (
          <p
            role="alert"
            className="rounded-[var(--nf-radius-md)] border border-[color-mix(in_oklab,var(--nf-state-warning)_35%,transparent)] bg-[var(--nf-state-warning-surface)] px-3.5 py-2.5 text-[0.8125rem] text-[var(--nf-state-warning)]"
          >
            {state.message}
          </p>
        )}

        <div className="flex items-center gap-3 py-1.5" aria-hidden="true">
          <span className="h-px flex-1 bg-[var(--nf-border-subtle)]" />
          <span className="text-[0.75rem] text-[var(--nf-content-muted)]">{t.auth.orDivider}</span>
          <span className="h-px flex-1 bg-[var(--nf-border-subtle)]" />
        </div>

        {oauth.map((p) => {
          const ready = configured(p.id);
          return (
            <button
              key={p.id}
              type="button"
              disabled={!ready}
              aria-describedby={ready ? undefined : `${p.id}-unavailable`}
              className="nf-btn nf-btn--glass w-full justify-start gap-3 px-4 py-3.5"
            >
              {p.mark}
              <span className="flex-1 text-left">{p.label}</span>
            </button>
          );
        })}

        {oauth.some((p) => !configured(p.id)) && (
          <p id="providers-unavailable" className="pt-1 text-center text-[0.75rem] text-[var(--nf-content-muted)]">
            {t.auth.providerUnavailable}
          </p>
        )}
      </div>

      <p className="mt-7 text-center text-[0.875rem] text-[var(--nf-content-secondary)]">
        {isSignUp ? t.auth.haveAccount : t.auth.noAccount}{" "}
        <Link
          href={isSignUp ? "/sign-in" : "/sign-up"}
          className="font-semibold text-[var(--nf-violet-300)] underline-offset-4 hover:underline"
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

function Field({
  id,
  name,
  type,
  label,
  placeholder,
  autoComplete,
  error,
}: {
  id: string;
  name: string;
  type: string;
  label: string;
  placeholder: string;
  autoComplete: string;
  error?: string;
}) {
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="nf-label">
        {label}
      </label>
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
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-[0.75rem] text-[var(--nf-state-error)]">
          {error}
        </p>
      )}
    </div>
  );
}
