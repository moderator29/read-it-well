"use client";

import { useMemo, useState } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ButtonLink } from "@/components/ui/Button";

export type Faq = {
  category: string;
  q: string;
  a: string;
};

/**
 * Searchable FAQ list.
 *
 * A single text field filters the whole list live, matching against the
 * question, the answer and the category, so "refund" finds everything about
 * money coming back regardless of which section it sits in. Each entry is a
 * native details element inside a glass card: keyboard accessible, no JS
 * needed to open, and the search never traps focus.
 */
export function HelpSearch({ faqs }: { faqs: Faq[] }) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter(
      (f) =>
        f.q.toLowerCase().includes(q) ||
        f.a.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q),
    );
  }, [faqs, query]);

  const categories = useMemo(() => {
    const seen: string[] = [];
    for (const f of visible) if (!seen.includes(f.category)) seen.push(f.category);
    return seen;
  }, [visible]);

  return (
    <div>
      {/* Search field */}
      <div className="relative">
        <UiIcon
          name="search"
          size={20}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--nf-content-muted)]"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the help centre, e.g. refund, inspection, verify"
          aria-label="Search help articles"
          className="nf-field pl-block"
        />
      </div>
      <p className="mt-inline text-[0.8125rem] text-[var(--nf-content-muted)]" role="status">
        {visible.length === faqs.length
          ? `${faqs.length} answers`
          : `${visible.length} of ${faqs.length} answers match`}
      </p>

      {/* Grouped results */}
      {visible.length > 0 ? (
        <div className="mt-heading space-y-block">
          {categories.map((cat) => (
            <section key={cat} aria-label={cat}>
              <h2 className="nf-overline mb-row">{cat}</h2>
              <div className="space-y-row">
                {visible
                  .filter((f) => f.category === cat)
                  .map((f) => (
                    <details key={f.q} className="nf-card group p-0">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-row p-card-sm font-semibold leading-snug [&::-webkit-details-marker]:hidden">
                        {f.q}
                        <UiIcon
                          name="chevron-down"
                          size={16}
                          className="shrink-0 text-[var(--nf-content-muted)] transition-transform group-open:rotate-180"
                        />
                      </summary>
                      <p className="px-group pb-group text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)] sm:px-heading sm:pb-heading">
                        {f.a}
                      </p>
                    </details>
                  ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="nf-card mt-heading p-card text-center-lg">
          <h2 className="nf-h3">Nothing matches that yet</h2>
          <p className="mx-auto mt-inline max-w-[46ch] text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
            Try a shorter word, or ask us directly. A person reads every message.
          </p>
          <div className="mt-heading flex justify-center">
            <ButtonLink href="/contact" variant="secondary">
              Contact support
            </ButtonLink>
          </div>
        </div>
      )}
    </div>
  );
}
