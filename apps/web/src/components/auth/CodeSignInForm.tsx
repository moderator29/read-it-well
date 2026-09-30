"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Dictionary } from "@vallo/i18n/core";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { CODE_START, type CodeSignInState } from "@/lib/auth/code-sign-in-state";
import { sendEmailSignInCode, verifyEmailSignInCode } from "@/lib/auth/email-code";
import { sendPhoneSignInCode, verifyPhoneSignInCode } from "@/lib/auth/phone-sign-in";
import { Field } from "./fields";
import { AuthPillButton } from "./slate";

type Mode = "email" | "phone";

/**
 * A3 and A2. Sign in with a six-digit code: by email (no password), or by
 * phone (WhatsApp first, then text). Two steps on one screen, drawn with the
 * auth screens' own classes and field, so it looks like the sign-in it sits
 * beside. The code field takes `one-time-code` autofill.
 */
export function CodeSignInForm({ mode, t, next }: { mode: Mode; t: Dictionary; next?: string }) {
  const copy = mode === "email" ? t.publicDoors.emailCode : t.publicDoors.phone;
  const [sent, send, sending] = useActionState<CodeSignInState, FormData>(
    mode === "email" ? sendEmailSignInCode : sendPhoneSignInCode,
    CODE_START,
  );
  const [checked, verify, verifying] = useActionState<CodeSignInState, FormData>(
    mode === "email" ? verifyEmailSignInCode : verifyPhoneSignInCode,
    CODE_START,
  );
  const state = checked.step === "code" || checked.error ? checked : sent;
  const onCode = sent.step === "code" && checked.step !== "ask";
  const message = state.error ? (copy as Record<string, string>)[state.error] ?? copy.failed : null;

  return (
    <div className="nf-auth__screen nf-slate-stagger">
      <h1 className="nf-auth__title">{copy.title}</h1>
      <p className="nf-auth__sub">{onCode ? copy.sentTo.replace(mode === "email" ? "{email}" : "{phone}", sent.shown ?? "") : copy.lede}</p>

      {!onCode ? (
        <form action={send} className="nf-auth__form nf-auth__form--fields nf-slate-stagger" noValidate>
          {mode === "email" ? (
            <Field
              t={t}
              id="code-email"
              name="email"
              type="email"
              label={t.publicDoors.emailCode.emailLabel}
              placeholder={t.auth.emailPlaceholder}
              autoComplete="email"
              error={sent.error === "badTarget" ? t.publicDoors.emailCode.badEmail : undefined}
            />
          ) : (
            <Field
              t={t}
              id="code-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              label={`${t.publicDoors.phone.phoneLabel} (${t.publicDoors.phone.prefix})`}
              placeholder={t.publicDoors.phone.placeholder}
              autoComplete="tel-national"
              error={sent.error === "badTarget" ? t.publicDoors.phone.badPhone : undefined}
            />
          )}
          {message && sent.error !== "badTarget" && (
            <p role="alert" className="nf-auth__notice">
              {message}
            </p>
          )}
          <div className="nf-auth__actions">
            <AuthPillButton type="submit" loading={sending} className="nf-auth__cta" data-testid={`code-send-${mode}`}>
              {copy.send}
            </AuthPillButton>
          </div>
        </form>
      ) : (
        <form action={verify} className="nf-auth__form nf-auth__form--fields nf-slate-stagger" noValidate>
          <input type="hidden" name="target" value={sent.target ?? ""} />
          {next && <input type="hidden" name="next" value={next} />}
          <Field
            t={t}
            id="code-digits"
            name="code"
            type="text"
            inputMode="numeric"
            label={copy.codeLabel}
            placeholder="123456"
            autoComplete="one-time-code"
            error={checked.error === "badCode" ? copy.badCode : checked.error === "wrongCode" ? copy.wrongCode : undefined}
          />
          {checked.error && checked.error !== "badCode" && checked.error !== "wrongCode" && message && (
            <p role="alert" className="nf-auth__notice">
              {message}
            </p>
          )}
          <div className="nf-auth__actions">
            <AuthPillButton type="submit" loading={verifying} className="nf-auth__cta" data-testid={`code-verify-${mode}`}>
              {copy.verify}
            </AuthPillButton>
          </div>
        </form>
      )}

      {onCode && (
        <form action={send} className="nf-auth__links">
          <input type="hidden" name={mode === "email" ? "email" : "phone"} value={sent.target ?? ""} />
          <button type="submit" className="nf-tap nf-auth__aside" disabled={sending}>
            {copy.resend}
          </button>
        </form>
      )}

      <p className="nf-auth__links">
        <Link href={next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in"} className="nf-tap nf-auth__aside">
          <UiIcon name="arrow-left" size={16} />
          {t.publicDoors.emailCode.usePassword}
        </Link>
      </p>
    </div>
  );
}
