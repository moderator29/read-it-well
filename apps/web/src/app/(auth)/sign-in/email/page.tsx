import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { signInWithEmail } from "@/lib/auth/actions";
import { EmailAuthForm } from "@/components/auth/EmailAuthForm";

export const metadata: Metadata = {
  title: "Sign in with email",
  robots: { index: false, follow: false },
};

export default async function SignInEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const locale = await getLocale();
  const t = getDictionary(locale);

  return <EmailAuthForm mode="sign-in" t={t} action={signInWithEmail} next={next} />;
}
