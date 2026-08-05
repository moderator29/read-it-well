"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  clearRecentListings,
  clearRecentSearches,
  readRecentListings,
  readRecentSearches,
  type RecentListing,
  type RecentSearch,
} from "@/lib/search/memory";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * The last few hunts and the last few places opened, offered back as chips.
 *
 * WHY IT IS EMPTY ON THE SERVER. Both lists live in local storage, so the
 * server cannot know them and must not guess. Rendering nothing until the
 * effect has run is deliberate: a server render that assumed "no recents" and
 * a client render that found five would be a hydration mismatch, and the usual
 * fix for that (`suppressHydrationWarning`) hides the error without fixing the
 * markup. Nothing renders at all until there is something real to show, so the
 * first paint is never wrong, only incomplete.
 *
 * They reuse `nf-chip`, the same object the city and sort rows on this page
 * are already built from. This row introduces no new material.
 */

function Row({
  title,
  onClear,
  clearLabel,
  children,
}: {
  title: string;
  onClear: () => void;
  clearLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[0.75rem] font-semibold uppercase tracking-wide text-[var(--nf-content-muted)]">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="relative shrink-0 text-[0.75rem] font-semibold text-[var(--nf-brand-secondary)] before:absolute before:-inset-3 before:content-['']"
        >
          {clearLabel}
        </button>
      </div>
      <div className="nf-scroll-x -mx-5 mt-2 md:-mx-8">
        <ul className="flex gap-2 px-5 md:px-8">{children}</ul>
      </div>
    </div>
  );
}

export function RecentStrip() {
  /* `null` means "not read yet", which is not the same as "read and empty".
     Only the second one is allowed to decide that there is nothing to show. */
  const [searches, setSearches] = useState<RecentSearch[] | null>(null);
  const [listings, setListings] = useState<RecentListing[] | null>(null);

  useEffect(() => {
    setSearches(readRecentSearches());
    setListings(readRecentListings());
  }, []);

  const hasSearches = searches !== null && searches.length > 0;
  const hasListings = listings !== null && listings.length > 0;
  if (!hasSearches && !hasListings) return null;

  return (
    <section aria-label="Where you have been" data-testid="recent-strip">
      {hasSearches && (
        <Row
          title="Recent searches"
          clearLabel="Clear"
          onClear={() => {
            clearRecentSearches();
            setSearches([]);
          }}
        >
          {searches.map((entry) => (
            <li key={entry.href} className="shrink-0">
              <Link
                href={entry.href}
                prefetch
                data-testid="recent-search"
                className="nf-chip whitespace-nowrap transition-transform active:scale-[0.96]"
              >
                <UiIcon name="search" size={12} className="shrink-0 opacity-70" />
                {entry.label}
              </Link>
            </li>
          ))}
        </Row>
      )}

      {hasListings && (
        <Row
          title="Recently viewed"
          clearLabel="Clear"
          onClear={() => {
            clearRecentListings();
            setListings([]);
          }}
        >
          {listings.map((entry) => (
            <li key={entry.id} className="shrink-0">
              <Link
                href={`/listing/${entry.id}`}
                prefetch
                data-testid="recent-listing"
                title={entry.place ? `${entry.title}, ${entry.place}` : entry.title}
                className="nf-chip whitespace-nowrap transition-transform active:scale-[0.96]"
              >
                <UiIcon name="location" size={12} className="shrink-0 opacity-70" />
                {entry.title}
              </Link>
            </li>
          ))}
        </Row>
      )}
    </section>
  );
}
