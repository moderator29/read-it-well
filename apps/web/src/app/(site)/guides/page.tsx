import type { Metadata } from "next";
import { localizedAlternates } from "@/lib/i18n/public-metadata";
import Link from "next/link";
import { formatDate } from "@vallo/i18n/core";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { SiteHead } from "@/components/site/SiteHead";
import { JsonLd } from "@/components/site/JsonLd";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { GUIDES, readingMinutes } from "@/lib/guides/articles";
import { breadcrumbLd, webPageLd } from "@/lib/site/structured-data";

/**
 * A14. `/guides`: plain answers for renters and guests, public while the
 * catalogue is closed. The articles live in `lib/guides/articles.ts`.
 */
export async function generateMetadata(): Promise<Metadata> {
  const g = getDictionary(await getLocale()).publicDoors.guides;
  return {
    title: g.metaTitle,
    description: g.metaDescription,
    /* A10: canonical in the page's language, and the hreflang set. */
    alternates: (await localizedAlternates("/guides")) ?? { canonical: "/guides" },
    openGraph: { url: "/guides", title: g.metaTitle, description: g.metaDescription },
  };
}

export default async function GuidesPage() {
  const locale = await getLocale();
  const g = getDictionary(locale).publicDoors.guides;
  return (
    <>
      <JsonLd
        data={[
          webPageLd({ path: "/guides", name: g.metaTitle, description: g.metaDescription }),
          breadcrumbLd([
            { name: "Vallo", path: "/" },
            { name: g.chip, path: "/guides" },
          ]),
        ]}
      />
      <SiteHead plate="living-room-dusk" icon="doc-review" chip={g.chip} title={g.title} lede={g.lede} />
      <div className="nf-shell pb-section">
        <ul className="nf-guides mx-auto max-w-4xl" lang="en">
          {GUIDES.map((guide) => (
            <li key={guide.slug} className="grid">
              <Link href={`/guides/${guide.slug}`} className="nf-pd-card nf-guide-card">
                <span className="nf-plate nf-plate--brand nf-plate--sm nf-plate--round" aria-hidden="true">
                  <UiIcon name="file-text" size={20} />
                </span>
                <span className="nf-guide-card__title">{guide.title}</span>
                <span className="nf-supply__body">{guide.description}</span>
                <span className="nf-guide-card__meta">
                  {g.readTime.replace("{minutes}", String(readingMinutes(guide)))} ·{" "}
                  {g.reviewed.replace(
                    "{date}",
                    formatDate(new Date(`${guide.reviewed}T12:00:00+01:00`), locale, { day: "numeric", month: "long", year: "numeric" }),
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {locale !== "en" && <p className="nf-caption mt-md text-center text-[var(--nf-content-muted)]">{g.englishOnly}</p>}
      </div>
    </>
  );
}
