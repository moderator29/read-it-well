import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate } from "@vallo/i18n/core";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { JsonLd } from "@/components/site/JsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { ListGroup, ListRow } from "@/components/ui/ListGroup";
import { GUIDES, guideBySlug, readingMinutes } from "@/lib/guides/articles";
import { GUIDE_SLUGS } from "@/lib/guides/slugs";
import { articleLd, breadcrumbLd } from "@/lib/site/structured-data";

/** A14. One guide. Unknown slugs are a 404; the list is fixed at build. */
export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const guide = guideBySlug((await params).slug);
  if (!guide) return {};
  const path = `/guides/${guide.slug}`;
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: path },
    openGraph: {
      url: path,
      type: "article",
      title: guide.title,
      description: guide.description,
      modifiedTime: guide.reviewed,
      publishedTime: guide.published,
    },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const guide = guideBySlug((await params).slug);
  if (!guide) notFound();
  const locale = await getLocale();
  const g = getDictionary(locale).publicDoors.guides;
  const path = `/guides/${guide.slug}`;
  const reviewed = formatDate(new Date(`${guide.reviewed}T12:00:00+01:00`), locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const others = GUIDES.filter((other) => other.slug !== guide.slug).slice(0, 3);

  return (
    <>
      <JsonLd
        data={[
          articleLd({
            path,
            title: guide.title,
            description: guide.description,
            reviewed: guide.reviewed,
            published: guide.published,
          }),
          breadcrumbLd([
            { name: "Vallo", path: "/" },
            { name: g.chip, path: "/guides" },
            { name: guide.title, path },
          ]),
        ]}
      />
      <div className="nf-shell pb-section">
        <article className="nf-guide mx-auto max-w-2xl" lang="en" aria-labelledby="guide-title">
          <Link href="/guides" className="nf-pd-link">
            {g.all}
          </Link>
          <h1 id="guide-title" className="nf-site-head-title mt-xs">
            {guide.title}
          </h1>
          <p className="nf-site-head-lede mt-sm">{guide.description}</p>
          <p className="nf-guide__meta mt-sm">
            <span>{g.reviewed.replace("{date}", reviewed)}</span>
            <span>{g.readTime.replace("{minutes}", String(readingMinutes(guide)))}</span>
          </p>
          {locale !== "en" && <p className="nf-caption mt-xs text-[var(--nf-content-muted)]">{g.englishOnly}</p>}

          <nav className="nf-guide__toc" aria-label={g.onThisPage}>
            <ListGroup label={g.onThisPage}>
              {guide.sections.map((section) => (
                <ListRow key={section.id} href={`#${section.id}`} title={section.title} chevron />
              ))}
            </ListGroup>
          </nav>

          {guide.sections.map((section) => (
            <section key={section.id} id={section.id} className="nf-guide__section" aria-labelledby={`${section.id}-title`}>
              <h2 id={`${section.id}-title`}>{section.title}</h2>
              {section.blocks.map((block, index) =>
                typeof block === "string" ? (
                  <p key={index}>{block}</p>
                ) : (
                  <ul key={index}>
                    {block.list.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ),
              )}
            </section>
          ))}

          {guide.sources.length > 0 && (
            <div className="nf-guide__sources">
              {guide.sources.map((source) => (
                <p key={source}>{source}</p>
              ))}
            </div>
          )}

          <div className="nf-guide__next">
            <ButtonLink href={guide.next.href} variant="primary" size="lg" full trailingIcon="arrow-right">
              {guide.next.label}
            </ButtonLink>
          </div>

          <nav className="mt-section" aria-label={g.more}>
            <ListGroup label={g.more}>
              {others.map((other) => (
                <ListRow key={other.slug} href={`/guides/${other.slug}`} title={other.title} chevron />
              ))}
            </ListGroup>
          </nav>
        </article>
      </div>
    </>
  );
}
