import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import { Logo } from "@/design-system/brand/Logo";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * Site footer.
 *
 * Sits directly on the canvas with hairlines rather than in a card, the calm
 * close to every marketing page: brand block, four link columns, a language
 * and trust strip, then the copyright line. Columns collapse to two-up on
 * phones so the footer stays tight without becoming a scroll of stacked lists.
 */

const LANGUAGES = [
  { code: "EN", name: "English" },
  { code: "YO", name: "Yorùbá" },
  { code: "HA", name: "Hausa" },
  { code: "IG", name: "Igbo" },
];

const STORES = ["App Store", "Google Play"];

const chipClass =
  "inline-flex items-center gap-1.5 rounded-full border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-secondary)] px-3 py-1.5 text-[0.75rem] font-semibold text-[var(--nf-content-secondary)] transition-colors hover:text-[var(--nf-content-primary)]";

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

  const year = new Date().getFullYear();

  return (
    <footer className="nf-hairline mt-24 bg-[var(--nf-surface-primary)]">
      <div className="nf-shell pt-14 pb-8 md:pt-16">
        {/* Brand block and link columns */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-[1.6fr_repeat(4,1fr)] md:gap-x-10">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" aria-label="NaijaFinds home" className="inline-flex">
              <Logo size={40} wordSize={21} />
            </Link>
            <p className="mt-4 max-w-[28ch] text-[0.9375rem] font-medium text-[var(--nf-content-secondary)]">
              {t.landing.footer.tagline}
            </p>
            <p className="mt-2.5 max-w-[34ch] text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
              {t.landing.vision.title}
            </p>
            <p className="mt-5 inline-flex items-center gap-1.5 text-[0.75rem] font-semibold text-[var(--nf-content-muted)]">
              <UiIcon name="verified" size={14} className="text-[var(--nf-brand-primary)]" />
              {t.landing.features.verified.title}
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

        {/* Language and trust strip */}
        <div className="nf-hairline mt-12 flex flex-col gap-6 pt-7 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="nf-overline mr-1">{t.landing.trust.multiLanguage.title}</span>
            {LANGUAGES.map((lang) => (
              <span key={lang.code} className={chipClass} title={lang.name}>
                {lang.code}
              </span>
            ))}
            <span className={chipClass}>
              <UiIcon name="location" size={13} className="text-[var(--nf-brand-primary)]" />
              {t.landing.trust.africa.title}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="nf-overline mr-1">{t.landing.trust.stores.title}</span>
            {STORES.map((store) => (
              <span key={store} className={chipClass}>
                {store}
              </span>
            ))}
          </div>
        </div>

        {/* Copyright line */}
        <div className="nf-hairline mt-7 flex flex-col gap-2 pt-6 text-[0.8125rem] text-[var(--nf-content-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="nf-numeric">{year}</span> NaijaFinds. {t.landing.footer.rights}
          </p>
          <p className="font-medium">
            {t.landing.hero.line1} {t.landing.hero.line2} {t.landing.hero.line3}
          </p>
        </div>
      </div>
    </footer>
  );
}
