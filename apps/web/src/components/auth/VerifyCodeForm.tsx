"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import type { AuthFormState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Field } from "./fields";
import { useRouter } from "next/navigation";
import { VerifyingPanel } from "./VerifyingPanel";

/**
 * The six digits from the confirmation email.
 *
 * This screen is the half of sign-up that never existed. The email has always
 * carried a code as well as a link, under the words "Or enter this code", and
 * there was nowhere to enter it. Somebody who read the code rather than tapping
 * the link had no way forward at all.
 *
 * Typing the last digit submits. Not as a flourish: a six digit code has a
 * known length, so waiting for somebody to reach for a button after they have
 * already given you everything you need is a step that exists for the form's
 * benefit and not for theirs. The button stays for a keyboard, for a paste that
 * lands short, and for anybody who does not trust a form that moves on its own.
 *
 * Pasting works from the code field alone rather than from six separate boxes.
 * Six boxes look considered and then fight every password manager, every "copy"
 * from a mail client that brings a trailing space, and every screen reader,
 * which reads them as six unlabelled inputs.
 */

const EMPTY: AuthFormState = { ok: false };
const CODE_LENGTH = 6;

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
  const [state, verifyAction, verifying] = useActionState(verify, EMPTY);
  const [resendState, resendAction, resending] = useActionState(resend, EMPTY);
  const [address, setAddress] = useState(email);
  const [code, setCode] = useState("");
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
    const to = state.verified;
    const timer = window.setTimeout(() => {
      router.replace(to);
      router.refresh();
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [state.ok, state.verified, router]);

  if (state.ok && state.verified) {
    return <VerifyingPanel />;
  }

  /* Digits only, and never more than six, so a pasted "  123 456 " arrives as
     123456 rather than as a value the server has to refuse. */
  function onCode(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length === CODE_LENGTH && !verifying) {
      /* requestSubmit rather than submit, so the form's own validation and the
         action both run exactly as they would on a press. */
      form.current?.requestSubmit();
    }
  }

  return (
    <div className="w-full max-w-[26rem]">
      <h1 className="nf-h2">Enter your code</h1>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
        {address.length > 0 ? (
          <>
            We sent six digits to{" "}
            <span className="font-semibold text-[var(--nf-content-primary)]">{address}</span>. Type
            them here and you are in. No second sign-in.
          </>
        ) : (
          <>
            We sent six digits to the address you signed up with. Type them here and you are in. No
            second sign-in.
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
          label="Confirmation code"
          placeholder="123456"
          /* `one-time-code` is what makes iOS and Android offer the code from
             the message above the keyboard, which is the difference between
             one tap and copying six digits by hand. */
          autoComplete="one-time-code"
          inputMode="numeric"
          error={state.fieldErrors?.code}
          value={code}
          onChange={onCode}
          className="nf-numeric text-[1.25rem] tracking-[0.32em]"
        />

        {state.message && (
          <p
            role="alert"
            className="rounded-[var(--nf-radius-md)] border border-[color-mix(in_oklab,var(--nf-state-warning)_35%,transparent)] bg-[var(--nf-state-warning-surface)] px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-[var(--nf-state-warning)]"
          >
            {state.message}
          </p>
        )}

        <Button type="submit" variant="primary" size="lg" full loading={verifying}>
          Confirm and go in
        </Button>
      </form>

      {/* Its own form, so asking for another code cannot submit the one that
          is already typed, and a refusal on one does not clear the other. */}
      <form action={resendAction} className="mt-5 text-center">
        <input type="hidden" name="email" value={address} />
        <Button type="submit" variant="ghost" size="sm" loading={resending}>
          Send me another code
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

      <p className="mt-6 text-center text-[0.8125rem] text-[var(--nf-content-muted)]">
        The same email carries a button that does this in one tap.{" "}
        <Link
          href="/sign-in"
          className="underline-offset-4 hover:text-[var(--nf-content-secondary)] hover:underline"
        >
          Already confirmed? Sign in
        </Link>
      </p>
    </div>
  );
}
