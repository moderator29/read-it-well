"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import type { AuthFormState } from "@/lib/auth/actions";
import { updatePassword } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { PasswordField, StrengthMeter } from "./fields";

const EMPTY: AuthFormState = { ok: false };

/**
 * Choose the new password.
 *
 * Reached only through the recovery link, which lands on `/auth/callback`,
 * exchanges its code for a session and forwards here. That session IS the
 * authorisation - `updateUser` acts on whoever the cookies say is signed in -
 * so this screen never asks for the old password and never carries a token in
 * its own URL, which is what stops one being left in a browser history or a
 * shared link.
 *
 * Same strength meter and same confirm check as sign-up, from the same module,
 * so the rules a person met when they created the account are the rules they
 * meet when they replace it.
 */
export function ResetPasswordForm({ t }: { t: Dictionary }) {
  const [state, formAction, pending] = useActionState(updatePassword, EMPTY);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const mismatch = confirm.length > 0 && confirm !== password;
  const confirmError = mismatch ? "Passwords do not match." : state.fieldErrors?.confirmPassword;

  return (
    <div className="w-full">
      <h1 className="nf-h2 text-center">{t.auth.newPasswordTitle}</h1>
      <p className="mb-6 mt-1.5 text-center text-[0.875rem] leading-relaxed text-[var(--nf-content-muted)]">
        {t.auth.newPasswordLead}
      </p>

      <form action={formAction} className="space-y-3.5 text-left" noValidate>
        <PasswordField
          t={t}
          id="password"
          label={t.auth.newPasswordLabel}
          placeholder={t.auth.passwordPlaceholder}
          autoComplete="new-password"
          error={state.fieldErrors?.password}
          value={password}
          onChange={setPassword}
        />
        <StrengthMeter password={password} t={t} />
        <PasswordField
          t={t}
          id="confirmPassword"
          label={t.auth.confirmPasswordLabel}
          placeholder={t.auth.confirmPasswordPlaceholder}
          autoComplete="new-password"
          error={confirmError}
          value={confirm}
          onChange={setConfirm}
        />

        {state.message && (
          <p
            role="alert"
            className="rounded-[var(--nf-radius-md)] border border-[color-mix(in_oklab,var(--nf-state-warning)_35%,transparent)] bg-[var(--nf-state-warning-surface)] px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-[var(--nf-state-warning)]"
          >
            {state.message}{" "}
            <Link href="/forgot-password" className="font-semibold underline underline-offset-4">
              {t.auth.resetSend}
            </Link>
          </p>
        )}

        <Button type="submit" variant="primary" size="lg" full loading={pending}>
          {t.auth.newPasswordSave}
        </Button>
      </form>
    </div>
  );
}
