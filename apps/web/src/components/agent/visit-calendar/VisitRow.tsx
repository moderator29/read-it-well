"use client";

import Link from "next/link";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { StatusChip } from "@/components/ui/StatusChip";
import type { InspectionState } from "@/lib/inspections/types";
import { chipOf, type VisitChip, type VisitMode } from "@/lib/visit-calendar/model";
import { chipStateOf } from "./chip-state";

/**
 * ONE VISIT AS ONE ROW: the time, the visit mode as a monochrome glyph, the
 * other person's name, the listing, and the state as a chip (a word, a shape
 * and a colour, never colour alone). Used by the lister's calendar and the
 * console's, so the two draw a visit the same way.
 *
 * A row with somewhere to go is a button; one without (the sheet could not be
 * drawn) is plain text, never a control that does nothing.
 */

export function VisitRow({
  time,
  asked,
  name,
  listing,
  mode,
  modeWord,
  state,
  stateWords,
  context,
  onOpen,
  href,
  selected = false,
}: {
  time: string;
  /** "asked for" while the time is the renter's ask rather than an agreed one. */
  asked: string | null;
  name: string;
  listing: string;
  mode: VisitMode | null;
  modeWord: string | null;
  state: InspectionState;
  stateWords: Record<VisitChip, string>;
  /**
   * Hidden words read before the visible ones (the day, where the row sits
   * outside a day's section). The row's name is its own text plus these,
   * never an `aria-label` that replaces what is drawn.
   */
  context?: string;
  onOpen: (() => void) | null;
  /** A link instead of a button, for the console, whose detail is an address. */
  href?: string;
  selected?: boolean;
}) {
  const body = (
    <>
      <span className="nf-vrow__time">
        {context && <span className="sr-only">{`${context}, `}</span>}
        <span className="nf-numeric">{time}</span>
        {asked && <span className="nf-vrow__asked">{asked}</span>}
      </span>
      <span className="nf-vrow__mode" title={modeWord ?? undefined}>
        {mode && <UiIcon name={mode === "video" ? "video" : "location"} size={18} label={modeWord ?? undefined} />}
      </span>
      <span className="nf-vrow__who">
        <span className="nf-vrow__name">{name}</span>
        <span className="nf-vrow__listing">{listing}</span>
      </span>
      <span className="nf-vrow__state">
        <StatusChip state={chipStateOf(state)} size="xs">
          {stateWords[chipOf(state)]}
        </StatusChip>
      </span>
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        scroll={false}
        className="nf-vrow nf-vrow--open"
        aria-current={selected ? "true" : undefined}
        data-testid="visit-row"
        data-state={state}
      >
        {body}
      </Link>
    );
  }
  if (!onOpen) {
    return (
      <div className="nf-vrow" data-testid="visit-row" data-state={state}>
        {body}
      </div>
    );
  }
  return (
    <button
      type="button"
      className="nf-vrow nf-vrow--open"
      aria-pressed={selected || undefined}
      onClick={onOpen}
      data-testid="visit-row"
      data-state={state}
    >
      {body}
    </button>
  );
}
