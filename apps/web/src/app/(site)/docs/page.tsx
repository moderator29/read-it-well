import type { Metadata } from "next";
import Link from "next/link";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ButtonLink } from "@/components/ui/Button";
import { CHAPTERS, CHAPTER_INDEX } from "./chapters";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "The full Vallo documentation, both sides: property search and its power and water filters, the stays journey from dated search to Plans, holding a restaurant table, the wallet, Around, the agent workspace, trust and safety, and your rights under the NDPA.",
};

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
export default function DocsHomePage() {
  const first = CHAPTER_INDEX[0];

  return (
    <div>
      {/* ------------------------------------------------------------ hero */}
      <div className="nf-rise">
        <h1 className="nf-h1 max-w-[18ch]">Every part of the platform, written out</h1>
        <p className="mt-group max-w-[62ch] text-[var(--nf-content-secondary)]">
          Both sides of Vallo written out plainly. On the Property side: how to find a
          place to rent or buy, what the light and water rows on a listing actually
          tell you, and how an inspection comes before any money moves. On Vallo
          Stays: searching against dates and guests, how a booking holds your nights,
          asking a restaurant for a table, and where it all lands in Plans. Then the
          wallet that pays for both, how Around works, and what happens when something
          goes wrong. The platform charges no fees, and this document says so wherever
          it matters.
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
      <ol className="nf-rise mt-block grid gap-row sm:grid-cols-2" style={{ animationDelay: "80ms" }}>
        {CHAPTERS.map((chapter) => (
          <li key={chapter.slug}>
            <Link
              href={`/docs/${chapter.slug}`}
              className="nf-panel nf-panel--card nf-card--interactive flex h-full flex-col p-card-sm"
            >
              <div className="flex items-start gap-row">
                <span className="inline-grid h-11 w-11 shrink-0 place-items-center">
                  <BrandIcon name={chapter.icon} fill />
                </span>
                <div className="min-w-0">
                  <span className="nf-numeric block text-[0.6875rem] font-semibold text-[var(--nf-content-muted)]">
                    Chapter {chapter.number}
                  </span>
                  <span className="mt-inline-tight block text-[0.9375rem] leading-snug font-semibold text-[var(--nf-content-primary)]">
                    {chapter.title}
                  </span>
                </div>
              </div>
              <p className="mt-row text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
                {chapter.summary}
              </p>
              <span className="mt-auto flex items-center gap-inline pt-row text-[0.75rem] font-semibold text-[var(--nf-content-muted)]">
                {chapter.sections.length} sections
                <UiIcon name="chevron-right" size={12} />
              </span>
            </Link>
          </li>
        ))}
      </ol>

      {/* --------------------------------------------------- other surfaces */}
      <section className="nf-rise mt-section" style={{ animationDelay: "140ms" }}>
        <h2 className="nf-h3">Where else to look</h2>
        <div className="mt-group grid gap-row sm:grid-cols-3">
          {[
            {
              href: "/help",
              title: "Help centre",
              body: "The same answers, searchable, plus a way to reach a person.",
            },
            {
              href: "/cancellations",
              title: "Cancellations",
              body: "The one refund schedule that governs every stay, with the windows written out.",
            },
            {
              href: "/terms",
              title: "Terms and privacy",
              body: "The formal documents. Where this guide and a policy differ, the policy governs.",
            },
          ].map((card) => (
            <Link key={card.href} href={card.href} className="nf-panel nf-panel--card block nf-card--interactive p-card-sm">
              <span className="block text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                {card.title}
              </span>
              <span className="mt-inline-tight block text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
                {card.body}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
