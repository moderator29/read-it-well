import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import { Logo } from "@/design-system/brand/Logo";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { MobileMenu } from "./MobileMenu";
import { NavScrollState } from "./NavScrollState";
import { SiteNavLinks } from "./SiteNavLinks";

/**
 * Marketing header, to the governing landing image.
 *
 * Left: the lockup (mark and wordmark, as the render shows it). Centre, from
 * lg up: Home / Properties / Stays / AI / More. Right: the search glyph in a
 * glass square, Sign In as a glass button, Get Started as the one primary,
 * and on phones the panel opener. The bar carries exactly what the render
 * carries; language is changed in Settings and nowhere else.
 *
 * `variant="landing"` makes the bar transparent over the hero photograph
 * until the page scrolls (see landing.css and NavScrollState). The content
 * pages never pass it and keep the chrome glass from the first pixel.
 */
export function SiteHeader({
  t,
  variant,
}: {
  t: Dictionary;
  /** Still passed by the layouts; the bar no longer draws a language control. */
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
    <header
      id={id}
      className="nf-site-nav sticky top-0 z-50"
      data-variant={variant}
      /* The bar is a night island. The landing's floats over the hero's night
         photograph and NavScrollState hands it back to the reader's theme
         once the page scrolls under it. Every other page keeps it: in light
         it is the navy VALLO band over light content (founder reference 05,
         29 September 2026), the bar's canvas glass resolving to the night
         canvas, and the logo in it keeps the night artwork. */
      data-theme="dark"
      data-over-night={variant === "landing" ? "" : undefined}
      suppressHydrationWarning
    >
      {variant === "landing" && <NavScrollState target={id} />}
      <div className="nf-site-bar nf-safe-top">
        <div className="nf-shell flex h-header-sm items-center gap-inline min-[22.5rem]:gap-group sm:h-header lg:gap-block">
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
              /* No language control here: language is changed in Settings
                 and nowhere else (founder, 29 September 2026). */
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
            {/* /start, not /sign-up: it sends a stranger to the Get started
                intro (`/welcome?next=/sign-up`, `app/welcome/WelcomeIntro.tsx`),
                which is not skippable, and on to the sign-up options. */}
            <ButtonLink href="/start" variant="primary" size="sm">
              {nav.getStarted}
            </ButtonLink>
            <MobileMenu
              links={[...links, ...more]}
              signIn={nav.signIn}
              signUp={nav.getStarted}
              openLabel={t.a11y.openMenu}
              closeLabel={t.a11y.closeMenu}
              menuLabel={t.a11y.railNav}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
