import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import type { Dictionary, Locale } from "@vallo/i18n";
import { Logo } from "@/design-system/brand/Logo";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";
import { NavScrollState } from "./NavScrollState";
import { SiteNavLinks } from "./SiteNavLinks";

/**
 * Marketing header, to the governing landing image.
 *
 * Left: the lockup (mark and wordmark, as the render shows it). Centre, from
 * lg up: Home / Properties / Stays / AI / More. Right: the search glyph in a
 * glass square, Sign In as a glass button, Get Started as the one primary,
 * and on phones the panel opener. Theme and language live under More on
 * desktop and inside the phone panel, so the bar carries exactly what the
 * render carries and both controls stay one tap away.
 *
 * `variant="landing"` makes the bar transparent over the hero photograph
 * until the page scrolls (see landing.css and NavScrollState). The content
 * pages never pass it and keep the chrome glass from the first pixel.
 */
export function SiteHeader({
  t,
  locale,
  variant,
}: {
  t: Dictionary;
  locale: Locale;
  variant?: "landing";
}) {
  const nav = t.landing.face.nav;
  const links = [
    { href: "/", label: nav.home },
    { href: "/search", label: nav.properties },
    { href: "/stays", label: nav.stays },
    { href: "/assistant", label: nav.ai },
  ];
  const more = [
    { href: "/about", label: nav.about },
    { href: "/help", label: nav.help },
    { href: "/docs", label: nav.docs },
    { href: "/contact", label: nav.contact },
    { href: "/careers", label: nav.careers },
  ];
  const id = "nf-site-nav";

  return (
    <header id={id} className="nf-site-nav sticky top-0 z-50" data-variant={variant}>
      {variant === "landing" && <NavScrollState target={id} />}
      <div className="nf-site-bar nf-safe-top">
        <div className="nf-shell flex h-header-sm items-center gap-group sm:h-header lg:gap-block">
          <Link href="/" aria-label={t.a11y.logoHome} className="nf-tap shrink-0">
            <Logo size={44} wordSize={22} responsive priority />
          </Link>

          <nav
            aria-label={t.nav.primaryLabel}
            className="mx-auto hidden items-center gap-inline-tight lg:flex"
          >
            <SiteNavLinks
              links={links}
              more={more}
              moreLabel={nav.more}
              /* The theme toggle stood beside the language switcher here
                 until light mode was removed on 23 September 2026. One
                 palette, no control. */
              extras={<LanguageSwitcher current={locale} label={t.a11y.languageSwitcher} compact />}
            />
          </nav>

          <div className="ms-auto flex items-center gap-inline lg:ms-0">
            <Link
              href="/search"
              prefetch
              aria-label={nav.search}
              className="nf-site-nav-glass nf-site-nav-glass--icon hidden sm:inline-flex"
            >
              <UiIcon name="search" size={18} aria-hidden />
            </Link>
            <Link href="/sign-in" prefetch className="nf-site-nav-glass hidden sm:inline-flex">
              {nav.signIn}
            </Link>
            {/* /start, not /sign-up: two intro screens explaining what Vallo
                is, with Skip on both. See (auth)/start/StartCarousel.tsx. */}
            <ButtonLink href="/start" variant="primary" size="sm">
              {nav.getStarted}
            </ButtonLink>
            <MobileMenu
              links={[...links, ...more]}
              locale={locale}
              languageLabel={t.a11y.languageSwitcher}
              signIn={nav.signIn}
              signUp={nav.getStarted}
              openLabel={t.a11y.openMenu}
              closeLabel={t.a11y.closeMenu}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
