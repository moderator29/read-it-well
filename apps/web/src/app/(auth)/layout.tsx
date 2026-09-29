import Image from "next/image";
import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { AuthBackBar } from "./AuthBackBar";
import { ForgetOnSignOut } from "@/components/app/offline/ForgetOnSignOut";

/**
 * Auth shell: one full-height screen, not a card on a stage.
 *
 * Top to bottom: a single 44px bar (the way back, the app tile, the
 * language control), the screen's own content in one column, and the small
 * print pinned to the foot. Every auth screen renders inside the same column
 * so sign in, sign up, the code, the reset and the recovery read as the same
 * place; only the column's contents change. `app/css/auth.css` is the whole
 * surface.
 *
 * THE BRAND IS THE APP TILE, ONCE, AT 40PX. The earlier composition drew the
 * tile and the chrome wordmark as one lockup that took about 45 per cent of a
 * 390 x 844 screen, and the tile already carries the word, so the name was
 * printed twice above a card that then had to squeeze the form into what was
 * left. The tile is a self-contained night object, so it reads the same on
 * the dark ground and on the light one.
 *
 * BOTH THEMES. The subtree follows the document's theme (the palette is
 * `tokens.css`, light on `:root[data-theme="light"]`), so the shared field,
 * button and glass rules paint their own light versions here as everywhere
 * else. Light mode was reintroduced on 25 September (`lib/theme/theme.ts`).
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <main id="main" className="nf-auth">
      {/* V-35, V-77: a phone at the way in keeps nobody's gate code or shortlist. */}
      <ForgetOnSignOut />
      <div className="nf-auth__top">
        <div className="nf-auth__top-start">
          <AuthBackBar />
        </div>
        <Link href="/" aria-label={t.a11y.logoHome} className="nf-auth__brand">
          <Image
            src="/brand/vallo-icon.png"
            alt=""
            width={40}
            height={40}
            sizes="40px"
            priority
            className="nf-auth__mark"
          />
        </Link>
        <div className="nf-auth__lang">
          <LanguageSwitcher current={locale} label={t.a11y.languageSwitcher} compact />
        </div>
      </div>

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
