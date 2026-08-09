import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import { Logo } from "@/design-system/brand/Logo";

/**
 * Site footer.
 *
 * Sits directly on the canvas with hairlines rather than in a card, the calm
 * close to every marketing page: brand block, four link columns, then the
 * copyright line. Columns collapse to two-up on phones so the footer stays
 * tight without becoming a scroll of stacked lists.
 *
 * THREE THINGS CAME OFF IT.
 *
 * A "VERIFIED LISTINGS" BADGE, a shield glyph in the brand blue with an
 * absolute claim beside it, sitting under the wordmark as the last thing a
 * reader met on every page of the site. It is our version of the "100 percent
 * verified" banner both reference platforms lead with, and it is the same
 * problem: verification here is a queue somebody is standing in, and one bad
 * listing turns a badge like that into evidence against us. The claim we can
 * actually make is made properly, as a sentence, in the Why band.
 *
 * A LANGUAGE STRIP of four pills reading EN, YO, HA, IG. The language
 * SWITCHER is in the header and in the phone panel and it actually changes the
 * language. Four pills that only announce the languages exist is a fact
 * restated as decoration, next to the control that does something about it.
 *
 * A "MADE FOR AFRICA" PILL, which is an adjective with a flag on it.
 *
 * The PRODUCT column was also wrong rather than merely decorative. It listed
 * Hotels, Apartments, Restaurants and Experiences, which are the categories
 * this platform stopped having: the hero row, the product home and the search
 * filters all deal in Rent, Buy, Shortlets, Land and Commercial. A footer
 * pointing at four `?type=` values the rest of the site no longer uses is four
 * links to an empty result set.
 */

export function SiteFooter({ t }: { t: Dictionary }) {
  const columns = [
    {
      title: t.landing.footer.product,
      links: [
        { href: "/search?intent=rent", label: t.nav.rent },
        { href: "/search?intent=sale", label: t.nav.buy },
        { href: "/search?type=shortlet", label: t.nav.shortlets },
        { href: "/search?type=land", label: t.nav.land },
        { href: "/search?type=office", label: t.nav.commercial },
      ],
    },
    {
      title: t.landing.footer.company,
      links: [
        { href: "/about", label: t.landing.footer.about },
        { href: "/careers", label: t.landing.footer.careers },
        { href: "/agents", label: t.landing.footer.becomeAgent },
      ],
    },
    {
      title: t.landing.footer.support,
      links: [
        { href: "/help", label: t.landing.footer.help },
        /* The header and the landing page have pointed at /docs the whole
           time. The footer is where somebody looks for it second, and the
           label is the same translated key the header already uses, so the
           two can never end up calling it different things. */
        { href: "/docs", label: t.landing.footer.docs },
        { href: "/contact", label: t.landing.footer.contact },
      ],
    },
    {
      title: t.landing.footer.legal,
      links: [
        { href: "/privacy", label: t.landing.footer.privacy },
        { href: "/terms", label: t.landing.footer.terms },
      ],
    },
  ];

  const year = new Date().getFullYear();

  return (
    <footer className="nf-hairline mt-16 bg-[var(--nf-surface-primary)]">
      <div className="nf-shell pt-14 pb-8 md:pt-16">
        {/* Brand block and link columns */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-[1.6fr_repeat(4,1fr)] md:gap-x-10">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" aria-label="RentMe home" className="nf-tap inline-flex">
              <Logo size={40} wordSize={21} />
            </Link>
            <p className="nf-body-sm mt-5 max-w-[28ch] font-medium text-[var(--nf-content-secondary)]">
              {t.landing.footer.tagline}
            </p>
            <p className="nf-caption mt-2.5 max-w-[34ch]">{t.landing.vision.title}</p>
          </div>

          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="nf-overline mb-3.5">{col.title}</h2>
              {/*
                No `space-y` here on purpose. These links painted at 17px, well
                under the 44px floor, and the gap between them was margin
                rather than target: a thumb aiming at Privacy could land
                between Privacy and Terms and hit neither. The rows now carry
                their own height, so the spacing IS the target rather than
                sitting beside it.
              */}
              <ul>
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="nf-body-sm flex min-h-11 items-center text-[var(--nf-content-secondary)] transition-colors duration-[var(--nf-duration-fast)] hover:text-[var(--nf-content-primary)]"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Copyright line */}
        <div className="nf-hairline nf-caption mt-12 flex flex-col gap-2 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="nf-numeric">{year}</span> RentMe. {t.landing.footer.rights}
          </p>
          <p className="font-medium">
            {t.landing.hero.line1} {t.landing.hero.line2} {t.landing.hero.line3}
          </p>
        </div>
      </div>
    </footer>
  );
}
