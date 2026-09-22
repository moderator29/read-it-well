import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getProviderStates } from "@/lib/auth/providers";
import { signInWithEmail, signUpMethodForEmail } from "@/lib/auth/actions";
import type { EmailStatus } from "@/lib/auth/form-state";
import { EmailAuthForm } from "@/components/auth/EmailAuthForm";
import { emailFromQuery } from "@/components/auth/auth-intent";

export const metadata: Metadata = {
  title: "Sign in with email",
  robots: { index: false, follow: false },
};

/**
 * The second step of the email-first door: the address arrived from the
 * chooser, and this screen asks for whatever that account signs in with.
 *
 * WHICH STEP IS READ HERE, ON THE SERVER. `signUpMethodForEmail` answers
 * "email", "google", "none" or "unknown" through the service-role function
 * `signup_method_for_email`, behind the same per-connection limiter the
 * sign-up form's check uses (sixty an hour). An account made with Google has
 * no password, and before this the screen asked for one anyway and answered
 * every attempt with "do not match". Anything but a clear "google" or "none"
 * draws the ordinary password step, so a refused or unavailable lookup costs
 * nothing.
 */
export default async function SignInEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; email?: string }>;
}) {
  const { next, email } = await searchParams;
  const locale = await getLocale();
  const t = getDictionary(locale);
  const address = emailFromQuery(email);
  const providers = getProviderStates();
  const googleReady = providers.some((p) => p.id === "google" && p.configured);

  let accountMethod: EmailStatus = "unknown";
  if (address) {
    try {
      accountMethod = await signUpMethodForEmail(address);
    } catch {
      accountMethod = "unknown";
    }
  }

  return (
    <EmailAuthForm
      mode="sign-in"
      t={t}
      action={signInWithEmail}
      next={next}
      initialEmail={address}
      accountMethod={accountMethod}
      googleReady={googleReady}
    />
  );
}
