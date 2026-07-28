import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import { Logo } from "@/design-system/brand/Logo";

export function SiteFooter({ t }: { t: Dictionary }) {
  const columns = [
    {
      title: t.landing.footer.product,
      links: [
        { href: "/search?type=hotel", label: t.nav.hotels },
        { href: "/search?type=property", label: t.nav.apartments },
        { href: "/search?type=restaurant", label: t.nav.restaurants },
        { href: "/search?type=experience", label: t.nav.experiences },
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

  return (
    <footer className="nf-hairline mt-24 bg-[var(--nf-surface-primary)]">
      <div className="nf-shell py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Logo size={40} wordSize={21} />
            <p className="mt-4 max-w-[26ch] text-[0.875rem] text-[var(--nf-content-muted)]">
              {t.landing.footer.tagline}
            </p>
          </div>

          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="nf-overline mb-3.5">{col.title}</h2>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-[0.875rem] text-[var(--nf-content-secondary)] transition-colors hover:text-[var(--nf-content-primary)]"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="nf-hairline mt-12 pt-6 text-[0.8125rem] text-[var(--nf-content-muted)]">
          <span className="nf-numeric">{new Date().getFullYear()}</span> NaijaFinds.{" "}
          {t.landing.footer.rights}
        </div>
      </div>
    </footer>
  );
}
