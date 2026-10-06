"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Dictionary } from "@vallo/i18n/core";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { CODE_START, type CodeSignInState } from "@/lib/auth/code-sign-in-state";
import { sendEmailSignInCode, verifyEmailSignInCode } from "@/lib/auth/email-code";
import { sendPhoneSignInCode, verifyPhoneSignInCode } from "@/lib/auth/phone-sign-in";
import { resendLabel } from "@/lib/auth/mail-app";
import { useResendClock } from "./useResendClock";
import { ResendClockView } from "./ResendClockView";
import { useRefusalShake } from "./useRefusalShake";
import { codeLengthWord } from "@/lib/auth/confirmation-code";
import { Button } from "@/components/ui/Button";
import { CodeInput } from "./CodeInput";
import { Field } from "./fields";
import { AuthPillButton } from "./slate";

/* A sign-in code is six digits (`isSixDigits`), whatever length the sign-up
   confirmation uses. */
const SIGN_IN_CODE_LENGTH = 6;

type Mode = "email" | "phone";

/**
 * A3 and A2. Sign in with a six-digit code: by email (no password), or by
 * phone (WhatsApp first, then text). Two steps on one screen, drawn with the
 * auth screens' own classes and field, so it looks like the sign-in it sits
 * beside. The code field takes `one-time-code` autofill.
 *
 * THE CODE STEP IS THE SIGN-UP CODE SCREEN'S (A4, 30 September re-audit):
 * the same cells (`CodeInput`, one real input under them), a shake on a
 * refused code, the last digit sending the form, and "Send a new code"
 * counting down its thirty seconds in place. The actions are unchanged.
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
  const [code, setCode] = useState("");
  const verifyForm = useRef<HTMLFormElement>(null);
  /* One shake per refusal, counted as the answer arrives, as
     VerifyCodeForm does. */
  const [answered, setAnswered] = useState(checked);
  const [wrongCount, setWrongCount] = useState(0);
  /* Which of the two forms answered last: the screen shows that answer.
     (It used to read the step off both at once, and the verify form's
     starting state, "ask", kept the code step from ever showing.) */
  const [latest, setLatest] = useState<"sent" | "checked">("sent");
  if (answered !== checked) {
    setAnswered(checked);
    setLatest("checked");
    if (checked.error === "wrongCode" || checked.error === "badCode") setWrongCount((n) => n + 1);
  }

  const [sentAnswer, setSentAnswer] = useState(sent);
  if (sentAnswer !== sent) {
    setSentAnswer(sent);
    setLatest("sent");
  }
  const state = latest === "checked" ? checked : sent;
  const onCode = state.step === "code";
  const message = state.error ? (copy as Record<string, string>)[state.error] ?? copy.failed : null;

  /*
   * THE RESEND IS GOVERNED BY THE REAL RULE (`resend-rule.ts`): the pace after
   * the last send and the server's per-address ceiling for this door (five an
   * hour by email, four by phone), counted from the send's own time, so a
   * reload shows the true time left. The answer to the OPENING send is what
   * starts it: a code on the way records that send (which spends one of the
   * address's sends, `countsFirst`), and a `limited` answer to any send
   * records that the window is spent until it ends. A resend is recorded as
   * it is submitted (below), so its own answer must not record it twice.
   *
   * Only a SEND's `limited` is a send refusal. The verify action answers
   * `limited` from its own bucket (ten checks in ten minutes), which says
   * nothing about sends: recording it here showed every code as spent while
   * the server would still have sent one (audit A5).
   */
  const clock = useResendClock(mode === "email" ? "emailCode" : "phoneCode", sent.target ?? "");
  const { recordSend, recordRefusal } = clock;
  const resending = useRef(false);
  useEffect(() => {
    const wasResend = resending.current;
    resending.current = false;
    if (sent.step === "code" && !wasResend) recordSend("first");
    else if (sent.error === "limited") recordRefusal();
  }, [sent, recordSend, recordRefusal]);

  const askForm = useRef<HTMLFormElement>(null);
  /* THE FORM ERROR on the address or number step: shake the field once. */
  useRefusalShake(askForm, sent, !onCode && Boolean(sent.error) && sent.error !== "off");

  const onDigits = (value: string) => {
    const digits = value.replace(/\D/g, "");
    setCode(digits);
    if (digits.length === SIGN_IN_CODE_LENGTH && !verifying) verifyForm.current?.requestSubmit();
  };

  return (
    <div className="nf-auth__screen nf-slate-stagger">
      <h1 className="nf-auth__title">{copy.title}</h1>
      <p className="nf-auth__sub">
        {onCode ? (
          <SentTo template={copy.sentTo} slot={mode === "email" ? "{email}" : "{phone}"} shown={sent.shown ?? ""} />
        ) : (
          copy.lede
        )}
      </p>

      {!onCode ? (
        <form ref={askForm} action={send} className="nf-auth__form nf-auth__form--fields nf-slate-stagger" noValidate>
          {mode === "email" ? (
            <Field
              t={t}
              id="code-email"
              name="email"
              type="email"
              label={t.publicDoors.emailCode.emailLabel}
              placeholder={t.auth.emailPlaceholder}
              autoComplete="email"
              error={state.error === "badTarget" ? t.publicDoors.emailCode.badEmail : undefined}
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
              error={state.error === "badTarget" ? t.publicDoors.phone.badPhone : undefined}
            />
          )}
          {message && state.error !== "badTarget" && (
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
        <form ref={verifyForm} action={verify} className="nf-auth__form nf-auth__form--fields nf-slate-stagger" noValidate>
          <input type="hidden" name="target" value={sent.target ?? ""} />
          {next && <input type="hidden" name="next" value={next} />}
          <CodeInput
            id="code-digits"
            name="code"
            label={copy.codeLabel}
            length={SIGN_IN_CODE_LENGTH}
            value={code}
            onChange={onDigits}
            error={state.error === "badCode" ? copy.badCode : state.error === "wrongCode" ? copy.wrongCode : undefined}
            wrongCount={wrongCount}
            placeholder="123456"
            cellsLabel={t.authFlow.codeCells.replace("{count}", codeLengthWord(SIGN_IN_CODE_LENGTH))}
          />
          {state.error && state.error !== "badCode" && state.error !== "wrongCode" && message && (
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
        <form
          action={send}
          onSubmit={() => {
            resending.current = true;
            recordSend("resend");
          }}
          className="nf-verify__resend nf-slate-stagger"
        >
          <input type="hidden" name={mode === "email" ? "email" : "phone"} value={sent.target ?? ""} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            loading={sending}
            disabled={clock.state.kind !== "ready"}
            data-testid={`code-resend-${mode}`}
          >
            {clock.state.kind === "gap" ? resendLabel(t.authFlow.resendIn, clock.seconds) : copy.resend}
          </Button>
          <ResendClockView clock={clock} windowLine={t.experienceEntry.resendWindow} readyLine={t.experienceEntry.resendReady} />
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

/** "We sent a code to a***@mail.com." with the address in the ink it is in on the sign-up code screen. */
function SentTo({ template, slot, shown }: { template: string; slot: string; shown: string }) {
  const [before, after = ""] = template.split(slot);
  if (!shown) return <>{template.replace(slot, "")}</>;
  return (
    <>
      {before}
      <span className="font-semibold text-[var(--nf-content-primary)]">{shown}</span>
      {after}
    </>
  );
}
