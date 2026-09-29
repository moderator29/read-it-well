import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { passwordChangeProof, type PasswordChangeProof } from "@/lib/auth/password-change-proof";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

/*
 * The session is the ticket, so this page has to run per request. Cached, it
 * would serve one visitor's answer to the next.
 */
export const dynamic = "force-dynamic";

/**
 * The end of the reset flow.
 *
 * A recovery link goes to `/auth/callback`, which exchanges its code for a
 * session and forwards here. So arriving here with a session means the link
 * worked, and arriving without one means it expired, was already used, or the
 * URL was opened directly - and each of those deserves the same plain sentence
 * and a way to ask for another link, rather than a password form that would
 * fail on submit for reasons nobody could see.
 */
export default async function ResetPasswordPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  const proof = await (async (): Promise<PasswordChangeProof | null> => {
    if (!isSupabaseConfigured()) return null;
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      return data.user ? await passwordChangeProof(supabase, data.user) : null;
    } catch {
      return null;
    }
  })();

  if (!proof) {
    return (
      <div className="nf-auth__screen">
        <h1 className="nf-auth__title">{t.auth.resetExpiredTitle}</h1>
        <p className="nf-auth__sub">{t.auth.resetExpiredLead}</p>
        <div className="nf-auth__form">
          <Link href="/forgot-password" className="nf-btn nf-btn--primary nf-btn--full nf-auth__cta">
            {t.auth.resetSend}
          </Link>
          {/* A link opened in another browser lands here, and the code in the
              same email works anywhere. */}
          <Link href="/forgot-password/code" className="nf-btn nf-btn--glass nf-btn--full nf-auth__door">
            {t.auth.resetEnterCode}
          </Link>
        </div>
      </div>
    );
  }

  return <ResetPasswordForm t={t} askCurrent={proof === "current-password"} />;
}
