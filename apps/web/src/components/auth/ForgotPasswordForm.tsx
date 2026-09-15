"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Dictionary } from "@vallo/i18n";
import type { AuthFormState } from "@/lib/auth/actions";
import { requestPasswordReset } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Field } from "./fields";

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

  return (
    <div className="w-full">
      <Link
        href="/sign-in"
        className="nf-tap -ml-1 mb-3 inline-flex items-center gap-1.5 text-[0.8125rem] text-[var(--nf-content-muted)] transition-colors hover:text-[var(--nf-content-secondary)]"
      >
        <UiIcon name="arrow-left" size={16} />
        {t.common.signIn}
      </Link>

      <h1 className="nf-h2 text-center">{t.auth.resetTitle}</h1>
      <p className="mb-6 mt-1.5 text-center text-[0.875rem] leading-relaxed text-[var(--nf-content-muted)]">
        {sent ? t.auth.resetSentLead : t.auth.resetLead}
      </p>

      {sent ? (
        <>
          <p
            role="status"
            className="nf-card px-4 py-3.5 text-center text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]"
          >
            {state.message}
          </p>
          <p className="mt-6 text-center text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
            {t.auth.resetNotArrived}
          </p>
        </>
      ) : (
        <form action={formAction} className="space-y-4 text-left" noValidate>
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
              className="rounded-[var(--nf-radius-md)] border border-[color-mix(in_oklab,var(--nf-state-warning)_35%,transparent)] bg-[var(--nf-state-warning-surface)] px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-[var(--nf-state-warning)]"
            >
              {state.message}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" full loading={pending}>
            {t.auth.resetSend}
          </Button>
        </form>
      )}
    </div>
  );
}
