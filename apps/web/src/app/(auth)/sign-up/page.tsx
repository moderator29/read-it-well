import type { Metadata } from "next";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getProviderStates } from "@/lib/auth/providers";
import { AuthChoices } from "@/components/auth/AuthChoices";

export const metadata: Metadata = {
  title: "Create your account",
  robots: { index: false, follow: false },
};

/**
 * The three ways in, and nothing else.
 *
 * The form used to unroll here in place, which left the Google and Apple rows
 * stranded below nine fields. It now lives at `/sign-up/email`, so this page
 * stays one screen and the states it needs are read there rather than on every
 * visit to the chooser.
 */
export default async function SignUpPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return <AuthChoices mode="sign-up" t={t} providers={getProviderStates()} />;
}
