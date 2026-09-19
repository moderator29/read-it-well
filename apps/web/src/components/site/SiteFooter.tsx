import Link from "next/link";
import type { Dictionary } from "@vallo/i18n";
import { Logo } from "@/design-system/brand/Logo";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
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
   * The render's four columns, with every entry pointing at a route that
   * exists (checked against app/(site) and the sitemap).
   *
   * The render also lists Blog and Press under Company and a row of five
   * social glyphs under Stay connected. There is no blog, no press room and
   * no published handle, and a link labelled Blog that opens the docs, or a
   * glyph that opens nothing, is a picture of a feature. They are left out
   * until the pages and the accounts exist; the columns they belong to are
   * built to take them.
   */
  const columns = [
    {
      title: f.product,
      links: [
        { href: "/search?type=home", label: face.footer.buy },
        { href: "/search?type=rental", label: face.footer.rent },
        { href: "/stays", label: face.nav.stays },
        { href: "/search?type=land", label: face.footer.invest },
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
    {
      title: f.legal,
      links: [
        { href: "/terms", label: face.footer.termsOfService },
        { href: "/privacy", label: face.footer.privacyPolicy },
        { href: "/privacy", label: face.footer.cookies },
      ],
    },
  ];

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
                  <li key={l.href}>
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
          </div>
        </div>

        {/* The render draws a faint skyline along the foot of the page with a
            small shield sitting on it. Both are decorative: one inline path in
            the brand ink at low opacity, no asset, no request. */}
        <div className="nf-site-footer-skyline" aria-hidden="true">
          <svg viewBox="0 0 1200 80" preserveAspectRatio="none" role="presentation" focusable="false">
            <path d="M0 80V56h28V38h22v18h26V28h20v28h30V44h24v12h26V22h22v34h28V40h24v16h26V30h22v26h30V18h20v38h28V46h24v10h26V34h22v22h30V24h20v32h28V42h24v14h26V26h22v30h30V38h20v18h28V20h24v36h26V44h22v12h30V32h20v24h28V48h24v8h26V36h22v20h30V26h20v30h28V44h24v12h26V30h22v26h30V40h20v16h28V50h24v6h26V38h22v18h30V28h20v28h28V46h24v10h26V34h22v22h30V42h20v14h28V52h24v4h26V40h22v16h30V30h20v26h28V48h24v8h26V44h22v12h30V36h20v20h28V50h24v6h20v24z" />
          </svg>
          <span className="nf-site-footer-seal">
            <BrandIcon name="shield-check" fill />
          </span>
        </div>

        <div className="nf-site-footer-legal">
          <p className="nf-caption">
            &copy; <span className="nf-numeric">{year}</span> {face.footer.legalName}. {f.rights}
          </p>
          <p className="nf-caption flex flex-wrap gap-group">
            <Link href="/terms" className="nf-site-footer-link">
              {f.terms}
            </Link>
            <Link href="/privacy" className="nf-site-footer-link">
              {f.privacy}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
