import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getProviderStates } from "@/lib/auth/providers";
import { AuthChoices } from "@/components/auth/AuthChoices";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

/**
 * Notices the auth callback can send here. A link that has expired or been
 * used already is the common case and deserves a plain sentence, not a silent
 * return to an empty form where the person cannot tell what went wrong.
 *
 * They land on the chooser rather than the form because every one of them is
 * about getting in at all, not about the email route specifically.
 */
const NOTICES: Record<string, string> = {
  "link-expired":
    "That link has expired or was already used. Sign in below, or ask for a new link.",
  "link-invalid": "That link was incomplete. Sign in below and it will work as normal.",
  unconfigured: "Accounts switch on the moment the platform keys land.",
  "signed-out": "You are signed out. Sign in whenever you are ready.",
  /*
   * Sent by the middleware when somebody reaches a product address without a
   * session. It names the reason rather than dropping them on a bare form,
   * because arriving at a sign-in screen you did not ask for is confusing
   * enough to read as a bug.
   */
  "sign-in-required": "Sign in to open that. It takes a moment, and new accounts are free.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; next?: string }>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const { notice, next } = await searchParams;
  const noticeText = notice ? NOTICES[notice] : undefined;

  return (
    <AuthChoices
      mode="sign-in"
      t={t}
      providers={getProviderStates()}
      notice={noticeText}
      next={next}
    />
  );
}
