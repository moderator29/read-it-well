"use client";

import { useState } from "react";
import type { Locale } from "@vallo/i18n";
import { ButtonLink } from "@/components/ui/Button";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import type { MiniListing } from "@/lib/site/listing-card";
import { ListingMini } from "./ListingMini";

/**
 * Two worlds, one account (Track M, second pass): the Property and Stays
 * sides of Vallo, one at a time, flipped with the coin.
 *
 * The coin is the product's own flip object in miniature: keys on one face,
 * the hotel on the other, turning half a circle in 3D when the side changes.
 * The two sides are both in the page (so a crawler and a screen reader get
 * both), stacked in one grid cell; the shown one is at full opacity and the
 * other is faded out and `inert`, so the swap is a cross-fade with no layout
 * change. The accent follows the side through `data-side`.
 *
 * The listings are real ones from the landing's catalogue read, three a side
 * where they exist; a side with none simply shows its words.
 */
type SideCopy = { label: string; title: string; body: string; cta: string };

export function TwoWorlds({
  property,
  stays,
  listings,
  locale,
  flipLabel,
  verifiedLabel,
}: {
  property: SideCopy;
  stays: SideCopy;
  listings: { property: MiniListing[]; stays: MiniListing[] };
  locale: Locale;
  flipLabel: string;
  verifiedLabel: string;
}) {
  const [side, setSide] = useState<"property" | "stays">("property");
  const other = side === "property" ? "stays" : "property";
  const copy = { property, stays };

  return (
    <div className="nf-worlds" data-side={side}>
      <div className="nf-worlds__switch" role="group" aria-label={`${property.label} / ${stays.label}`}>
        {(["property", "stays"] as const).map((key) => (
          <button
            key={key}
            type="button"
            className="nf-worlds__tab nf-m-press"
            aria-pressed={side === key}
            onClick={() => setSide(key)}
          >
            {copy[key].label}
          </button>
        ))}
        <button
          type="button"
          className="nf-worlds__coin"
          aria-label={`${flipLabel} ${copy[other].label}`}
          onClick={() => setSide(other)}
        >
          <span className="nf-worlds__coin-inner">
            <span className="nf-worlds__face nf-worlds__face--front">
              <BrandIcon name="keys-home" size={40} />
            </span>
            <span className="nf-worlds__face nf-worlds__face--back">
              <BrandIcon name="hotel" size={40} />
            </span>
          </span>
        </button>
      </div>

      <div className="nf-worlds__stage">
        {(["property", "stays"] as const).map((key) => (
          <div key={key} className="nf-worlds__panel" data-shown={side === key ? "true" : "false"} inert={side !== key}>
            <div className="nf-worlds__copy">
              <h3 className="nf-worlds__title">{copy[key].title}</h3>
              <p className="nf-worlds__body">{copy[key].body}</p>
              <div>
                <ButtonLink href={key === "property" ? "/search" : "/stays"} variant="primary" size="md" trailingIcon="arrow-right">
                  {copy[key].cta}
                </ButtonLink>
              </div>
            </div>
            {listings[key].length > 0 && (
              <ul className="nf-worlds__cards">
                {listings[key].map((l, i) => (
                  <li key={l.id} style={{ "--card-i": i } as React.CSSProperties}>
                    <ListingMini listing={l} locale={locale} verifiedLabel={verifiedLabel} sizes="220px" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
