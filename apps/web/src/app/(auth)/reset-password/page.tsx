import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

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

  const signedIn = await (async () => {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      return Boolean(data.user);
    } catch {
      return false;
    }
  })();

  if (!signedIn) {
    return (
      <div className="w-full text-center">
        <h1 className="nf-h2">{t.auth.resetExpiredTitle}</h1>
        <p className="mx-auto mt-2 max-w-[36ch] text-[0.875rem] leading-relaxed text-[var(--nf-content-muted)]">
          {t.auth.resetExpiredLead}
        </p>
        <Link
          href="/forgot-password"
          className="nf-btn nf-btn--primary nf-btn--lg mt-6 w-full justify-center"
        >
          {t.auth.resetSend}
        </Link>
      </div>
    );
  }

  return <ResetPasswordForm t={t} />;
}
