"use client";

import Link from "next/link";
import { useId, useState, type KeyboardEvent } from "react";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

type Segment = "buy" | "rent" | "stay";

/**
 * The floating search pill: a text field, three segments, a filter glyph.
 *
 * THREE SEGMENTS, NOT THE RENDER'S FOUR. The governing image shows Buy /
 * Rent / Stay / Invest. Vallo sells no investment product: the fourth
 * segment pointed at `/search?type=land`, which is a land listing and not
 * an investment, so the pill was naming a capability the platform does not
 * have. The content truth sweep of 19 September drops it, and land stays
 * reachable from the category grid below and from the filter drawer. The
 * visual treatment of the pill is unchanged; the three segments simply take
 * the width the four had.
 *
 * Every remaining segment is a real route. Buy and Rent are the discovery
 * page with the matching market (`type` is the parameter search-params.ts
 * reads; homes for sale, yearly rentals); Stay is the stays search. The
 * form submits with GET, so the pill works with no JavaScript at all and
 * the segment only decides where the text goes. The filter glyph opens the
 * discovery page, whose own drawer holds every filter this platform has.
 */
const ROUTES: Record<Segment, { action: string; type?: string; icon: UiIconName }> = {
  buy: { action: "/search", type: "home", icon: "home" },
  rent: { action: "/search", type: "rental", icon: "key" },
  stay: { action: "/stays/search", icon: "bed" },
};
const ORDER: Segment[] = ["buy", "rent", "stay"];

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
      {route.type && <input type="hidden" name="type" value={route.type} />}
      <div className="nf-landing-pill-segments" role="radiogroup" aria-labelledby={groupId}>
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
            {labels[s]}
          </button>
        ))}
      </div>
      <div className="nf-landing-pill-actions">
        <Link href="/search" aria-label={labels.filters} prefetch={false}>
          <UiIcon name="sliders" size={18} aria-hidden />
        </Link>
        {/* Word first, arrow after it, as "Explore Properties" already does.
            The two used to be laid out by `place-items: center` on a grid,
            which at 390 put the arrow in a row of its own above the word and
            made the product's primary control read as broken (R1 finding
            A8). Above 640 the button is a circle and the word is for screen
            readers only. */}
        <button type="submit" aria-label={labels.go}>
          <span className="sm:sr-only">{labels.go}</span>
          <UiIcon name="arrow-right" size={18} aria-hidden />
        </button>
      </div>
    </form>
  );
}
