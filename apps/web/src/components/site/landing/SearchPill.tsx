"use client";

import Link from "next/link";
import { useId, useState, type CSSProperties, type KeyboardEvent } from "react";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { ORDER, type Segment } from "./segments";

/**
 * The floating search pill: a text field, three segments, a filter glyph.
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
        <input type="search" name="q" placeholder={labels.placeholder} autoComplete="off" />
      </label>
      {route.market && <input type="hidden" name="market" value={route.market} />}
      <div
        className="nf-landing-pill-segments"
        role="radiogroup"
        aria-labelledby={groupId}
        style={{ "--nf-seg-count": ORDER.length } as CSSProperties}
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
            {/*
              THE LABEL IS ITS OWN BLOCK NOW, AND THAT IS HALF OF A FIX WHOSE
              OTHER HALF IS A STYLESHEET.
              `--nf-seg-count` freed the TRACK, which was the dead fourth
              column. It did not free the ITEM: `minmax(0, 1fr)` removes the
              track's automatic minimum and a grid item keeps `min-width:auto`
              regardless, so with `white-space: nowrap` on the segment the
              min-content width is still the whole word. In Hausa "Masauki" and
              in Igbo "Gbazite" are seven characters against roughly 35px of
              room after the 16px glyph, the 4px gap and 24px of padding, so
              the WORD paints outside the control even though the track is now
              right. `text-overflow` cannot act on a flex container's anonymous
              text run, so it needs this span to exist before the stylesheet
              can clip anything.
              HANDED TO GROUP B: `.nf-landing-pill-seg` at
              `app/css/landing.css` wants `min-inline-size: 0`, and this span
              wants `overflow: hidden; text-overflow: ellipsis`.
            */}
            <span className="nf-landing-pill-seg__label">{labels[s]}</span>
          </button>
        ))}
      </div>
      <div className="nf-landing-pill-actions">
        <Link href="/search" aria-label={labels.filters} prefetch={false}>
          <UiIcon name="sliders" size={20} aria-hidden />
        </Link>
        {/* Word first, arrow after it, as "Explore Properties" already does.
            The two used to be laid out by `place-items: center` on a grid,
            which at 390 put the arrow in a row of its own above the word and
            made the product's primary control read as broken (R1 finding
            A8). Above 640 the button is a circle and the word is for screen
            readers only. */}
        <button type="submit" aria-label={labels.go}>
          <span className="sm:sr-only">{labels.go}</span>
          <UiIcon name="arrow-right" size={20} aria-hidden />
        </button>
      </div>
    </form>
  );
}
