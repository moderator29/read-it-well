import type { Metadata } from "next";
import Link from "next/link";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ButtonLink } from "@/components/ui/Button";
import { CHAPTERS, CHAPTER_INDEX } from "./chapters";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "The full RentMe documentation: finding a place, the power and water filters, booking, the wallet, Around, agent mode, trust and safety, and your rights under the NDPA.",
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
        <span className="nf-chip">
          <span className="inline-grid h-4 w-4 place-items-center">
            <BrandIcon name="listing-review" fill />
          </span>
          Documentation
        </span>
        <h1 className="nf-h1 mt-5 max-w-[18ch]">How RentMe works, in full</h1>
        <p className="mt-4 max-w-[62ch] text-[var(--nf-content-secondary)]">
          Every part of the platform written out plainly: how to find a place, what the
          light and water rows on a listing actually tell you, how a booking holds your
          dates, what the wallet does, how Around works, and what happens when something
          goes wrong. The platform charges no fees, and this document says so wherever it
          matters.
        </p>
        {first && (
          <div className="mt-6 flex flex-wrap gap-3">
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
      <ol className="nf-rise mt-10 grid gap-3 sm:grid-cols-2" style={{ animationDelay: "80ms" }}>
        {CHAPTERS.map((chapter) => (
          <li key={chapter.slug}>
            <Link
              href={`/docs/${chapter.slug}`}
              className="nf-card nf-card--interactive flex h-full flex-col p-4 sm:p-5"
            >
              <div className="flex items-start gap-3">
                <span className="inline-grid h-11 w-11 shrink-0 place-items-center">
                  <BrandIcon name={chapter.icon} fill />
                </span>
                <div className="min-w-0">
                  <span className="nf-numeric block text-[0.6875rem] font-semibold text-[var(--nf-content-muted)]">
                    Chapter {chapter.number}
                  </span>
                  <span className="mt-0.5 block text-[0.9375rem] leading-snug font-semibold text-[var(--nf-content-primary)]">
                    {chapter.title}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
                {chapter.summary}
              </p>
              <span className="mt-auto flex items-center gap-1.5 pt-3 text-[0.75rem] font-semibold text-[var(--nf-content-muted)]">
                {chapter.sections.length} sections
                <UiIcon name="chevron-right" size={13} />
              </span>
            </Link>
          </li>
        ))}
      </ol>

      {/* --------------------------------------------------- other surfaces */}
      <section className="nf-rise mt-12" style={{ animationDelay: "140ms" }}>
        <h2 className="nf-h3">Where else to look</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
            <Link key={card.href} href={card.href} className="nf-card nf-card--interactive p-4">
              <span className="block text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                {card.title}
              </span>
              <span className="mt-1 block text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
                {card.body}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
