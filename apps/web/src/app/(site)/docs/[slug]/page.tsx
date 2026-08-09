import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { CHAPTER_INDEX, chapterBySlug, chapterNeighbours } from "../chapters";
import { OnThisPage } from "../OnThisPage";

/**
 * One chapter.
 *
 * The twelve slugs are known at build time, so they are generated rather than
 * rendered on demand, and anything else is a genuine 404 instead of an empty
 * page with a heading on it.
 *
 * The article, the heading rail and the prev and next links are all read from
 * the same chapter record, which is the point of keeping the document as data:
 * there is no second list of headings to fall out of step with the first.
 */

export function generateStaticParams() {
  return CHAPTER_INDEX.map((chapter) => ({ slug: chapter.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const chapter = chapterBySlug(slug);
  if (!chapter) return { title: "Documentation" };
  return {
    title: chapter.title,
    description: chapter.summary,
  };
}

export default async function DocChapterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const chapter = chapterBySlug(slug);
  if (!chapter) notFound();

  const { previous, next } = chapterNeighbours(chapter.slug);
  const headings = chapter.sections.map((section) => ({
    id: section.id,
    heading: section.heading,
  }));

  return (
    <div>
      {/* --------------------------------------------------------- heading */}
      <header className="nf-rise">
        <nav aria-label="Breadcrumb" className="mb-row">
          <Link
            href="/docs"
            className="nf-tap inline-flex min-h-11 items-center gap-inline text-[0.8125rem] font-semibold text-[var(--nf-content-muted)] transition-colors hover:text-[var(--nf-content-primary)]"
          >
            <UiIcon name="arrow-left" size={16} />
            All chapters
          </Link>
        </nav>

        <div className="flex items-start gap-row">
          <span className="inline-grid h-12 w-12 shrink-0 place-items-center sm:h-14 sm:w-14">
            <BrandIcon name={chapter.icon} fill priority />
          </span>
          <div className="min-w-0">
            <span className="nf-numeric block text-[0.6875rem] font-semibold tracking-[var(--nf-tracking-overline)] text-[var(--nf-content-muted)] uppercase">
              Chapter {chapter.number} of {CHAPTER_INDEX.length}
            </span>
            <h1 className="nf-h1 mt-inline-tight">{chapter.title}</h1>
          </div>
        </div>

        <p className="mt-group max-w-[62ch] text-[var(--nf-content-secondary)]">{chapter.summary}</p>
      </header>

      {/*
        The article and the heading rail.

        The rail is declared first so a phone meets it directly under the
        chapter heading, which is where a contents list is worth having, and
        `xl:order-last` moves it to the right the moment there is room for a
        third column. `min-w-0` on the article is what stops a long reference
        from widening the column and giving the page a sideways scroll.
      */}
      <div className="mt-heading flex flex-col gap-block xl:mt-block xl:flex-row xl:items-start">
        <OnThisPage sections={headings} />

        <article className="min-w-0 flex-1 xl:order-first">
          {/* ---------------------------------------------------- sections */}
          <div className="nf-card nf-rise p-card" style={{ animationDelay: "80ms" }}>
            <div className="space-y-block">
              {chapter.sections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-28">
                  <h2 className="nf-h3">{section.heading}</h2>
                  <div className="mt-row max-w-[68ch] space-y-row text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)] [&_code]:rounded-[var(--nf-radius-xs)] [&_code]:border [&_code]:border-[var(--nf-border-subtle)] [&_code]:bg-[var(--nf-surface-inset)] [&_code]:px-inline [&_code]:py-inline-tight [&_code]:text-[0.8125rem] [&_code]:break-words [&_code]:text-[var(--nf-content-primary)] [&_em]:font-medium [&_em]:text-[var(--nf-content-primary)] [&_em]:not-italic [&_li]:mt-inline [&_ol]:list-decimal [&_ol]:space-y-inline [&_ol]:pl-heading [&_strong]:font-semibold [&_strong]:text-[var(--nf-content-primary)] [&_ul]:list-disc [&_ul]:space-y-inline [&_ul]:pl-heading">
                    {section.body}
                  </div>
                </section>
              ))}
            </div>
          </div>

          {/* -------------------------------------------------- prev / next */}
          <nav aria-label="Chapter navigation" className="mt-block grid gap-row sm:grid-cols-2">
            {previous ? (
              <Link
                href={`/docs/${previous.slug}`}
                rel="prev"
                className="nf-card nf-card--interactive flex min-h-11 flex-col p-card-sm"
              >
                <span className="flex items-center gap-inline text-[0.75rem] font-semibold text-[var(--nf-content-muted)]">
                  <UiIcon name="arrow-left" size={12} />
                  Previous
                </span>
                <span className="mt-inline-tight text-[0.875rem] leading-snug font-semibold text-[var(--nf-content-primary)]">
                  {previous.number}. {previous.title}
                </span>
              </Link>
            ) : (
              <span aria-hidden="true" className="hidden sm:block" />
            )}

            {next && (
              <Link
                href={`/docs/${next.slug}`}
                rel="next"
                className="nf-card nf-card--interactive flex min-h-11 flex-col p-card-sm sm:items-end sm:text-right"
              >
                <span className="flex items-center gap-inline text-[0.75rem] font-semibold text-[var(--nf-content-muted)]">
                  Next
                  <UiIcon name="arrow-right" size={12} />
                </span>
                <span className="mt-inline-tight text-[0.875rem] leading-snug font-semibold text-[var(--nf-content-primary)]">
                  {next.number}. {next.title}
                </span>
              </Link>
            )}
          </nav>

          {/* ---------------------------------------------------- closing */}
          <p className="mt-block text-[0.875rem] text-[var(--nf-content-muted)]">
            Something here unclear, or something missing?{" "}
            <Link
              href="/contact"
              className="font-semibold text-[var(--nf-content-link)] hover:underline"
            >
              Tell us
            </Link>{" "}
            and a person will answer within one business day.
          </p>
        </article>
      </div>
    </div>
  );
}
