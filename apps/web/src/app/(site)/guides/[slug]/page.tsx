import type { Metadata } from "next";
import { localizedAlternates } from "@/lib/i18n/public-metadata";
import { notFound } from "next/navigation";
import { formatDate } from "@vallo/i18n/core";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { JsonLd } from "@/components/site/JsonLd";
import { GuideArticle } from "@/components/site/guides/GuideArticle";
import { GUIDES, guideBySlug } from "@/lib/guides/articles";
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
    /* A10: canonical in the page's language, and the hreflang set. */
    alternates: (await localizedAlternates(path)) ?? { canonical: path },
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
      <GuideArticle guide={guide} others={others} copy={g} reviewed={reviewed} englishNote={locale !== "en"} />
    </>
  );
}
