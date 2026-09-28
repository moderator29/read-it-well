import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { resolveProviderStates } from "@/lib/auth/providers";
import { requestSurface } from "@/lib/auth/surface";
import { chooserEmail, signInWithEmail, signUpMethodForEmail } from "@/lib/auth/actions";
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
 * every attempt with "do not match". Anything but a clear "google" draws the
 * ordinary password step, so a refused or unavailable lookup costs nothing.
 *
 * "none" IS DRAWN AS THE PASSWORD STEP TOO (F-08). It used to show "No account
 * uses this address yet" above the form, and then a wrong password added "do
 * not match" under it: two contradictory messages, and a page that told anyone
 * which addresses have accounts. The password step now says one neutral thing
 * either way.
 *
 * The address comes from the chooser's cookie (`continueWithEmail`), or from
 * `?email=` for links that carry it on purpose.
 */
export default async function SignInEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; email?: string }>;
}) {
  const { next, email } = await searchParams;
  const locale = await getLocale();
  const t = getDictionary(locale);
  const address = emailFromQuery(email) || (await chooserEmail());
  const providers = await resolveProviderStates(await requestSurface());
  const googleReady = providers.some((p) => p.id === "google" && p.configured);

  let accountMethod: EmailStatus = "unknown";
  if (address) {
    try {
      const method = await signUpMethodForEmail(address);
      accountMethod = method === "none" ? "unknown" : method;
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
