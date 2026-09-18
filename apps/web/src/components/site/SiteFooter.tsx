import Link from "next/link";
import type { Dictionary } from "@vallo/i18n";
import { Logo } from "@/design-system/brand/Logo";
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
  const columns = [
    {
      title: f.product,
      links: [
        { href: "/", label: face.footer.home },
        { href: "/search", label: face.nav.properties },
        { href: "/stays", label: face.nav.stays },
        { href: "/assistant", label: face.footer.ai },
        { href: "/wallet", label: face.footer.wallet },
      ],
    },
    {
      title: f.company,
      links: [
        { href: "/about", label: f.about },
        { href: "/careers", label: f.careers },
        { href: "/agents", label: f.becomeAgent },
        { href: "/contact", label: f.contact },
      ],
    },
    {
      title: f.support,
      links: [
        { href: "/help", label: f.help },
        { href: "/docs", label: f.docs },
        { href: "/safety", label: face.footer.safety },
        { href: "/standards", label: face.footer.standards },
        { href: "/cancellations", label: face.footer.cancellations },
      ],
    },
    {
      title: f.legal,
      links: [
        { href: "/privacy", label: f.privacy },
        { href: "/terms", label: f.terms },
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
