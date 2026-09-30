"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import type { Dictionary } from "@vallo/i18n/core";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { SearchPill } from "./SearchPill";

type Tab = "search" | "movein";
const TABS: readonly Tab[] = ["search", "movein"];
const ICON: Record<Tab, UiIconName> = { search: "search", movein: "banknote" };

/**
 * THE HERO'S ONE SURFACE, TWO JOBS (A8 folded into the hero, 30 September):
 * find a place, or work out what a rent really costs to move in. Two capsule
 * tabs sit over the search card (the active one a tinted pill, like the
 * dock's), and the card below is the search or the move-in field.
 *
 * The move-in total used to be a card of its own under the fact row, about
 * 420px on a phone; as a tab it costs one 44px row. Both panels share one
 * grid cell, so switching never moves the facts under them; the one not
 * chosen is invisible and inert, so it is out of the tab order and the
 * accessibility tree.
 *
 * Both panels are plain GET forms: the search goes to the discovery page,
 * the rent to `/move-in-cost`, which adds the fees the visitor was quoted.
 * Without script the search shows, and the calculator is still one link
 * away in the header and the footer.
 */
export function HeroSurface({
  search,
  moveIn,
}: {
  search: Dictionary["landing"]["face"]["search"];
  moveIn: Dictionary["publicDoors"]["moveIn"];
}) {
  const [tab, setTab] = useState<Tab>("search");
  const base = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const label: Record<Tab, string> = { search: moveIn.tabSearch, movein: moveIn.tabMoveIn };

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = TABS[(i + delta + TABS.length) % TABS.length] ?? "search";
    setTab(next);
    (listRef.current?.children[TABS.indexOf(next)] as HTMLElement | undefined)?.focus();
  };

  return (
    <div className="nf-hero-surface">
      <div ref={listRef} role="tablist" aria-label={moveIn.tabsLabel} className="nf-hero-tabs">
        {TABS.map((id, i) => (
          <button
            key={id}
            id={`${base}-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls={`${base}-panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            className="nf-hero-tab"
            onClick={() => setTab(id)}
            onKeyDown={(e) => onKey(e, i)}
          >
            <UiIcon name={ICON[id]} size={16} aria-hidden />
            <span>{label[id]}</span>
          </button>
        ))}
      </div>

      <div className="nf-hero-surface__panels">
        <div
          id={`${base}-panel-search`}
          role="tabpanel"
          aria-labelledby={`${base}-tab-search`}
          data-active={tab === "search"}
          inert={tab !== "search"}
        >
          <SearchPill labels={search} />
        </div>
        <div
          id={`${base}-panel-movein`}
          role="tabpanel"
          aria-labelledby={`${base}-tab-movein`}
          data-active={tab === "movein"}
          inert={tab !== "movein"}
        >
          <form method="get" action="/move-in-cost" className="nf-landing-pill nf-landing-pill--movein">
            <p className="nf-landing-pill-note">{moveIn.compactBody}</p>
            <label className="nf-landing-pill-field">
              <span className="nf-landing-pill-naira" aria-hidden="true">
                ₦
              </span>
              <span className="sr-only">{moveIn.rentLabel}</span>
              <input
                name="rent"
                className="nf-numeric"
                inputMode="decimal"
                autoComplete="off"
                enterKeyHint="go"
                placeholder={moveIn.compactPlaceholder}
                maxLength={18}
                data-testid="hero-movein-rent"
              />
            </label>
            <button type="submit" className="nf-landing-pill-go" aria-label={moveIn.compactSubmit}>
              <span className="nf-landing-pill-go__word">{moveIn.compactSubmit}</span>
              <UiIcon name="arrow-right" size={20} aria-hidden />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
