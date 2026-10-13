"use client";

import { useMemo } from "react";
import { bucketInRange, priceHistogram, HISTOGRAM_BUCKETS } from "@/lib/search/price-histogram";
import "@/components/app/search/search-v2.css";

/**
 * The bars over the price track: how the homes in front of the reader are
 * priced, from their real figures (`lib/search/price-histogram.ts`). The bars
 * inside the chosen range take the brand; the rest stay quiet. Drawn, not
 * read: the two thumbs under it and the two fields above it are the controls,
 * and they carry the names, so this is `aria-hidden`.
 */
export function PriceSpread({
  figures,
  ceilingMinor,
  minMinor,
  maxMinor,
}: {
  figures: readonly (number | null)[];
  ceilingMinor: number;
  /** The chosen range in kobo; `maxMinor` Infinity when there is no ceiling. */
  minMinor: number;
  maxMinor: number;
}) {
  const counts = useMemo(() => priceHistogram(figures, ceilingMinor, HISTOGRAM_BUCKETS), [figures, ceilingMinor]);
  const tallest = Math.max(1, ...counts);
  return (
    <div className="nf-histo" aria-hidden="true" data-testid="filter-histogram">
      {counts.map((count, index) => (
        <span
          key={index}
          className="nf-histo__bar"
          data-count={count}
          data-in={bucketInRange(index, counts.length, ceilingMinor, minMinor, maxMinor) ? "true" : undefined}
          data-empty={count === 0 ? "true" : undefined}
          style={{ height: `${Math.max(4, (count / tallest) * 100)}%` }}
        />
      ))}
    </div>
  );
}
