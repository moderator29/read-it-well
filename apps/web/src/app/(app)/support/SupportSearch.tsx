"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { TextField } from "@/components/ui/Field";
import { searchHelpArticles, type HelpArticle } from "@/lib/support/help-search";

/**
 * "Search for help", over the help centre's own articles.
 *
 * Before anybody types, the five popular articles stand in the list; once they
 * type, the matches replace them. Matching runs on the device against the list
 * the page handed down (`lib/support/help-search.ts`), so a keystroke costs no
 * round trip. Each answer is a native `details`, which opens by keyboard and
 * needs no script.
 */
export function SupportSearch({ articles, popular }: { articles: HelpArticle[]; popular: HelpArticle[] }) {
  const [query, setQuery] = useState("");
  const searching = query.trim().length > 0;
  const results = useMemo(() => searchHelpArticles(articles, query), [articles, query]);
  const shown = searching ? results : popular;

  return (
    <section aria-labelledby="support-search-heading" className="space-y-row">
      <h2 id="support-search-heading" className="nf-sgroup__label">
        Search for help
      </h2>
      <TextField
        label="Search for help"
        hideLabel
        type="search"
        leadingIcon="search"
        clearable="Clear the search"
        onClear={() => setQuery("")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Refunds, inspections, verification"
        autoComplete="off"
        enterKeyHint="search"
      />

      <p className="nf-caption text-[var(--nf-content-muted)]" role="status">
        {searching
          ? results.length === 0
            ? "No answer matches that yet."
            : `Matching answers: ${results.length}`
          : "Popular articles"}
      </p>

      {shown.length > 0 ? (
        <ul className="space-y-row" data-testid={searching ? "support-search-results" : "support-popular"}>
          {shown.map((article) => (
            <li key={article.q}>
              <details className="nf-panel nf-panel--card nf-m-details group block p-0">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-row p-card-sm font-semibold leading-snug text-[var(--nf-content-primary)] [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 break-words">{article.q}</span>
                  <UiIcon
                    name="chevron-down"
                    size={20}
                    className="nf-m-chevron shrink-0 text-[var(--nf-content-muted)]"
                  />
                </summary>
                <div className="px-group pb-group">
                  <p className="nf-overline mb-inline text-[var(--nf-content-muted)]">{article.category}</p>
                  <p className="nf-body-sm leading-relaxed text-[var(--nf-content-secondary)]">{article.a}</p>
                </div>
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <div className="nf-panel nf-panel--card block p-card-sm">
          <p className="nf-body-sm leading-relaxed text-[var(--nf-content-secondary)]">
            Try a shorter word, or ask a question above. A person reads every ticket.
          </p>
        </div>
      )}

      <Link
        href="/help"
        className="nf-link-quiet nf-body-sm inline-flex min-h-11 items-center gap-3xs font-semibold text-[var(--nf-content-link)]"
      >
        Browse every answer in the help centre
        <UiIcon name="arrow-right" size={16} />
      </Link>
    </section>
  );
}
