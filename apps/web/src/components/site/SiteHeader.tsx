import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import type { Dictionary, Locale } from "@vallo/i18n";
import { Logo } from "@/design-system/brand/Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Marketing header.
 *
 * FIVE LINKS BECAME THREE, AND TWO PRIMARY BUTTONS BECAME ONE.
 *
 * The rail was Home, Docs, Help, Privacy, Terms. Home is the wordmark two
 * centimetres to its left, so it was the same destination twice on one row.
 * Privacy and Terms are the two documents nobody has ever navigated to from a
 * header: they belong in the footer, they are already in the footer, and
 * putting them up here spends a third of a stranger's first read on legal
 * boilerplate. What is left is the three things a stranger actually wants:
 * what is on it, how it works, and where to get help.
 *
 * The right-hand side carried Sign in AND Sign up, both `variant="primary"`,
 * both filled, adjacent. Two filled buttons touching is a coin toss rather than
 * an invitation. Sign up keeps the fill because it is what this page is for;
 * Sign in becomes a quiet link, which is also the truthful hierarchy, since
 * somebody who already has an account is not who a marketing page is written
 * for.
 *
 * The links are the same list the phone panel gets, so the two cannot drift.
 */
export function SiteHeader({ t, locale }: { t: Dictionary; locale: Locale }) {
  const links = [
    { href: "/search", label: t.nav.explore },
    { href: "/docs", label: t.landing.footer.docs },
    { href: "/help", label: t.landing.footer.help },
  ];

  return (
    <header className="sticky top-0 z-50">
      <div className="nf-site-bar nf-safe-top">
        <div className="nf-shell flex h-[60px] items-center gap-group sm:h-[72px] sm:gap-heading">
          <Link href="/" aria-label={t.a11y.logoHome} className="nf-tap shrink-0">
            <Logo size={46} wordSize={21} responsive priority />
          </Link>

          {/*
            The rail sits beside the wordmark rather than floating in the middle
            of the bar. `justify-between` on three groups pushed it to the
            optical centre, where it read as a third thing competing with the
            brand and the actions; hung off the logo it reads as belonging to
            it, and the whole right-hand side becomes one block of controls.
          */}
          <nav aria-label={t.nav.primaryLabel} className="hidden items-center lg:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                prefetch
                className="nf-body-sm rounded-[var(--nf-radius-sm)] px-row py-inline font-medium text-[var(--nf-content-secondary)] transition-colors duration-[var(--nf-duration-fast)] hover:bg-[var(--nf-interactive-hover)] hover:text-[var(--nf-content-primary)]"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-inline sm:gap-row">
            {/* Theme and language sit together because they are the same kind
                of control: how this page is presented to you, decided by you. */}
            <div className="hidden items-center gap-inline-tight sm:flex">
              <ThemeToggle />
              <LanguageSwitcher current={locale} label={t.a11y.languageSwitcher} compact />
            </div>
            <Link
              href="/sign-in"
              prefetch
              className="nf-link-quiet nf-tap nf-body-sm hidden sm:inline-flex"
            >
              {t.common.signIn}
            </Link>
            {/* /start, not /sign-up: two intro screens explaining what Vallo
                is, with Skip on both. See (auth)/start/StartCarousel.tsx. */}
            <ButtonLink href="/start" variant="primary" size="sm">
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
