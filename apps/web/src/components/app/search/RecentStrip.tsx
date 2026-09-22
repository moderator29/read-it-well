"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  clearRecentListings,
  clearRecentSearches,
  recentListingsServerSnapshot,
  recentListingsSnapshot,
  recentSearchesServerSnapshot,
  recentSearchesSnapshot,
  subscribeRecent,
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
    <div className="mt-sm">
      <div className="flex items-center justify-between gap-sm">
        <h2 className="text-[length:var(--nf-text-overline)] font-semibold uppercase tracking-wide text-[var(--nf-content-muted)]">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="relative shrink-0 text-[length:var(--nf-text-overline)] font-semibold text-[var(--nf-brand-secondary)] before:absolute before:-inset-3 before:content-['']"
        >
          {clearLabel}
        </button>
      </div>
      <div className="nf-scroll-x -mx-gutter mt-xs">
        <ul className="flex gap-xs px-lg md:px-xl">{children}</ul>
      </div>
    </div>
  );
}

export function RecentStrip() {
  /*
   * SUBSCRIBED, NOT READ ONCE AT MOUNT.
   *
   * This held both lists in `useState`, initialised to `null` for "not read
   * yet", and filled them in a mount effect. Two things were wrong with it. It
   * was `set-state-in-effect`, which is the small one. The real one is that the
   * strip and the search form are on the same screen: running a search calls
   * `rememberSearch`, and this strip went on showing the list from before it,
   * with nothing able to tell it otherwise until the next full mount.
   *
   * The `null` state goes away with the effect rather than being preserved,
   * because the two snapshots already say the same thing more directly: the
   * server has no storage and returns an empty list, so the strip renders
   * nothing until the client's first commit, which is exactly what `null` was
   * arranging by hand.
   *
   * The clear handlers no longer set state either. `clearRecentSearches` writes
   * through `memory.ts`, which notifies, so the strip re-reads for the same
   * reason it re-reads after a search.
   */
  const searches = useSyncExternalStore(
    subscribeRecent,
    recentSearchesSnapshot,
    recentSearchesServerSnapshot,
  );
  const listings = useSyncExternalStore(
    subscribeRecent,
    recentListingsSnapshot,
    recentListingsServerSnapshot,
  );

  const hasSearches = searches.length > 0;
  const hasListings = listings.length > 0;
  if (!hasSearches && !hasListings) return null;

  return (
    <section aria-label="Where you have been" data-testid="recent-strip">
      {hasSearches && (
        <Row
          title="Recent searches"
          clearLabel="Clear"
          onClear={clearRecentSearches}
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
          onClear={clearRecentListings}
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
