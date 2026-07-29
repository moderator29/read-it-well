import Link from "next/link";
import type { Dictionary, Locale } from "@naijafinds/i18n";
import { Logo } from "@/design-system/brand/Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { MobileMenu } from "./MobileMenu";

/**
 * Marketing header.
 *
 * Navigation matches the landing reference exactly: Home, Properties, Hotels,
 * Restaurants, Experiences, Services. This is the marketing rail and is not the
 * same as the in product rail, which is a different, longer list.
 */
export function SiteHeader({ t, locale }: { t: Dictionary; locale: Locale }) {
  const links = [
    { href: "/", label: t.landing.navHome },
    { href: "/search?type=property", label: t.nav.properties },
    { href: "/search?type=hotel", label: t.nav.hotels },
    { href: "/search?type=restaurant", label: t.nav.restaurants },
    { href: "/search?type=experience", label: t.nav.experiences },
    { href: "/search?type=service", label: t.nav.services },
  ];

  return (
    <header className="sticky top-0 z-50">
      <div className="nf-glass border-b border-transparent">
        <div className="nf-shell flex h-[60px] items-center justify-between gap-4 sm:h-[72px] sm:gap-6">
          <Link href="/" aria-label={t.a11y.logoHome} className="shrink-0">
            <Logo size={40} wordSize={19} responsive priority />
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

          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="hidden sm:block">
              <LanguageSwitcher current={locale} label={t.a11y.languageSwitcher} compact />
            </div>
            <Link href="/sign-in" className="nf-btn nf-btn--glass hidden sm:inline-flex">
              {t.common.signIn}
            </Link>
            <Link href="/sign-up" className="nf-btn nf-btn--primary px-4 py-2.5 text-[0.875rem] sm:px-[1.35rem] sm:py-[0.8rem] sm:text-[var(--nf-text-body)]">
              {t.common.signUp}
            </Link>
            <MobileMenu
              links={links}
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
