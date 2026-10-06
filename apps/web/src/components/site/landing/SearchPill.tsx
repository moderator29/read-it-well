"use client";

import Link from "next/link";
import { useId, useState, type CSSProperties, type KeyboardEvent } from "react";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { ORDER, type Segment } from "./segments";

/**
 * The landing search, ONE SURFACE (UIUX item 8): a field, the quiet
 * segmented Buy / Rent / Stay, a filters button and the go button on one
 * card, with no border inside it. From 40rem they sit in one 64px row; on a
 * phone the segments lead, full width, the go button sits inside the field's
 * right end, and filters become a quiet "Filters" line under it (landing.css,
 * "the search").
 *
 * THE SEGMENTS AND THE HEADLINE ARE ONE THING. The landing headline reads
 * "Rent, buy or stay. Without the runaround." and it names these three
 * segments on purpose, so the headline teaches the control and the control
 * proves the headline. IF ONE CHANGES, THE OTHER
 * CHANGES IN THE SAME COMMIT. The order and the reasoning live in
 * `segments.ts` beside this file, the words in `landing.face` in
 * `packages/i18n`, and `headline-coupling.test.ts` fails if they drift.
 *
 * THREE SEGMENTS, NOT THE RENDER'S FOUR. The governing image shows Buy /
 * Rent / Stay / Invest. Vallo sells no investment product: the fourth
 * segment pointed at `/search?type=land`, which is a land listing and not
 * an investment, so the pill was naming a capability the platform does not
 * have. The content truth sweep of 19 September drops it, and land stays
 * reachable from the category grid below and from the filter drawer. The
 * visual treatment of the pill is unchanged.
 *
 * THIS PARAGRAPH USED TO CLAIM the three segments "simply take the width the
 * four had", and that was wrong from the day it was written: the stylesheet
 * hardcoded `repeat(4, ...)` and the fourth track stayed empty, so a QUARTER
 * OF THE CONTROL WAS DEAD SPACE on every phone. The count is driven from
 * `ORDER.length` through `--nf-seg-count` now, so the array is the only place
 * the number lives and the next person to add a segment changes one line.
 *
 * Every remaining segment is a real route. Buy and Rent are the discovery
 * page with the matching MARKET (`market`, which `shelf-query.ts` reads).
 * They used to send `type=home` and `type=rental`, which are categories, not
 * markets: Buy showed houses to let as well as for sale, and Rent missed every
 * flat or house to let that was not typed "rental", the same disagreement
 * that got the second rent shelf deleted (V-26). Stay is the stays search. The
 * form submits with GET, so the pill works with no JavaScript at all and
 * the segment only decides where the text goes. The filter glyph opens the
 * discovery page, whose own drawer holds every filter this platform has.
 */
const ROUTES: Record<Segment, { action: string; market?: string; icon: UiIconName }> = {
  buy: { action: "/search", market: "buy", icon: "home" },
  rent: { action: "/search", market: "rent", icon: "key" },
  stay: { action: "/stays/search", icon: "bed" },
};

export function SearchPill({
  labels,
}: {
  labels: Record<Segment, string> & {
    label: string;
    placeholder: string;
    filters: string;
    /** The visible word on the phone's quiet Filters line. */
    filtersShort: string;
    go: string;
  };
}) {
  const [segment, setSegment] = useState<Segment>("buy");
  const groupId = useId();
  const route = ROUTES[segment];

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = ORDER[(i + delta + ORDER.length) % ORDER.length] ?? "buy";
    setSegment(next);
    (e.currentTarget.parentElement?.children[ORDER.indexOf(next)] as HTMLElement | undefined)?.focus();
  };

  return (
    <form action={route.action} method="get" role="search" aria-label={labels.label} className="nf-landing-pill">
      <label className="nf-landing-pill-field">
        <UiIcon name="search" size={20} aria-hidden />
        <span className="sr-only">{labels.placeholder}</span>
        <input type="search" name="q" placeholder={labels.placeholder} autoComplete="off" enterKeyHint="search" />
      </label>
      {route.market && <input type="hidden" name="market" value={route.market} />}
      {/* ONE QUIET SEGMENTED TRACK (spec section 7): a raised well, a white
          thumb that slides to the chosen segment (a pseudo-element moved by
          `--nf-seg-index`, transform only, 240ms; it jumps under reduced
          motion). */}
      <div
        className="nf-landing-pill-segments"
        role="radiogroup"
        aria-labelledby={groupId}
        style={{ "--nf-seg-count": ORDER.length, "--nf-seg-index": ORDER.indexOf(segment) } as CSSProperties}
      >
        <span id={groupId} className="sr-only">
          {labels.label}
        </span>
        {ORDER.map((s, i) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={segment === s}
            tabIndex={segment === s ? 0 : -1}
            className="nf-landing-pill-seg"
            onClick={() => setSegment(s)}
            onKeyDown={(e) => onKey(e, i)}
          >
            <UiIcon name={ROUTES[s].icon} size={16} aria-hidden />
            {/* Its own block so a long word in Hausa or Igbo can ellipsis
                inside the segment instead of painting past it. */}
            <span className="nf-landing-pill-seg__label">{labels[s]}</span>
          </button>
        ))}
      </div>
      {/* The discovery page, whose own drawer holds every filter this
          platform has. A 44px icon button beside the search on a wide
          screen; a quiet "Filters" line under the field on a phone. */}
      {/* The accessible name always contains the word on screen (WCAG 2.5.3,
          label in name), so a voice-control user can say what they see: where
          the short word is not part of the full label (a locale that still
          shows the English "Filters"), the name leads with it. */}
      <Link href="/search" prefetch={false} className="nf-landing-pill-filters" aria-label={filtersName(labels.filters, labels.filtersShort)}>
        <UiIcon name="sliders" size={20} aria-hidden />
        <span className="nf-landing-pill-filters__word" aria-hidden="true">
          {labels.filtersShort}
        </span>
      </Link>
      {/* Word and arrow on a wide screen; the arrow alone inside the
          field's right end on a phone, with the word for a screen reader. */}
      <button type="submit" className="nf-landing-pill-go" aria-label={labels.go}>
        <span className="nf-landing-pill-go__word">{labels.go}</span>
        <UiIcon name="arrow-right" size={20} aria-hidden />
      </button>
    </form>
  );
}

/** The filters link's accessible name: the full label, led by the visible word when the label lacks it. */
function filtersName(full: string, short: string): string {
  return full.toLocaleLowerCase().includes(short.toLocaleLowerCase()) ? full : `${short}, ${full}`;
}
