import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import type { Dictionary, Locale } from "@naijafinds/i18n";
import { Logo } from "@/design-system/brand/Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Marketing header.
 *
 * This rail used to be the product's categories: Properties, Hotels,
 * Restaurants, Experiences, Services, each pointing at `/search?type=...`.
 * Every one of them dropped a signed-out visitor straight into the product,
 * which is now behind a session, so each was a link to a redirect.
 *
 * What belongs on a marketing header is the marketing site: what this is, what
 * the rules are, and how to get in. Categories are the first thing you see
 * AFTER signing up, and putting them here promised a catalogue that a stranger
 * cannot open.
 *
 * The links are the same list the phone panel gets, so the two cannot drift.
 */
export function SiteHeader({ t, locale }: { t: Dictionary; locale: Locale }) {
  const links = [
    { href: "/", label: t.landing.navHome },
    { href: "/docs", label: t.landing.footer.docs },
    { href: "/help", label: t.landing.footer.help },
    { href: "/privacy", label: t.landing.footer.privacy },
    { href: "/terms", label: t.landing.footer.terms },
  ];

  return (
    <header className="sticky top-0 z-50">
      <div className="nf-glass nf-safe-top border-b border-transparent">
        <div className="nf-shell flex h-[60px] items-center justify-between gap-4 sm:h-[72px] sm:gap-6">
          <Link href="/" aria-label={t.a11y.logoHome} className="nf-tap shrink-0">
            <Logo size={46} wordSize={21} responsive priority />
          </Link>

          <nav aria-label={t.nav.primaryLabel} className="hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-[var(--nf-radius-sm)] px-3.5 py-2 text-[0.9rem] font-medium text-[var(--nf-content-primary)] transition-colors hover:bg-[var(--nf-glass-fill)] hover:text-[var(--nf-content-primary)]"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme and language sit together because they are the same kind
                of control: how this page is presented to you, decided by you.
                Both were already in the product and neither was on the page a
                first-time visitor actually lands on. */}
            <div className="hidden items-center gap-1 sm:flex">
              <ThemeToggle />
              <LanguageSwitcher current={locale} label={t.a11y.languageSwitcher} compact />
            </div>
            <ButtonLink
              href="/sign-in"
              variant="primary"
              size="sm"
              className="hidden sm:inline-flex"
            >
              {t.common.signIn}
            </ButtonLink>
            <ButtonLink href="/sign-up" variant="primary" size="sm" className="nf-signup-btn">
              {t.common.signUp}
            </ButtonLink>
            <MobileMenu
              links={links}
              locale={locale}
              languageLabel={t.a11y.languageSwitcher}
              signIn={t.common.signIn}
              signUp={t.common.signUp}
              openLabel={t.a11y.openMenu}
              closeLabel={t.a11y.closeMenu}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
