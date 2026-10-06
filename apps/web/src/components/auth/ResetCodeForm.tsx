"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AuthCopy } from "./auth-copy";
import type { AuthFormState } from "@/lib/auth/form-state";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { feedback } from "@/lib/ui/feedback";
import { CodeInput, codeProgress } from "./CodeInput";
import { Field } from "./fields";
import { AuthPillButton } from "./slate";
import { useRefusalShake } from "./useRefusalShake";
import {
  CONFIRMATION_CODE_LENGTH,
  CONFIRMATION_CODE_PLACEHOLDER,
  codeLengthWord,
  readCode,
  surplusMessage,
} from "@/lib/auth/confirmation-code";
import "@/app/css/auth.css";

const EMPTY: AuthFormState = { ok: false };

/**
 * The reset code: the address and the code from the reset email.
 *
 * The fallback for a reset link opened somewhere the link cannot work (a mail
 * app's own browser, another phone, another browser). A right code makes the
 * recovery session on the server and the action redirects to
 * /reset-password, which then sets the new password exactly as it does after
 * the link. A wrong one gets one neutral sentence on the code field, the same
 * whether or not the address has an account.
 *
 * The address is asked for rather than remembered, because opening the email
 * on one device and typing on another is the case this screen exists for, and
 * nothing this device holds travels with the email. The code field submits
 * the form itself once it holds the whole code, as the sign-up code does.
 *
 * THE SAME CODE FIELD AS EVERY OTHER CODE (R3-09). This was the one code on
 * the auth screens typed into a plain text field with letter-spaced digits,
 * while the sign-up code and the sign-in code draw `CodeInput`'s cells over
 * one real input. It now draws the same cells, with the same name, the same
 * one-time-code autocomplete and the same refusal: a wrong code shakes the
 * row once (`wrongCount`) and says so under it.
 */
export function ResetCodeForm({
  t,
  verify,
  initialEmail = "",
  initialState = EMPTY,
}: {
  t: AuthCopy;
  verify: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  initialEmail?: string;
  initialState?: AuthFormState;
}) {
  const [state, formAction, pending] = useActionState(verify, initialState);
  const [address, setAddress] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [surplus, setSurplus] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);
  /* How many times the server refused a code, so the cells shake once for
     each, counted as the answer arrives (as `VerifyCodeForm` does). */
  const [answered, setAnswered] = useState(state);
  const [wrongCount, setWrongCount] = useState(0);
  if (answered !== state) {
    setAnswered(state);
    if (state.fieldErrors?.code) setWrongCount((n) => n + 1);
  }
  /* A wrong code is a genuine refusal, so it is felt as well as seen, as it
     was when this was a plain field. */
  useEffect(() => {
    if (wrongCount > 0) feedback("error");
  }, [wrongCount]);
  /* THE FORM ERROR: a refused address shakes its field once; a refused code
     is the cells' own shake. */
  useRefusalShake(
    form,
    state,
    !state.ok && !state.fieldErrors?.code && (Boolean(state.fieldErrors?.email) || Boolean(state.message)),
  );

  function onCode(value: string) {
    const reading = readCode(value);
    setCode(reading.digits);
    setSurplus(surplusMessage(reading));
  }
  /* Once per whole code (`CodeInput`'s `onComplete`), and only with an
     address to send it with. */
  function onWhole() {
    if (!pending && address.trim().length > 0) form.current?.requestSubmit();
  }

  return (
    <div className="nf-auth__screen nf-slate-stagger">
      <h1 className="nf-auth__title">{t.auth.resetCodeTitle}</h1>
      <p className="nf-auth__sub">{t.auth.resetCodeLead}</p>

      <form
        ref={form}
        action={formAction} className="nf-auth__form nf-auth__form--fields nf-slate-stagger" noValidate>
        <Field
          t={t}
          id="reset-email"
          name="email"
          type="email"
          label={t.auth.emailLabel}
          placeholder={t.auth.emailPlaceholder}
          autoComplete="email"
          error={state.fieldErrors?.email}
          value={address}
          onChange={setAddress}
        />
        {/* One real input under the cells: one-time-code autocomplete and
            the numeric keyboard, so the phone offers the code from the email. */}
        <CodeInput
          id="reset-code"
          name="code"
          label={t.auth.resetCodeLabel}
          length={CONFIRMATION_CODE_LENGTH}
          value={code}
          onChange={onCode}
          onComplete={onWhole}
          error={surplus ?? state.fieldErrors?.code}
          wrongCount={wrongCount}
          placeholder={CONFIRMATION_CODE_PLACEHOLDER}
          cellsLabel={t.authFlow.codeCells.replace("{count}", codeLengthWord())}
          progress={codeProgress(t.experienceEntry.codeProgress, code.length, CONFIRMATION_CODE_LENGTH)}
        />

        {state.message && (
          <p role="alert" className="nf-auth__alert">
            {state.message}
          </p>
        )}

        <div className="nf-auth__actions">
          <AuthPillButton type="submit" loading={pending} className="nf-auth__cta">
            {t.auth.resetCodeSubmit}
          </AuthPillButton>
        </div>
      </form>

      <p className="nf-auth__links">
        <Link href="/forgot-password" className="nf-tap nf-auth__aside">
          <UiIcon name="arrow-left" size={16} />
          {t.auth.resetCodeAskAgain}
        </Link>
      </p>
    </div>
  );
}
