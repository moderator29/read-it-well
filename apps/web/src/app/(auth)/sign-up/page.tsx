import type { Metadata } from "next";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getProviderStates } from "@/lib/auth/providers";
import { signUpWithEmail } from "@/lib/auth/actions";
import { AuthPanel } from "@/components/auth/AuthPanel";

export const metadata: Metadata = {
  title: "Create your account",
  robots: { index: false, follow: false },
};

export default async function SignUpPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <AuthPanel mode="sign-up" t={t} providers={getProviderStates()} action={signUpWithEmail} />
  );
}
