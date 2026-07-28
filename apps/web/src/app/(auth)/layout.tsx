import Link from "next/link";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { LogoLockup } from "@/design-system/brand/Logo";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";

/**
 * Auth shell.
 *
 * Follows the supplied reference: the full logo lockup centred, the tagline
 * beneath it, then the panel. The lockup is used here rather than the mark plus
 * live wordmark because this is the one place the logo is shown large, which is
 * exactly what the supplied artwork is for.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <main
      id="main"
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-12"
    >
      <div className="nf-aurora" aria-hidden="true" />
      <div className="nf-grid-veil" aria-hidden="true" />

      <div className="absolute right-5 top-5 z-20">
        <LanguageSwitcher current={locale} label={t.a11y.languageSwitcher} compact />
      </div>

      <div className="relative z-10 flex w-full flex-col items-center">
        <Link href="/" aria-label={t.a11y.logoHome} className="flex flex-col items-center">
          <LogoLockup size={188} priority />
          <span className="mt-1 text-[0.8125rem] text-[var(--nf-content-muted)]">
            {t.landing.hero.line1} {t.landing.hero.line2} {t.landing.hero.line3}
          </span>
        </Link>

        <div className="mt-8 w-full max-w-[24rem]">{children}</div>

        <Link
          href="/"
          className="mt-8 text-[0.8125rem] text-[var(--nf-content-muted)] underline-offset-4 hover:text-[var(--nf-content-secondary)] hover:underline"
        >
          {t.auth.backToHome}
        </Link>
      </div>
    </main>
  );
}
