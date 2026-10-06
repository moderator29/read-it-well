"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { COMPARE_MIN, forSelection, type CompareTable } from "@/lib/saved/compare";
import type { UiIconName } from "@/design-system/icons/UiIcon";
import "@/app/css/catalogue.css";
import "@/app/css/list-views.css";

/** 15.3: a head-to-head is two columns. */
const TWO = 2;

/** The small glyph per row (15.3), by the row's key; a fee line takes the receipt. */
const ROW_GLYPH: Record<string, UiIconName> = {
  moveIn: "wallet",
  rent: "key",
  beds: "bed",
  baths: "bath",
  size: "grid",
  parking: "parking",
  type: "house",
  power: "bolt",
  available: "calendar-check",
};

export type SavedCompareCopy = {
  open: string;
  openLabel: string;
  title: string;
  pick: string;
  pickLimit: string;
  tooFew: string;
  notStated: string;
  view: string;
  close: string;
  verified: string;
  /** "Lower": the leading figure of two, by word. */
  lower: string;
};

/**
 * COMPARE WHAT YOU SAVED (recommendation B3, 30 September 2026).
 *
 * A quiet "Compare" control over the Saved grid, shown at two saved
 * properties or more. It opens one page (a full sheet on a phone, the same
 * sheet across a wide screen) with the reader's shortlist as a row of picks
 * on top, two or three at a time, and under it the table: a column per place
 * (photo, title, place, its Example or Verified mark, and a door to it) and a
 * row per fact from `lib/saved/compare.ts`.
 *
 * ON A PHONE the columns swipe: the fact names stay pinned on the left and
 * the places scroll sideways a column at a time (scroll snap). ON A WIDE
 * SCREEN every chosen column is in view as a grid.
 *
 * The lower figure of a money row carries a dot and the word "Lower",
 * never colour alone; a fact the lister did not state says "Not stated".
 * It opens on the two most recently saved.
 *
 * SESSION 3 (W2): THE HEAD-TO-HEAD OF NORTH STAR 15.3. Two columns, never
 * three: a comparison table earns its place as two figures read across one
 * labelled row, and a third column on a phone is a column you cannot see. A
 * third pick replaces the first, so the reader is never refused. Each row
 * carries a small line glyph so the eye finds the row before it reads it, and
 * the leading value of a money row is weighted (and named "Lower", by word,
 * never by colour alone). Both columns are the reader's own saved spaces:
 * this never compares against another member, and there is no leaderboard.
 * D24: no Example mark on a column; Verified only where it was earned.
 */
export function SavedCompare({ table, copy }: { table: CompareTable; copy: SavedCompareCopy }) {
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<string[]>(() => table.columns.slice(0, COMPARE_MIN).map((c) => c.id));
  const [note, setNote] = useState<string | null>(null);

  /* A place removed from Saved leaves the compare too. */
  const valid = chosen.filter((id) => table.columns.some((c) => c.id === id));
  const shown = useMemo(() => forSelection(table, valid), [table, valid]);

  if (table.columns.length < COMPARE_MIN) return null;

  const toggle = (id: string) => {
    if (valid.includes(id)) {
      setChosen(valid.filter((x) => x !== id));
      setNote(null);
      return;
    }
    /* A third pick replaces the first chosen: two at a time, never refused. */
    setChosen(valid.length >= TWO ? [...valid.slice(1), id] : [...valid, id]);
    setNote(valid.length >= TWO ? copy.pickLimit : null);
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={copy.openLabel}
        data-testid="saved-compare-open"
        className="nf-compare-open"
      >
        <UiIcon name="scale" size={16} />
        {copy.open}
      </Button>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={copy.title}
        fullPage
        closeLabel={copy.close}
        testId="saved-compare"
        className="nf-compare-sheet"
      >
        <p className="nf-caption text-[var(--nf-content-secondary)]">{copy.pick}</p>
        <ul className="nf-compare-picks nf-scroll-x" aria-label={copy.pick}>
          {table.columns.map((column) => {
            const on = valid.includes(column.id);
            return (
              <li key={column.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(column.id)}
                  className="nf-compare-pick"
                  data-on={on || undefined}
                >
                  <span className="nf-compare-pick__photo" aria-hidden="true">
                    {column.photo ? (
                      <RemoteImage src={column.photo} alt="" width={40} height={40} sizes="40px" />
                    ) : null}
                  </span>
                  <span className="nf-compare-pick__title">{column.title}</span>
                  <span className="nf-compare-pick__tick" aria-hidden="true">
                    {on ? <UiIcon name="check" size={16} /> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="nf-caption mt-inline-tight min-h-5 text-[var(--nf-content-muted)]" role="status">
          {note ?? (valid.length < COMPARE_MIN ? copy.tooFew : "")}
        </p>

        {shown.columns.length >= COMPARE_MIN ? (
          <div
            className="nf-compare"
            role="region"
            aria-label={copy.title}
            tabIndex={0}
            style={{ "--nf-compare-cols": shown.columns.length } as React.CSSProperties}
          >
            <table className="nf-compare__table">
              <thead>
                <tr>
                  <td className="nf-compare__corner" />
                  {shown.columns.map((column) => (
                    <th key={column.id} scope="col" className="nf-compare__head">
                      <span className="nf-compare__photo">
                        {column.photo ? (
                          <RemoteImage src={column.photo} alt="" width={160} height={120} sizes="(max-width: 640px) 40vw, 240px" />
                        ) : null}
                        {column.mark === "verified" ? (
                          <span className="nf-badge nf-badge--verified">{copy.verified}</span>
                        ) : null}
                      </span>
                      <span className="nf-compare__title">{column.title}</span>
                      <span className="nf-compare__place">{column.place}</span>
                      <Link href={`/listing/${column.id}`} className="nf-compare__view">
                        {copy.view}
                        <UiIcon name="arrow-right" size={16} />
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.rows.map((row) => (
                  <tr key={row.key}>
                    <th scope="row" className="nf-compare__label">
                      <span className="nf-compare__glyph" aria-hidden="true">
                        <UiIcon name={ROW_GLYPH[row.key] ?? (row.kind === "money" ? "receipt" : "info")} size={16} />
                      </span>
                      {row.label}
                    </th>
                    {row.cells.map((cell, i) => (
                      <td
                        key={shown.columns[i]!.id}
                        className="nf-compare__cell"
                        data-kind={row.kind}
                        data-lowest={cell.lowest || undefined}
                      >
                        {cell.text === null ? (
                          <span className="nf-compare__none">{copy.notStated}</span>
                        ) : (
                          <>
                            <span className={row.kind === "money" ? "nf-numeric" : undefined}>{cell.text}</span>
                            {cell.lowest ? (
                              <span className="nf-compare__lowest">
                                <span className="nf-compare__dot" aria-hidden="true" />
                                {copy.lower}
                              </span>
                            ) : null}
                          </>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Sheet>
    </>
  );
}
