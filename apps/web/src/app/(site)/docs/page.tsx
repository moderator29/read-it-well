import type { Metadata } from "next";
import { publicPageMetadata } from "@/lib/i18n/public-metadata";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { ButtonLink } from "@/components/ui/Button";
import { CHAPTERS, CHAPTER_INDEX } from "./chapters";
import { IndexRows } from "@/components/site/guides/IndexRows";
import { lineGlyphFor } from "@/design-system/icons/glass-to-line";

/* A10: the title and description in the page's own language, with its
   canonical and hreflang (lib/i18n/public-metadata.ts; words in publicMeta). */
export async function generateMetadata(): Promise<Metadata> {
  return publicPageMetadata("docs");
}

/**
 * The table of contents.
 *
 * Twelve cards in reading order, each one saying what its chapter answers, so
 * somebody arriving with a specific question can pick the right door without
 * opening three. The card carries its own heading count, because "how long is
 * this" is the second thing anybody wants to know about a chapter.
 *
 * The three surfaces underneath are the places this document deliberately does
 * not duplicate: the searchable help centre, the refund schedule and the
 * policies. Documentation that restates a policy is documentation that will one
 * day contradict it.
 */
export default async function DocsHomePage() {
  const x = getDictionary(await getLocale()).experienceLanding.docs.docs;
  const first = CHAPTER_INDEX[0];

  return (
    <div>
      {/* ------------------------------------------------------------ hero */}
      <div className="nf-rise">
        <h1 className="nf-h1 max-w-[18ch]">Every part of the platform, written out</h1>
        <p className="mt-group max-w-[62ch] text-[length:var(--nf-text-body-lg)] leading-[1.6] text-[var(--nf-content-secondary)]">
          Both sides of Vallo written out plainly. On the Property side: how to find a
          place to rent or buy, what the light and water rows on a listing actually
          tell you, and how an inspection comes before any money moves. On Vallo
          Stays: searching against dates and guests, how a booking holds your nights,
          asking a restaurant for a table, and where it all lands in Plans. Then the
          way paying works on both, how Around works, and what happens when something
          goes wrong. A renter or guest pays exactly the price on the listing; the
          platform fee comes out of the lister&rsquo;s share, and this document says so
          wherever it matters.
        </p>
        {first && (
          <div className="mt-heading flex flex-wrap gap-row">
            <ButtonLink href={`/docs/${first.slug}`} variant="primary">
              Start at the beginning
            </ButtonLink>
            <ButtonLink href="/help" variant="secondary">
              Search the help centre
            </ButtonLink>
          </div>
        )}
      </div>

      {/* -------------------------------------------------------- chapters */}
      {/* THE INDEX (reference 7086): one Card, a Plate row per chapter, each a
          glyph plate, the chapter's title and its one line, with how long it
          is on the right ("how long is this" is the second thing anybody
          wants to know about a chapter). */}
      <IndexRows
        as="ol"
        label="Chapters"
        className="mt-block"
        items={CHAPTERS.map((chapter) => ({
          href: `/docs/${chapter.slug}`,
          icon: lineGlyphFor(chapter.icon),
          title: `${chapter.number}. ${chapter.title}`,
          line: chapter.summary,
          meta: chapter.sections.length === 1 ? x.sectionOne : x.sections.replace("{count}", String(chapter.sections.length)),
        }))}
      />

      {/* --------------------------------------------------- other surfaces */}
      <section className="mt-section" aria-labelledby="docs-elsewhere">
        <h2 id="docs-elsewhere" className="nf-h3">
          Where else to look
        </h2>
        <IndexRows
          label="Where else to look"
          className="mt-group"
          items={[
            {
              href: "/help",
              icon: "headset",
              title: "Help centre",
              line: "The same answers, searchable, plus a way to reach a person.",
            },
            {
              href: "/cancellations",
              icon: "calendar-clock",
              title: "Cancellations",
              line: "The one refund schedule that governs every stay, with the windows written out.",
            },
            {
              href: "/terms",
              icon: "file-text",
              title: "Terms and privacy",
              line: "The formal documents. Where this guide and a policy differ, the policy governs.",
            },
          ]}
        />
      </section>
    </div>
  );
}
