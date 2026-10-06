"use client";

import { useEffect, useMemo, useState } from "react";
import { MotionReveal } from "@/components/motion/Reveal";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ButtonLink } from "@/components/ui/Button";
import { topicId } from "./topics";

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

  /*
   * A TOPIC LINK ALWAYS LANDS. The topic index at the top of the page jumps to
   * `#help-<topic>`; while a search has filtered that topic out, the target is
   * not in the page and the jump went nowhere. So a click on one of those links
   * clears the search first, then scrolls to the section once it has rendered.
   * With no search active the link is left to the browser.
   */
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      /* Only a plain primary click is ours to carry: a cmd, ctrl, shift or alt
         click, or a middle click, is the browser's "open this in another tab",
         and taking it over would replace the page the person meant to keep. */
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      const link = (event.target as Element | null)?.closest?.('a[href^="#help-"]');
      if (!link || !query) return;
      const hash = link.getAttribute("href") ?? "";
      event.preventDefault();
      setQuery("");
      history.pushState(null, "", hash);
      requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView()));
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [query]);

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
          className="nf-field ps-[calc(0.875rem+1.25rem+var(--nf-gap-row))]"
        />
      </div>
      <p className="mt-inline text-[length:var(--nf-text-caption)] text-[var(--nf-content-muted)]" role="status">
        {visible.length === faqs.length
          ? `${faqs.length} answers`
          : `${visible.length} of ${faqs.length} answers match`}
      </p>

      {/* Grouped results */}
      {visible.length > 0 ? (
        <div className="mt-heading space-y-block">
          {categories.map((cat) => (
            <MotionReveal as="section" key={cat} id={topicId(cat)} aria-label={cat} className="scroll-mt-28">
              <h2 className="nf-overline mb-row">{cat}</h2>
              <div className="space-y-row">
                {visible
                  .filter((f) => f.category === cat)
                  .map((f) => (
                    <details key={f.q} className="nf-panel nf-panel--card nf-m-details group block p-0">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-row p-card-sm font-semibold leading-snug [&::-webkit-details-marker]:hidden">
                        {f.q}
                        <UiIcon
                          name="chevron-down"
                          size={20}
                          className="nf-m-chevron shrink-0 text-[var(--nf-content-muted)]"
                        />
                      </summary>
                      <p className="max-w-measure-body px-group pb-group text-[length:var(--nf-text-row)] leading-[1.6] text-[var(--nf-content-secondary)] sm:px-heading sm:pb-heading">
                        {f.a}
                      </p>
                    </details>
                  ))}
              </div>
            </MotionReveal>
          ))}
        </div>
      ) : (
        <div className="nf-panel nf-panel--card block mt-heading p-card text-center-lg">
          <h2 className="nf-h3">Nothing matches that yet</h2>
          <p className="mx-auto mt-inline max-w-[46ch] text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
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
