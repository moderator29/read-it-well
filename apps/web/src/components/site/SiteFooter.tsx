import Link from "next/link";
import type { Dictionary } from "@vallo/i18n";
import { Logo } from "@/design-system/brand/Logo";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { NewsletterForm } from "./NewsletterForm";

/**
 * Site footer, to the governing fullpage image.
 *
 * Brand block with the legal name and one line about the company, four link
 * columns, the "stay connected" column with the email field, then the legal
 * line. VALLO SPACES LTD appears here and in the copyright because a footer's
 * legal line is a legal surface; it appears nowhere else on the page.
 *
 * No social icons. The render shows five; the company has no published
 * handles, and five glyphs linking to nothing is the kind of picture of a
 * feature this platform does not ship.
 */
export function SiteFooter({ t }: { t: Dictionary }) {
  const f = t.landing.footer;
  const face = t.landing.face;
  /*
   * THREE COLUMNS, on the founder's ruling of 19 September, matching the
   * render: Product, Company, Support.
   *
   * The fourth column was Legal, and it held Terms, Privacy and Cookies. All
   * three already sit in the legal line at the very foot of the page, which
   * is where the render puts them, so the column was printing the same three
   * links twice on one screen. Dropping it is what makes the layout the
   * render's, and it loses no destination.
   *
   * Every entry points at a route that exists, checked against app/(site) and
   * the sitemap. The render also lists Blog and Press under Company; there is
   * no blog and no press room, and a link labelled Blog that opens the docs
   * is a picture of a feature, so those two wait for the pages.
   */
  const columns = [
    {
      title: f.product,
      links: [
        /* Markets, not categories (V-26): `type=home` showed houses to let
           under Buy, and `type=rental` missed every flat to let. */
        { href: "/search?market=buy", label: face.footer.buy },
        { href: "/search?market=rent", label: face.footer.rent },
        { href: "/stays", label: face.nav.stays },
        /* The render's Product column lists Invest, pointing at land. Vallo
           sells no investment product, so the slot carries Restaurants,
           which is a shipped surface. Land is still a door on the landing's
           category grid and in the search filters. */
        { href: "/restaurants", label: face.footer.restaurants },
        { href: "/assistant", label: face.footer.ai },
      ],
    },
    {
      title: f.company,
      links: [
        { href: "/about", label: face.footer.aboutUs },
        { href: "/careers", label: f.careers },
        { href: "/agents", label: f.becomeAgent },
        { href: "/contact", label: f.contact },
      ],
    },
    {
      title: f.support,
      links: [
        { href: "/help", label: face.footer.helpSupport },
        { href: "/docs", label: f.docs },
        { href: "/safety", label: face.footer.safety },
        { href: "/standards", label: face.footer.standards },
        { href: "/cancellations", label: face.footer.cancellations },
      ],
    },
  ];

  /*
   * THE SOCIAL ROW, on the same ruling: X and Telegram.
   *
   * Each handle is read from the environment and a glyph is drawn only for a
   * handle that exists, because a social mark that opens nothing is the
   * clearest possible picture of a feature. Set `NEXT_PUBLIC_VALLO_X_URL` and
   * `NEXT_PUBLIC_VALLO_TELEGRAM_URL` and the two marks appear, with no code
   * change. `rel="me"` states the account is ours, which is what X and
   * Telegram read for verification, and `noopener` is the usual precaution on
   * a new tab.
   */
  const socials = [
    { url: process.env.NEXT_PUBLIC_VALLO_X_URL, icon: "x-social" as const, label: "X" },
    {
      url: process.env.NEXT_PUBLIC_VALLO_TELEGRAM_URL,
      icon: "telegram" as const,
      label: "Telegram",
    },
  ].filter((row): row is { url: string; icon: "x-social" | "telegram"; label: string } =>
    Boolean(row.url),
  );

  const year = new Date().getFullYear();

  return (
    <footer className="nf-site-footer">
      <div className="nf-shell pt-section pb-block">
        <div className="nf-site-footer-grid">
          <div className="nf-site-footer-brand">
            <Link href="/" aria-label={t.a11y.logoHome} className="nf-tap inline-flex">
              <Logo size={44} wordSize={20} />
            </Link>
            <p className="nf-overline mt-heading text-[var(--nf-content-primary)]">
              {face.footer.legalName}
            </p>
            <p className="nf-body-sm mt-inline max-w-measure-lede text-[var(--nf-content-secondary)]">
              {face.footer.legalLine}
            </p>
          </div>

          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="nf-overline mb-row text-[var(--nf-brand-secondary)]">{col.title}</h2>
              <ul>
                {col.links.map((l) => (
                  <li key={`${l.href}-${l.label}`}>
                    <Link href={l.href} className="nf-site-footer-link">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="nf-site-footer-connect">
            <h2 className="nf-overline mb-row text-[var(--nf-brand-secondary)]">
              {face.footer.stayConnected}
            </h2>
            <p className="nf-body-sm mb-group text-[var(--nf-content-secondary)]">
              {face.footer.newsletterBody}
            </p>
            <NewsletterForm
              label={face.footer.emailLabel}
              placeholder={face.footer.emailPlaceholder}
              submit={face.footer.subscribe}
              note={face.footer.newsletterNote}
              done={face.footer.subscribed}
            />
            {socials.length > 0 && (
              <ul className="nf-site-footer-social">
                {socials.map((row) => (
                  <li key={row.label}>
                    <a
                      href={row.url}
                      className="nf-site-footer-social__link"
                      target="_blank"
                      rel="me noopener noreferrer"
                    >
                      <UiIcon name={row.icon} size={18} label={row.label} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* The render draws a faint skyline along the foot of the page with a
            small shield sitting on it. Both are decorative: one inline path in
            the brand ink at low opacity, no asset, no request. */}
        <div className="nf-site-footer-skyline" aria-hidden="true">
          <svg viewBox="0 0 1200 80" preserveAspectRatio="none" role="presentation" focusable="false">
            <path d="M0 80V60 H9 V68 H20 V28 H26 V46 H32 V68 H45 V56 H58 V64 H64 V40 H75 V56 H81 V28 H87 V68 H98 V64 H111 V68 H119 V40 H132 V56 H138 V28 H144 V52 H152 V60 H163 V64 H176 V52 H189 V60 H202 V56 H208 V64 H217 V64 H230 V68 H243 V56 H256 V28 H267 V46 H278 V34 H289 V52 H298 V60 H306 V56 H321 V52 H327 V34 H340 V34 H349 V64 H358 V28 H364 V60 H375 V60 H384 V40 H395 V64 H401 V46 H414 V46 H423 V34 H436 V34 H449 V64 H455 V34 H464 V64 H479 V52 H485 V34 H500 V40 H509 V46 H524 V34 H530 V60 H539 V64 H552 V68 H563 V52 H571 V56 H579 V40 H590 V64 H601 V34 H609 V28 H620 V60 H629 V28 H640 V40 H649 V40 H658 V60 H666 V60 H672 V56 H680 V56 H695 V34 H701 V60 H714 V52 H723 V60 H729 V28 H740 V46 H749 V28 H757 V68 H770 V28 H781 V40 H792 V40 H803 V34 H809 V40 H824 V56 H830 V56 H836 V60 H847 V46 H853 V68 H866 V68 H872 V60 H885 V64 H898 V68 H907 V56 H913 V40 H926 V52 H934 V46 H943 V64 H954 V34 H960 V34 H971 V52 H982 V60 H988 V46 H994 V52 H1009 V60 H1020 V68 H1033 V28 H1041 V60 H1050 V28 H1065 V28 H1071 V64 H1080 V52 H1095 V46 H1108 V46 H1116 V28 H1124 V28 H1137 V56 H1146 V56 H1159 V40 H1167 V56 H1182 V28 H1190 V46 H1200 V80 H1200 Z" />
          </svg>
          <span className="nf-site-footer-seal">
            <BrandIcon name="shield-check" fill />
          </span>
        </div>

        <div className="nf-site-footer-legal">
          <p className="nf-caption">
            &copy; <span className="nf-numeric">{year}</span> {face.footer.legalName}. {f.rights}
          </p>
          {/*
            DELETE ACCOUNT SITS BESIDE PRIVACY AND TERMS, AND IT IS A STORE
            REQUIREMENT RATHER THAN A COURTESY.

            Google Play will not pass a submission without a publicly
            reachable page that explains how to request account deletion and
            what is destroyed against what is kept, and a reviewer looks for
            it in the legal line at the foot of the site. `/delete-account`
            has been built and live in `app/(site)` and linked from nowhere,
            which is the same as not having it.
          */}
          <p className="nf-caption flex flex-wrap gap-group">
            <Link href="/terms" className="nf-site-footer-link">
              {f.terms}
            </Link>
            <Link href="/privacy" className="nf-site-footer-link">
              {f.privacy}
            </Link>
            <Link href="/disclaimer" className="nf-site-footer-link">
              {f.disclaimer}
            </Link>
            <Link href="/delete-account" className="nf-site-footer-link">
              {f.deleteAccount}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
