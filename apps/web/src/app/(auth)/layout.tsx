import Link from "next/link";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { LogoMark } from "@/design-system/brand/Logo";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";

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
        <Link
          href="/"
          aria-label={t.a11y.logoHome}
          className="mb-7 flex flex-col items-center gap-3"
        >
          <LogoMark size={72} />
          <span className="text-center">
            <span className="block text-[1.5rem] font-extrabold tracking-[-0.03em]">
              Naija<span className="nf-logo__word-accent">Finds</span>
            </span>
            <span className="block text-[0.8125rem] text-[var(--nf-content-muted)]">
              {t.landing.hero.line1} {t.landing.hero.line2} {t.landing.hero.line3}
            </span>
          </span>
        </Link>

        {children}

        <Link
          href="/"
          className="mt-7 text-[0.8125rem] text-[var(--nf-content-muted)] underline-offset-4 hover:text-[var(--nf-content-secondary)] hover:underline"
        >
          {t.auth.backToHome}
        </Link>
      </div>
    </main>
  );
}
