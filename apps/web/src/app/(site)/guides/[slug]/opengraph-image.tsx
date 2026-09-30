import { guideBySlug, readingMinutes } from "@/lib/guides/articles";
import { GUIDE_SLUGS } from "@/lib/guides/slugs";
import { PAGE_CARD_SIZE, PAGE_CARD_TYPE, PAGE_CARDS, pageCardImage } from "@/lib/site/page-card";

/** A13 and A14: each guide's own share card, its title in the well. */
export const alt = "A Vallo guide";
export const size = PAGE_CARD_SIZE;
export const contentType = PAGE_CARD_TYPE;

export function generateStaticParams() {
  return GUIDE_SLUGS.map((slug) => ({ slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const guide = guideBySlug((await params).slug);
  if (!guide) return pageCardImage(PAGE_CARDS.guides);
  return pageCardImage({
    title: "Vallo guides",
    chip: `${readingMinutes(guide)} min read`,
    figure: guide.title,
    honest: `Last reviewed ${guide.reviewed}`,
  });
}
