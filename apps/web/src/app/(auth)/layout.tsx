import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
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
 *
 * The panel itself is a floating glass card over the ambient aurora, and the
 * three blocks (lockup, panel, back link) rise in with a short stagger so the
 * page settles rather than snapping into place. The lockup is sized so the
 * whole frame breathes on a 390px screen without scrolling the fold away.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <main
      id="main"
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-10 sm:py-12"
    >
      <div className="nf-aurora" aria-hidden="true" />
      <div className="nf-grid-veil" aria-hidden="true" />

      <div className="absolute right-5 top-5 z-20">
        <LanguageSwitcher current={locale} label={t.a11y.languageSwitcher} compact />
      </div>

      <div className="relative z-10 flex w-full flex-col items-center">
        {/* Brand block. Phone-first sizing: 104px reads generous without
            pushing the panel below the fold on small screens. */}
        <Link
          href="/"
          aria-label={t.a11y.logoHome}
          className="nf-rise flex flex-col items-center"
        >
          <LogoLockup size={104} priority />
          <span className="mt-1 text-center text-[0.8125rem] text-[var(--nf-content-muted)]">
            {t.landing.hero.line1} {t.landing.hero.line2} {t.landing.hero.line3}
          </span>
        </Link>

        {/* The glass panel. Each auth page renders its form inside this one
            shared frame so sign in and sign up feel like the same object. */}
        <div
          className="nf-card nf-rise mt-7 w-full max-w-[24rem] p-6 sm:p-7"
          style={{ animationDelay: "90ms" }}
        >
          {children}
        </div>

        <Link
          href="/"
          className="nf-tap nf-rise mt-7 text-[0.8125rem] text-[var(--nf-content-muted)] underline-offset-4 hover:text-[var(--nf-content-secondary)] hover:underline"
          style={{ animationDelay: "180ms" }}
        >
          {t.auth.backToHome}
        </Link>
      </div>
    </main>
  );
}
