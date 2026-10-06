import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AuthCap } from "@/components/auth/slate";
import { AuthBackBar } from "./AuthBackBar";
import { AuthFocal } from "./AuthFocal";
import { AuthGround } from "./AuthGround";
import { AuthHeroLine } from "./AuthHeroLine";
import { KeepPillInView } from "./KeepPillInView";
import { AuthMain } from "./AuthMain";
import { ForgetOnSignOut } from "@/components/app/offline/ForgetOnSignOut";
import "@/app/css/auth.css";

/**
 * Auth shell: one full-height screen, one Island (W11, 6 October 2026).
 *
 * Top to bottom: the BOWL, full bleed at every width (the way back in its
 * toolbar, the vector wordmark centred, one line under it chosen by the
 * screen, all over a photograph of a place or the brand's own blue, under a
 * navy scrim: `AuthCap`, `AuthGround`); the OBJECT sitting across the bowl's
 * edge (`AuthFocal`); the screen's own content in ONE ISLAND (`.nf-island`,
 * navy glass at night, white with the blue shadow on Paper); and the small
 * print at the foot. Every auth screen renders inside the same shell, so
 * sign in, sign up, the code, the reset and the recovery read as the same
 * place, as they have since 29 September (D28: the bowl, the object and the
 * order are the ones a member already knows; the material is what changed).
 *
 * The island is the only container on the screen, which is the north star's
 * rule that an Island is one per view; the fields inside it are plates, not
 * further cards. The pieces are `components/auth/slate.tsx`; the whole
 * surface is `app/css/auth.css`.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <AuthMain>
      {/* V-35, V-77: a phone at the way in keeps nobody's gate code or shortlist. */}
      <ForgetOnSignOut />
      <KeepPillInView />
      <AuthCap
        brandLabel={t.a11y.logoHome}
        start={<AuthBackBar />}
        ground={<AuthGround />}
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

      <div className="nf-auth__body">
        <div className="nf-auth__stage">
          <div className="nf-auth__focal" aria-hidden="true">
            <AuthFocal />
          </div>
          <section className="nf-island nf-auth__island">{children}</section>
        </div>
      </div>

      {/*
        The small print, at the foot of every auth screen. It has to be on the
        screen, because a person who makes an account with Google from here
        passes no tick.
      */}
      {/*
        NOT PREFETCHED (C6, R3-18 round 2). The small print sits on the first
        screen of every auth page, and a link in view prefetches its route:
        the three documents pulled the public site's stylesheets and scripts
        into a sign-in that will almost never open them. They load when
        tapped.
      */}
      <p className="nf-auth__legal">
        {t.auth.termsNotice} <Link href="/terms" prefetch={false}>{t.safety.termsLink}</Link>
        {" · "}
        <Link href="/privacy" prefetch={false}>{t.safety.privacyLink}</Link>
        {" · "}
        <Link href="/eula" prefetch={false}>{t.safety.rulesLink}</Link>
      </p>
    </AuthMain>
  );
}
