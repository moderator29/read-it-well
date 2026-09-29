import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { chooserEmail, signUpWithEmail } from "@/lib/auth/actions";
import { EmailAuthForm } from "@/components/auth/EmailAuthForm";
import { listStates } from "@/lib/places/queries";
import { resolveProviderStates } from "@/lib/auth/providers";
import { requestSurface } from "@/lib/auth/surface";
import { emailFromQuery } from "@/components/auth/auth-intent";

export const metadata: Metadata = {
  title: "Create your account with email",
  robots: { index: false, follow: false },
};

/**
 * The sign-up form in two steps, reached from the email-first chooser or a
 * link that carries `?email=`. `/sign-up` itself draws the same form; this
 * address stays because links and the chooser's action point at it.
 *
 * The 37 states come down with the page because they are small and every
 * sign-up needs them. The 774 local governments and 749 occupations do not:
 * their pickers fetch themselves when opened, so nobody pays for a list they
 * never look at.
 */
export default async function SignUpEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; email?: string }>;
}) {
  const { next, email } = await searchParams;
  const locale = await getLocale();
  const t = getDictionary(locale);
  const states = await listStates();
  const surface = await requestSurface();
  const providers = await resolveProviderStates(surface);
  const ready = (id: "google" | "apple") => providers.some((p) => p.id === id && p.configured);

  return (
    <EmailAuthForm
      mode="sign-up"
      t={t}
      action={signUpWithEmail}
      states={states}
      next={next}
      initialEmail={emailFromQuery(email) || (await chooserEmail())}
      googleReady={ready("google")}
      appleReady={ready("apple")}
      surface={surface}
    />
  );
}
