import type { Metadata } from "next";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getProviderStates } from "@/lib/auth/providers";
import { signUpWithEmail } from "@/lib/auth/actions";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { listStates } from "@/lib/places/queries";

export const metadata: Metadata = {
  title: "Create your account",
  robots: { index: false, follow: false },
};

/**
 * The 37 states come down with the page because they are small and every
 * sign-up needs them. The 774 local governments and 749 occupations do not:
 * their pickers fetch themselves when opened, so nobody pays for a list they
 * never look at.
 */
export default async function SignUpPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const states = await listStates();

  return (
    <AuthPanel
      mode="sign-up"
      t={t}
      providers={getProviderStates()}
      action={signUpWithEmail}
      states={states}
    />
  );
}
