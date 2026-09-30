"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { COMPARE_MAX, COMPARE_MIN, forSelection, type CompareTable } from "@/lib/saved/compare";

export type SavedCompareCopy = {
  open: string;
  openLabel: string;
  title: string;
  pick: string;
  pickLimit: string;
  tooFew: string;
  notStated: string;
  lowest: string;
  view: string;
  close: string;
  example: string;
  verified: string;
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
 * The lowest figure of a money row carries a dot and the word "Lowest",
 * never colour alone; a fact the lister did not state says "Not stated".
 * It opens on the two most recently saved.
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
    if (valid.length >= COMPARE_MAX) {
      setNote(copy.pickLimit);
      return;
    }
    setChosen([...valid, id]);
    setNote(null);
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
                        {column.mark ? (
                          <span className={`nf-badge ${column.mark === "example" ? "nf-badge--example" : "nf-badge--verified"}`}>
                            {column.mark === "example" ? copy.example : copy.verified}
                          </span>
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
                                {copy.lowest}
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
