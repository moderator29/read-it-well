"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Dictionary } from "@vallo/i18n/core";
import type { AuthFormState } from "@/lib/auth/form-state";
import { Button } from "@/components/ui/Button";
import { Field } from "./fields";
import { useRouter } from "next/navigation";
import { playThreshold, thresholdAllowed } from "@/lib/motion/threshold";
import { VerifyingPanel } from "./VerifyingPanel";
import {
  CONFIRMATION_CODE_PLACEHOLDER,
  codeLengthWord,
  readCode,
  surplusMessage,
} from "@/lib/auth/confirmation-code";

/**
 * The code from the confirmation email.
 *
 * This screen is the half of sign-up that never existed. The email has always
 * carried a code as well as a link, under the words "Or enter this code", and
 * there was nowhere to enter it. Somebody who read the code rather than tapping
 * the link had no way forward at all.
 *
 * Typing the last digit submits. Not as a flourish: the code has a known
 * length, so waiting for somebody to reach for a button after they have
 * already given you everything you need is a step that exists for the form's
 * benefit and not for theirs. The button stays for a keyboard, for a paste that
 * lands short, and for anybody who does not trust a form that moves on its own.
 *
 * Pasting works from the code field alone rather than from one box per digit.
 * Separate boxes look considered and then fight every password manager, every
 * "copy" from a mail client that brings a trailing space, and every screen
 * reader, which reads them as a row of unlabelled inputs.
 *
 * HOW LONG THE CODE IS LIVES IN ONE PLACE, `lib/auth/confirmation-code`. This
 * file used to carry its own `const CODE_LENGTH = 6` and its own sentences
 * saying "six digits", and neither moved when the project began issuing eight.
 */

const EMPTY: AuthFormState = { ok: false };

export function VerifyCodeForm({
  t,
  verify,
  resend,
  email,
  next,
}: {
  t: Dictionary;
  verify: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  resend: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  /** Remembered from the sign-up, empty if this was opened on another device. */
  email: string;
  next?: string | undefined;
}) {
  const a = t.authFlow;
  const [state, verifyAction, verifying] = useActionState(verify, EMPTY);
  const [resendState, resendAction, resending] = useActionState(resend, EMPTY);
  const [address, setAddress] = useState(email);
  const [code, setCode] = useState("");
  /* Set when somebody hands us more digits than a code has. Ours to say, not
     the server's: the server never sees a value this field refused to send. */
  const [surplus, setSurplus] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const router = useRouter();

  /*
   * The same moment the link path shows.
   *
   * Confirming by code used to redirect from the server, which put somebody
   * inside the platform on the next frame, while confirming by link held
   * "Verifying your email" for two seconds first. Two ways into one account
   * should not feel like two products. The floor lives in `VerifyingPanel`.
   */
  useEffect(() => {
    if (!state.ok || !state.verified) return;
    /* "Welcome to Vallo" follows from the server: the verify action set a
       one-shot cookie that `SuccessFlagHost` reads on the next screen. */
    const to = state.verified;
    const go = () => {
      router.replace(to);
      router.refresh();
    };
    /* Track M: through the door, which replaces the two-second floor. */
    if (thresholdAllowed()) {
      void playThreshold("door").then(go);
      return;
    }
    const timer = window.setTimeout(go, 2000);
    return () => window.clearTimeout(timer);
  }, [state.ok, state.verified, router]);

  if (state.ok && state.verified) {
    return <VerifyingPanel />;
  }

  /*
   * Digits only, and NEVER FEWER THAN THEY GAVE US.
   *
   * The spacing goes, because "  123 456 " and "123-456" are both somebody
   * pasting out of an email and the punctuation is not part of what they meant.
   * The digits stay, all of them. This line used to end `.slice(0, 6)`, which
   * is a decision to throw away part of what a person typed and say nothing
   * about it, and it was only safe while six was true. When the project started
   * issuing eight, the field ate the last two, the server refused the six that
   * were left, and the screen told somebody their code was wrong while showing
   * them the first six digits of the right one. A surplus is now SAID.
   */
  function onCode(value: string) {
    const reading = readCode(value);
    setCode(reading.digits);
    setSurplus(surplusMessage(reading));
    if (reading.complete && !verifying) {
      /* requestSubmit rather than submit, so the form's own validation and the
         action both run exactly as they would on a press. */
      form.current?.requestSubmit();
    }
  }

  return (
    <div className="w-full max-w-[26rem]">
      <h1 className="nf-h2">{a.enterCode}</h1>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
        {address.length > 0 ? (
          <>
            {a.sentTo.replace("{count}", codeLengthWord())}{" "}
            <span className="font-semibold text-[var(--nf-content-primary)]">{address}</span>
            {a.sentToTail}
          </>
        ) : (
          <>
            {a.sentNoAddress.replace("{count}", codeLengthWord())}
          </>
        )}
      </p>

      <form ref={form} action={verifyAction} className="mt-7 space-y-4" noValidate>
        {next && <input type="hidden" name="next" value={next} />}

        {/*
          The address is on the form whether or not we remembered it. Opening
          the email on a phone and the code on a laptop is ordinary, and the
          cookie that carries it does not travel between the two.
        */}
        <Field
          t={t}
          id="verify-email"
          name="email"
          type="email"
          label={t.auth.emailLabel}
          placeholder={t.auth.emailPlaceholder}
          autoComplete="email"
          error={state.fieldErrors?.email ?? resendState.fieldErrors?.email}
          value={address}
          onChange={setAddress}
        />

        <Field
          t={t}
          id="verify-code"
          name="code"
          type="text"
          label={a.codeLabel}
          placeholder={CONFIRMATION_CODE_PLACEHOLDER}
          /* `one-time-code` is what makes iOS and Android offer the code from
             the message above the keyboard, which is the difference between
             one tap and copying the digits by hand. */
          autoComplete="one-time-code"
          inputMode="numeric"
          /* The surplus first. It is about what is in the field right now,
             where the server's refusal is about the last thing sent, and the
             newer fact is the one worth reading. `Field` already wires
             aria-invalid and aria-describedby off this prop, so saying it here
             says it to a screen reader too. */
          error={surplus ?? state.fieldErrors?.code}
          value={code}
          onChange={onCode}
          className="nf-numeric text-[1.25rem] tracking-[0.32em]"
        />

        {state.message && (
          <p
            role="alert"
            className="rounded-[var(--nf-radius-md)] border border-[color-mix(in_oklab,var(--nf-state-warning)_35%,transparent)] bg-[var(--nf-state-warning-surface)] px-md py-sm text-[0.8125rem] leading-relaxed text-[var(--nf-state-warning)]"
          >
            {state.message}
          </p>
        )}

        <Button type="submit" variant="primary" size="lg" full loading={verifying}>
          {a.confirmAndGo}
        </Button>
      </form>

      {/* Its own form, so asking for another code cannot submit the one that
          is already typed, and a refusal on one does not clear the other. */}
      <form action={resendAction} className="mt-5 text-center">
        <input type="hidden" name="email" value={address} />
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <Button type="submit" variant="ghost" size="sm" loading={resending}>
          {a.sendAnother}
        </Button>
        {resendState.message && (
          <p
            role="status"
            className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]"
          >
            {resendState.message}
          </p>
        )}
      </form>

      {/* The house classes, not a one-off. `nf-auth__swap` is what every other
          screen in this card uses for "the other door", and it is the reason
          that door is legible: it draws the link in `--nf-content-link` at 600.
          This paragraph used to be muted grey throughout with the link marked
          only by a :hover rule, which on a phone is no mark at all, so on the
          one screen where somebody is stuck waiting for an email the way out
          was invisible. Colour is never the ONLY signal (rule 13); here there
          was no signal. */}
      <p className="nf-auth__terms">{a.sameEmailButton}</p>
      <p className="nf-auth__swap mt-xs">
        <Link href="/sign-in">{a.alreadyConfirmed}</Link>
      </p>
    </div>
  );
}
