import type { Metadata } from "next";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getProviderStates } from "@/lib/auth/providers";
import { signInWithEmail } from "@/lib/auth/actions";
import { AuthPanel } from "@/components/auth/AuthPanel";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function SignInPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <AuthPanel mode="sign-in" t={t} providers={getProviderStates()} action={signInWithEmail} />
  );
}
