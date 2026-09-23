import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import AuthLayout from "@/app/(auth)/layout";
import { AuthChoices } from "@/components/auth/AuthChoices";
import { EmailAuthForm } from "@/components/auth/EmailAuthForm";
import type { AuthFormState, EmailStatus } from "@/lib/auth/form-state";
import { deactivatedAccountNotice } from "@/lib/auth/deactivated-notice";
import { fixtureRefusal } from "./refusal";

/*
 * Every refusal the password step can show, as the server returns it. The
 * sentences are `authMessage`'s and `throttle`'s in `lib/auth/actions.ts`
 * (not exported, so copied word for word here); the deactivated one is the
 * real `deactivatedAccountNotice()`; the field errors are
 * `validateCredentials`'s.
 */
const REFUSALS: Record<string, AuthFormState> = {
  refused: {
    ok: false,
    message: "That email and password do not match. Check them and try again.",
  },
  unconfirmed: {
    ok: false,
    message: "Confirm your email first. Open the link we sent you, then sign in.",
  },
  throttled: { ok: false, message: "Too many attempts just now. Try again in a minute." },
  deactivated: { ok: false, ...deactivatedAccountNotice() },
  fields: {
    ok: false,
    fieldErrors: {
      email: "That does not look like a valid email.",
      password: "Use at least 8 characters.",
    },
  },
};

export const metadata: Metadata = {
  title: "Preview: Welcome back",
  robots: { index: false, follow: false },
};

/**
 * Welcome back, the states a sandbox cannot reach live (ledger R-G).
 *
 * The real shell, the real `AuthChoices` and the real `EmailAuthForm`, on
 * fixture props, behind the preview gate in `../../layout.tsx`. The live
 * `/sign-in` needs no fixtures for its chooser; these are the password-step
 * answers that depend on an account existing, which no test user may be
 * created to show:
 *
 *   ?state=chooser   the chooser, as live, with a notice
 *   ?state=google    an address whose account signs in with Google
 *   ?state=none      an address no account uses
 *   ?state=refused      a password the server refused ("do not match")
 *   ?state=unconfirmed  an address not yet confirmed
 *   ?state=throttled    the per-connection or per-address limit tripped
 *   ?state=deactivated  an account in its deletion grace window (the real
 *                       notice, with its link to restore)
 *   ?state=fields       the server's field errors on both fields
 *
 * Proofs taken here are fixture-backed and the ledger says so.
 */
export default async function SignInPreview({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state = "chooser" } = await searchParams;
  const t = getDictionary(await getLocale());
  const providers = [
    { id: "email" as const, configured: true },
    { id: "google" as const, configured: true },
    { id: "apple" as const, configured: false },
  ];

  let body: React.ReactNode;
  if (state === "google" || state === "none") {
    body = (
      <EmailAuthForm
        mode="sign-in"
        t={t}
        action={fixtureRefusal}
        initialEmail="ada@example.com"
        accountMethod={state as EmailStatus}
        googleReady
      />
    );
  } else if (REFUSALS[state]) {
    body = (
      <EmailAuthForm
        mode="sign-in"
        t={t}
        action={fixtureRefusal}
        initialEmail="ada@example.com"
        initialState={REFUSALS[state]}
      />
    );
  } else {
    body = (
      <AuthChoices
        mode="sign-in"
        t={t}
        providers={providers}
        notice="Sign in to open that. It takes a moment, and new accounts are free."
      />
    );
  }

  return <AuthLayout>{body}</AuthLayout>;
}
