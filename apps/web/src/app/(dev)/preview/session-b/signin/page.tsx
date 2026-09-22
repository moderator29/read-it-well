import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import AuthLayout from "@/app/(auth)/layout";
import { AuthChoices } from "@/components/auth/AuthChoices";
import { EmailAuthForm } from "@/components/auth/EmailAuthForm";
import type { AuthFormState, EmailStatus } from "@/lib/auth/form-state";
import { fixtureRefusal } from "./refusal";

const FIXTURE_REFUSAL: AuthFormState = {
  ok: false,
  message: "That email and password do not match. Check them and try again.",
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
 *   ?state=refused   a submitted password the server refused (fixture action
 *                    returning the real "do not match" sentence)
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
  } else if (state === "refused") {
    body = (
      <EmailAuthForm
        mode="sign-in"
        t={t}
        action={fixtureRefusal}
        initialEmail="ada@example.com"
        initialState={FIXTURE_REFUSAL}
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
