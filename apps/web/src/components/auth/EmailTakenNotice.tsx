"use client";

import { useState } from "react";
import Link from "next/link";
import type { Dictionary } from "@vallo/i18n";
import type { EmailStatus } from "@/lib/auth/actions";
import { Field } from "./fields";

/**
 * Saying "that address is already signed up" while there is still time to act
 * on it.
 *
 * The old shape asked for an address, a password, a name, a state, a local
 * government and an occupation, and only then, on submit, found out. The first
 * real sign-up on this platform hit exactly that: an account had been made with
 * Google an hour earlier, the same address went into the email form, and
 * Supabase answered 200 while sending nothing at all.
 *
 * The check runs on BLUR rather than on every keystroke. An address is not
 * valid until somebody has finished typing it, so checking as they type asks
 * the same question thirty times and answers it wrongly twenty-nine of them.
 *
 * WHICH METHOD, not just whether. "You already have an account" leaves
 * somebody exactly where they were. "Use Continue with Google, that is how you
 * made it" is the whole answer, and it is the difference between getting in
 * and resetting a password that was never set.
 *
 * A refusal or a rate limit answers "unknown", which shows nothing. This
 * notice can only ever add information; it never blocks the form, and somebody
 * who ignores it still gets the honest refusal on submit.
 */
export function EmailTakenNotice({
  t,
  error,
  check,
}: {
  t: Dictionary;
  error?: string | undefined;
  check: (email: string) => Promise<EmailStatus>;
}) {
  const [status, setStatus] = useState<EmailStatus>("unknown");
  const [email, setEmail] = useState("");

  async function onBlur(value: string) {
    const address = value.trim();
    if (address.length === 0) {
      setStatus("unknown");
      return;
    }
    setStatus(await check(address));
  }

  return (
    <div>
      <Field
        t={t}
        id="email"
        name="email"
        type="email"
        label={t.auth.emailLabel}
        placeholder={t.auth.emailPlaceholder}
        autoComplete="email"
        error={error}
        value={email}
        onChange={(value) => {
          setEmail(value);
          /* A fresh address is a fresh question. Leaving the old answer up
             while somebody corrects a typo is worse than saying nothing. */
          if (status !== "unknown") setStatus("unknown");
        }}
        onBlur={onBlur}
      />

      {(status === "google" || status === "email") && (
        <p
          role="status"
          data-testid="email-taken"
          className="mt-2 rounded-[var(--nf-radius-md)] border border-[color-mix(in_oklab,var(--nf-brand-primary)_35%,transparent)] bg-[color-mix(in_oklab,var(--nf-brand-primary)_10%,transparent)] px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]"
        >
          {status === "google" ? (
            <>
              That address is already signed up, with Google. Use{" "}
              <span className="font-semibold text-[var(--nf-content-primary)]">
                Continue with Google
              </span>{" "}
              on the{" "}
              <Link href="/sign-in" className="font-semibold underline underline-offset-4">
                sign in screen
              </Link>
              , not a password.
            </>
          ) : (
            <>
              That address is already signed up.{" "}
              <Link href="/sign-in" className="font-semibold underline underline-offset-4">
                Sign in instead
              </Link>
              , or{" "}
              <Link
                href="/forgot-password"
                className="font-semibold underline underline-offset-4"
              >
                reset the password
              </Link>{" "}
              if you cannot remember it.
            </>
          )}
        </p>
      )}
    </div>
  );
}
