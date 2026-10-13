"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import type { Listing, ListingKind } from "@/lib/listings/types";
import type { PropertyType } from "@/lib/interests/property-types";
import { ListingCard } from "@/components/app/ListingCard";
import type { UiIconName } from "@/design-system/icons/UiIcon";
import {
  bestMatches,
  reasonText,
  type MatchReason,
  type ReasonCopy,
  type SavedSearchSignal,
} from "@/lib/search/best-matches";
import {
  recentListingsServerSnapshot,
  recentListingsSnapshot,
  subscribeRecent,
} from "@/lib/search/memory";
import "./search-v2.css";

/** A glyph for each kind of reason, from the UI family; never a sparkle. */
const REASON_ICON: Record<MatchReason["key"], UiIconName> = {
  areaBudget: "wallet",
  areaSaved: "search",
  budget: "wallet",
  saved: "search",
  nearSaved: "heart",
  recent: "history",
  kind: "house",
};

export type ForYouCopy = {
  bestMatches: string;
  bestMatchesHint: string;
  newListings: string;
  reasons: ReasonCopy;
};

/**
 * BEST MATCHES AND NEW LISTINGS, at the top of an unfiltered /search (the
 * founder's reference, 13 October 2026), then the page's full list.
 *
 * Best matches come from real signals only (`lib/search/best-matches.ts`):
 * the server hands over the account's saved searches, saved homes and stated
 * interests it already read for this page, and this component adds the
 * places opened on this device, which only the browser holds. The server
 * draws the section with what it knows; the browser draws it again with the
 * device's memory once it can read it (`useSyncExternalStore`, so the first
 * paint and hydration agree). No signal, no section: a shelf of "matches"
 * with nothing behind them is the invented score this replaces.
 *
 * New listings are the shelf's own homes ordered by the day they went live,
 * chosen on the server. Both rows draw the real result card in its row shape,
 * at a fixed width in a snapping rail, with the reason or the listed age on
 * the card.
 */
export function SearchForYou({
  candidates,
  newest,
  savedSearches,
  savedHomes,
  interests,
  savedIds,
  kindNames,
  ownershipSeen,
  ownershipLabel,
  locale,
  t,
  copy,
}: {
  candidates: Listing[];
  newest: Listing[];
  savedSearches: SavedSearchSignal[];
  savedHomes: { id: string; area: string; city: string }[];
  interests: PropertyType[];
  savedIds: string[];
  kindNames: Record<ListingKind, string>;
  ownershipSeen: Record<string, string>;
  ownershipLabel: string;
  locale: Locale;
  t: Dictionary;
  copy: ForYouCopy;
}) {
  const recent = useSyncExternalStore(subscribeRecent, recentListingsSnapshot, recentListingsServerSnapshot);
  const matches = useMemo(
    () =>
      bestMatches(candidates, {
        savedSearches,
        savedHomes,
        interests,
        recentPlaces: recent.map((entry) => ({ id: entry.id, place: entry.place })),
      }),
    [candidates, savedSearches, savedHomes, interests, recent],
  );
  const saved = useMemo(() => new Set(savedIds), [savedIds]);
  const seenMark = (id: string) => (ownershipSeen[id] ? { seenAt: ownershipSeen[id]!, label: ownershipLabel } : null);

  if (matches.length === 0 && newest.length === 0) return null;

  return (
    <div className="mt-md" data-testid="search-for-you">
      {matches.length > 0 && (
        <section className="nf-sx-section" aria-labelledby="sx-best" data-testid="best-matches">
          <div className="nf-sx-section__head">
            <div>
              <h2 id="sx-best" className="nf-sx-section__title">
                {copy.bestMatches}
              </h2>
              <p className="nf-sx-section__hint">{copy.bestMatchesHint}</p>
            </div>
          </div>
          <ul className="nf-sx-rail">
            {matches.map(({ listing, reason }) => (
              <li key={listing.id}>
                <ListingCard
                  listing={listing}
                  locale={locale}
                  t={t}
                  layout="row"
                  brief
                  saved={saved.has(listing.id)}
                  ownershipSeen={seenMark(listing.id)}
                  reason={{
                    text: reasonText(reason, copy.reasons, (kind) => kindNames[kind]),
                    icon: REASON_ICON[reason.key],
                  }}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
      {newest.length > 0 && (
        <section className="nf-sx-section" aria-labelledby="sx-new" data-testid="new-listings">
          <div className="nf-sx-section__head">
            <h2 id="sx-new" className="nf-sx-section__title">
              {copy.newListings}
            </h2>
          </div>
          <ul className="nf-sx-rail">
            {newest.map((listing) => (
              <li key={listing.id}>
                <ListingCard
                  listing={listing}
                  locale={locale}
                  t={t}
                  layout="row"
                  brief
                  showAge
                  saved={saved.has(listing.id)}
                  ownershipSeen={seenMark(listing.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
