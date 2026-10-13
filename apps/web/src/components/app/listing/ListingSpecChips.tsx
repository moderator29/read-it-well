"use client";

import { useId, useState } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { splitChips, type SpecChip } from "./spec-chips";
import "@/app/css/catalogue.css";

export type { SpecChip } from "./spec-chips";

/**
 * The fact chips under the title (7B5335E0, and the founder's reference of 13
 * October 2026): a line icon and a few words each, wrapping onto a second row,
 * with a "+N" chip that opens the rest in place. The chips are built on the
 * server from the listing's own columns (`spec-chips.ts`); this file only
 * draws them and owns the one toggle.
 *
 * The "+N" chip is a real button with `aria-expanded`, named in words for a
 * screen reader ("Show all details"), so the number is never the only label.
 * Opened, the rest join the row and the last chip says "Show fewer details".
 */
export function ListingSpecChips({
  chips,
  labels,
}: {
  chips: SpecChip[];
  /** "Show all details" and "Show fewer details", from the page's dictionary. */
  labels?: { more: string; fewer: string };
}) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  if (chips.length === 0) return null;
  /* Without the two labels there is no honest name for the toggle, so every
     chip is drawn rather than any being hidden behind an unnamed control. */
  const { shown, hidden } = labels ? splitChips(chips) : { shown: chips, hidden: [] };
  const drawn = open ? [...shown, ...hidden] : shown;
  return (
    <div className="nf-spec-wrap">
      <ul id={listId} className="nf-spec-row nf-spec-row--fit" data-testid="spec-chips">
        {drawn.map((chip) => (
          <li key={chip.key} className="nf-spec-tile" data-chip={chip.key}>
            <UiIcon name={chip.icon} size={18} />
            <span>{chip.label}</span>
          </li>
        ))}
        {hidden.length > 0 && labels && (
          <li className="nf-spec-more-cell">
            <button
              type="button"
              className="nf-spec-more"
              aria-expanded={open}
              aria-controls={listId}
              aria-label={open ? labels.fewer : `+${hidden.length} ${labels.more}`}
              onClick={() => setOpen((current) => !current)}
              data-testid="spec-chips-more"
            >
              {open ? <UiIcon name="minus" size={16} /> : <span className="nf-numeric">+{hidden.length}</span>}
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
