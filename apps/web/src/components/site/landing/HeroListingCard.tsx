"use client";

import { useState } from "react";
import type { Locale } from "@vallo/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { MiniListing } from "@/lib/site/listing-card";
import { ListingMini } from "./ListingMini";

/**
 * The floating card on the hero photograph with its 1/5 pager.
 *
 * Five real listings from the same read the old featured rail used. The
 * pager is two round glass buttons and a live "n of 5"; the card underneath
 * is a real link to the listing. State is one index; nothing auto-advances,
 * because the hero already spends the viewport's one ambient motion on
 * nothing, and a card that changes under a reader's eye is not calm.
 */
export function HeroListingCard({
  cards,
  locale,
  labels,
}: {
  cards: MiniListing[];
  locale: Locale;
  labels: { verified: string; save: string; prev: string; next: string; of: string };
}) {
  const [index, setIndex] = useState(0);
  if (cards.length === 0) return null;
  const total = cards.length;
  const current = cards[Math.min(index, total - 1)];
  if (!current) return null;

  return (
    <div className="nf-landing-float-wrap">
      <div className="nf-landing-float">
        <ListingMini
          listing={current}
          locale={locale}
          verifiedLabel={labels.verified}
          saveLabel={labels.save}
          priority
        />
      </div>
      {total > 1 && (
        <div className="nf-landing-pager">
          <button
            type="button"
            aria-label={labels.prev}
            onClick={() => setIndex((i) => (i - 1 + total) % total)}
          >
            <span>
              <UiIcon name="arrow-left" size={14} aria-hidden />
            </span>
          </button>
          <span className="nf-numeric" aria-live="polite">
            {index + 1}/{total}
          </span>
          <button
            type="button"
            aria-label={labels.next}
            onClick={() => setIndex((i) => (i + 1) % total)}
          >
            <span>
              <UiIcon name="arrow-right" size={14} aria-hidden />
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
