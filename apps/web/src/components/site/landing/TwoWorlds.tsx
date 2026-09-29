"use client";

import { useState } from "react";
import type { Locale } from "@vallo/i18n/core";
import { ButtonLink } from "@/components/ui/Button";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { MiniListing } from "@/lib/site/listing-card";
import { ListingMini } from "./ListingMini";

/**
 * Two worlds, one account (Track M, second pass): the Property and Stays
 * sides of Vallo, one at a time, on a quiet segmented switch.
 *
 * The two sides are both in the page (so a crawler and a screen reader get
 * both), stacked in one grid cell; the shown one is at full opacity and the
 * other is faded out and `inert`, so the swap is a cross-fade with no layout
 * change. The accent follows the side through `data-side`.
 *
 * The listings are real ones from the landing's catalogue read, three a side
 * where they exist; a side with none simply shows its words. An example
 * listing's card says "Example" (UIUX item 6, `ListingMini`).
 */
type SideCopy = { label: string; title: string; body: string; cta: string };

export function TwoWorlds({
  property,
  stays,
  listings,
  locale,
  verifiedLabel,
  exampleLabel,
  hrefs,
}: {
  property: SideCopy;
  stays: SideCopy;
  listings: { property: MiniListing[]; stays: MiniListing[] };
  locale: Locale;
  verifiedLabel: string;
  exampleLabel: string;
  /** Each side's door, already made honest for a stranger (`doors.ts`). */
  hrefs: { property: string; stays: string };
}) {
  const [side, setSide] = useState<"property" | "stays">("property");
  const copy = { property, stays };

  return (
    <div className="nf-worlds" data-side={side}>
      {/* A quiet segmented track (spec section 7): the white thumb slides to
          the chosen side (`--nf-seg-index`, transform only). The glass flip
          coin that sat beside it is gone with the landing's glass objects
          (spec section 16, Q3). */}
      <div
        className="nf-worlds__switch"
        role="group"
        aria-label={`${property.label} / ${stays.label}`}
        style={{ "--nf-seg-index": side === "property" ? 0 : 1 } as React.CSSProperties}
      >
        {(["property", "stays"] as const).map((key) => (
          <button
            key={key}
            type="button"
            className="nf-worlds__tab"
            aria-pressed={side === key}
            onClick={() => setSide(key)}
          >
            <UiIcon name={key === "property" ? "key" : "bed"} size={16} aria-hidden />
            {copy[key].label}
          </button>
        ))}
      </div>

      <div className="nf-worlds__stage">
        {(["property", "stays"] as const).map((key) => (
          <div key={key} className="nf-worlds__panel" data-shown={side === key ? "true" : "false"} inert={side !== key}>
            <div className="nf-worlds__copy">
              <h3 className="nf-worlds__title">{copy[key].title}</h3>
              <p className="nf-worlds__body">{copy[key].body}</p>
              <div>
                <ButtonLink href={hrefs[key]} variant="primary" size="md" trailingIcon="arrow-right">
                  {copy[key].cta}
                </ButtonLink>
              </div>
            </div>
            {listings[key].length > 0 && (
              <ul className="nf-worlds__cards">
                {listings[key].map((l, i) => (
                  <li key={l.id} style={{ "--card-i": i } as React.CSSProperties}>
                    <ListingMini listing={l} locale={locale} verifiedLabel={verifiedLabel} exampleLabel={exampleLabel} sizes="220px" />
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
