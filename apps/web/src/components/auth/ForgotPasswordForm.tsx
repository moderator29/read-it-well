"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";
import type { Dictionary } from "@vallo/i18n/core";
import type { AuthFormState } from "@/lib/auth/form-state";
import { requestPasswordReset } from "@/lib/auth/actions";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Field } from "./fields";
import { AuthPillButton, AuthPillLink } from "./slate";
import { useRefusalShake } from "./useRefusalShake";

const EMPTY: AuthFormState = { ok: false };

/**
 * Ask for a reset link.
 *
 * One field, and then one sentence that says the same thing whether or not the
 * address has an account. That sentence is the security property, not a
 * politeness: a form that answers "no account with that email" is an
 * account-existence oracle, and on a platform where people list their homes
 * that is a privacy leak before it is a credential-stuffing aid. The action
 * returns the same message for a match, a miss and a refusal alike.
 *
 * On success the form is replaced rather than left sitting under the
 * confirmation. Nothing useful can be done with it a second time, and leaving
 * it there invites somebody to hammer the button waiting for a different
 * answer they are never going to get.
 */
export function ForgotPasswordForm({ t }: { t: Dictionary }) {
  const [state, formAction, pending] = useActionState(requestPasswordReset, EMPTY);
  const sent = state.ok;
  /* THE FORM ERROR: the refused field shakes once, its message beneath. */
  const form = useRef<HTMLFormElement>(null);
  useRefusalShake(form, state, !state.ok && (Object.keys(state.fieldErrors ?? {}).length > 0 || Boolean(state.message)));

  return (
    <div className="nf-auth__screen nf-slate-stagger">
      <h1 className="nf-auth__title">{t.auth.resetTitle}</h1>
      <p className="nf-auth__sub">{sent ? t.auth.resetSentLead : t.auth.resetLead}</p>

      {sent ? (
        <>
          <p role="status" className="nf-auth__notice">
            {state.message}
          </p>
          {/* The link works only in this browser; the code in the same
              email works anywhere. */}
          <p className="nf-auth__hint">{t.auth.resetHaveCode}</p>
          <div className="nf-auth__form">
            <AuthPillLink href="/forgot-password/code" quiet>
              {t.auth.resetEnterCode}
            </AuthPillLink>
          </div>
          <p className="nf-auth__hint">{t.auth.resetNotArrived}</p>
        </>
      ) : (
        <form ref={form} action={formAction} className="nf-auth__form nf-auth__form--fields nf-slate-stagger" noValidate>
          <Field
            t={t}
            id="email"
            name="email"
            type="email"
            label={t.auth.emailLabel}
            placeholder={t.auth.emailPlaceholder}
            autoComplete="email"
            error={state.fieldErrors?.email}
          />

          {state.message && (
            <p
              role="alert"
              className="rounded-[var(--nf-radius-md)] border border-[color-mix(in_oklab,var(--nf-state-warning)_35%,transparent)] bg-[var(--nf-state-warning-surface)] px-md py-sm text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-state-warning)]"
            >
              {state.message}
            </p>
          )}

          <div className="nf-auth__actions">
            <AuthPillButton type="submit" loading={pending} className="nf-auth__cta">
              {t.auth.resetSend}
            </AuthPillButton>
          </div>
        </form>
      )}

      <p className="nf-auth__links">
        <Link href="/sign-in" className="nf-tap nf-auth__aside">
          <UiIcon name="arrow-left" size={16} />
          {t.common.signIn}
        </Link>
      </p>
    </div>
  );
}
