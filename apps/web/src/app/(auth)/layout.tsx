import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AuthCurveBlock } from "@/components/auth/slate";
import { AuthBackBar } from "./AuthBackBar";
import { AuthHeroLine } from "./AuthHeroLine";
import { KeepPillInView } from "./KeepPillInView";
import { ForgetOnSignOut } from "@/components/app/offline/ForgetOnSignOut";

/**
 * Auth shell: one full-height screen, to the Slate references of 29
 * September (`docs/design/references/2026-09-29`, 12 and 14).
 *
 * Top to bottom: the CURVED TOP BLOCK, full bleed at every width (the way
 * back in its toolbar; language lives in Settings only, the founder's rule
 * of 29 September, the wordmark in spaced
 * capitals, one line under it chosen by the screen), then the screen's own
 * content in one centred column on the page colour, and the small print at
 * the foot. Every auth screen renders inside the same shell, so sign in, sign
 * up, the code, the reset and the recovery read as the same place.
 *
 * THE THEME RULE (the founder's): in light the block, the pill and the focus
 * outline are the brand, navy to neon blue, on white; in dark they invert to
 * a light block and a white pill on dark navy. The block and its pieces are
 * `components/auth/slate.tsx`; the whole surface is `app/css/auth.css`.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <main id="main" className="nf-auth nf-slate">
      {/* V-35, V-77: a phone at the way in keeps nobody's gate code or shortlist. */}
      <ForgetOnSignOut />
      <KeepPillInView />
      <AuthCurveBlock
        brandLabel={t.a11y.logoHome}
        wordmark={t.auth.wordmark}
        start={<AuthBackBar />}
        line={
          <AuthHeroLine
            lines={{
              signIn: t.auth.heroSignIn,
              signUp: t.auth.heroSignUp,
              verify: t.auth.heroVerify,
              reset: t.auth.heroReset,
            }}
          />
        }
      />

      <div className="nf-auth__body">{children}</div>

      {/*
        The small print, at the foot of every auth screen. It has to be on the
        screen, because a person who makes an account with Google from here
        passes no tick.
      */}
      <p className="nf-auth__legal">
        {t.auth.termsNotice} <Link href="/terms">{t.safety.termsLink}</Link>
        {" · "}
        <Link href="/privacy">{t.safety.privacyLink}</Link>
        {" · "}
        <Link href="/eula">{t.safety.rulesLink}</Link>
      </p>
    </main>
  );
}
