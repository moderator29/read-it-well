"use client";

import { Children, createContext, useContext } from "react";
import type { CSSProperties, ReactNode, ThHTMLAttributes, TdHTMLAttributes } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * The table.
 *
 * There was no table design on this platform. Not a weak one - none. globals.css
 * contained no `table`, `thead` or `td` rule of any kind, and the two surfaces
 * that genuinely need a table (the agent earnings ledger and the admin
 * dashboard) each hand-rolled a bare `<table>` and then maintained a second
 * hand-written card rendering beside it for phones. Between them they had: no
 * sticky header, so the column meanings scroll away on the twentieth row and
 * an operator is reading unlabelled numbers; no row hover, so the eye loses the
 * row it is tracking across the width; no sort, so a ledger cannot be read
 * newest-first; no density control, so a 400-row queue paginates by scrolling;
 * and no empty state, so an empty query renders a header over a void.
 *
 * The decisions this owns:
 *
 * - `border-collapse: separate` with zero spacing. Collapsed borders are shared
 *   between cells, and a sticky header carrying a shared border loses it the
 *   moment it detaches - the hairline under the header vanishes exactly when it
 *   is doing the most work.
 *
 * - The header sticks to the SCROLL BOX, not the page. Setting `overflow-x` on
 *   the wrapper makes `overflow-y` a scroll container too - CSS gives no way to
 *   scroll one axis and let the other overflow visibly - so vertical sticky can
 *   never escape the wrapper. That is why `maxHeight` exists: give the table its
 *   own scroll box and the header does what it promises. Without it the header
 *   is pinned to the top of a box that never scrolls, which is a no-op rather
 *   than a bug, and the surrounding page scrolls as usual.
 *
 * - The wrapper scrolls sideways so the PAGE never does. A table that widens the
 *   document breaks every other screen on the phone, not just this one.
 *
 * - Numeric columns are end-aligned and tabular. Proportional digits in a money
 *   column mean the naira figures do not line up by place value, which is the
 *   entire reason a ledger is a table.
 */

export type TableDensity = "comfortable" | "compact";
export type CellAlign = "start" | "end";

type TableContextValue = {
  density: TableDensity;
  empty?: ReactNode;
  stickyHeader: boolean;
};

const TableContext = createContext<TableContextValue>({
  density: "comfortable",
  stickyHeader: true,
});

/** Lets `TH`/`TR` behave differently in the header without a prop at each site. */
const HeadContext = createContext(false);

const TH_PAD: Record<TableDensity, string> = {
  comfortable: "px-3 py-2.5",
  compact: "px-3 py-1.5",
};

const TD_PAD: Record<TableDensity, string> = {
  comfortable: "px-3 py-3",
  compact: "px-3 py-2",
};

const HAIRLINE = "border-b border-[var(--nf-border-subtle)]";

export type TableProps = {
  /**
   * The table's accessible name, as a real `<caption>` rather than an
   * `aria-label`: a caption is the element screen readers announce when entering
   * table navigation mode, and it survives with CSS off. Visually hidden by
   * default because most tables already sit under a visible heading; set
   * `captionVisible` when the table stands alone.
   */
  caption: string;
  captionVisible?: boolean;
  density?: TableDensity;
  /** Rendered in place of the rows when `TBody` receives none. */
  empty?: ReactNode;
  stickyHeader?: boolean;
  /**
   * Gives the table its own vertical scroll box, which is what makes
   * `stickyHeader` actually stick. A CSS length or a number of pixels.
   */
  maxHeight?: number | string;
  className?: string;
  children: ReactNode;
};

export function Table({
  caption,
  captionVisible = false,
  density = "comfortable",
  empty,
  stickyHeader = true,
  maxHeight,
  className,
  children,
}: TableProps) {
  return (
    <TableContext.Provider value={{ density, empty, stickyHeader }}>
      <div
        className={["w-full overflow-x-auto", className ?? ""].filter(Boolean).join(" ")}
        style={{
          maxHeight,
          // A flick past the end of a wide table must not scroll the page
          // behind it, and on iOS must not trigger the back-swipe.
          overscrollBehaviorX: "contain",
        }}
      >
        <table className="w-full border-separate border-spacing-0 text-left text-[var(--nf-text-body)]">
          <caption
            className={
              captionVisible
                ? "px-3 pb-2 text-left text-[var(--nf-text-caption)] text-[var(--nf-content-muted)]"
                : "sr-only"
            }
          >
            {caption}
          </caption>
          {children}
        </table>
      </div>
    </TableContext.Provider>
  );
}

export function THead({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <HeadContext.Provider value={true}>
      <thead className={className}>{children}</thead>
    </HeadContext.Provider>
  );
}

export function TBody({ children, className }: { children: ReactNode; className?: string }) {
  const { empty } = useContext(TableContext);
  /*
   * `Children.toArray` flattens the array a `rows.map(...)` produces and drops
   * the `null`/`false` a conditional row leaves behind, so this counts real rows
   * rather than expressions.
   */
  const hasRows = Children.toArray(children).length > 0;

  return (
    <tbody className={className}>
      {hasRows ? (
        children
      ) : empty ? (
        <tr>
          {/*
            1000 is the maximum colSpan HTML defines, and browsers clamp it to
            the table's real column count. Spanning the full width without the
            component being told how many columns there are means the empty
            state can never drift out of sync with the header.
          */}
          <td
            colSpan={1000}
            className="px-3 py-10 text-center text-[var(--nf-content-muted)]"
          >
            {empty}
          </td>
        </tr>
      ) : null}
    </tbody>
  );
}

export type TRProps = {
  /**
   * The row is a control - it opens a detail pane. Adds the pointer and keeps
   * the hover cue honest; a row that highlights but does nothing reads as
   * broken.
   */
  onClick?(): void;
  selected?: boolean;
  className?: string;
  children: ReactNode;
};

export function TR({ onClick, selected, className, children }: TRProps) {
  const inHead = useContext(HeadContext);

  return (
    <tr
      onClick={onClick}
      aria-selected={selected}
      className={[
        inHead ? "" : "transition-colors hover:bg-[var(--nf-glass-fill)] motion-reduce:transition-none",
        onClick ? "cursor-pointer" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        inHead
          ? undefined
          : ({
              transitionDuration: "var(--nf-duration-fast)",
              transitionTimingFunction: "var(--nf-ease-standard)",
              ...(selected
                ? { background: "color-mix(in oklab, var(--nf-brand-primary) 14%, transparent)" }
                : null),
            } satisfies CSSProperties)
      }
    >
      {children}
    </tr>
  );
}

export type SortDirection = "ascending" | "descending" | "none";

export type THProps = {
  align?: CellAlign;
  /**
   * Makes the header a button and exposes `aria-sort`. The parent owns the sort
   * state: a table primitive that sorted its own children would have to
   * understand their values, and would silently disagree with server-side
   * ordering the moment a list is paginated.
   */
  sortable?: boolean;
  sort?: SortDirection;
  onSortChange?(): void;
  className?: string;
  children: ReactNode;
} & Omit<ThHTMLAttributes<HTMLTableCellElement>, "align" | "className" | "children">;

export function TH({
  align = "start",
  sortable = false,
  sort = "none",
  onSortChange,
  className,
  children,
  ...rest
}: THProps) {
  const { density, stickyHeader } = useContext(TableContext);
  const inHead = useContext(HeadContext);
  const sticky = inHead && stickyHeader;

  const label = (
    <>
      <span>{children}</span>
      {sortable ? (
        /*
         * One caret that rotates, rather than two glyphs swapped. The rotation
         * carries the direction change as motion the eye follows; a swap is a
         * flicker. Dimmed while unsorted so the column still advertises that it
         * can be sorted without claiming that it is.
         *
         * The transform sits on a wrapper because `UiIcon` deliberately exposes
         * no `style`: the glyph set owns how a glyph is drawn, and callers own
         * where it sits.
         */
        <span
          aria-hidden="true"
          className="inline-flex transition-transform motion-reduce:transition-none"
          style={{
            opacity: sort === "none" ? 0.4 : 1,
            transform: sort === "ascending" ? "rotate(180deg)" : undefined,
            transitionDuration: "var(--nf-duration-fast)",
            transitionTimingFunction: "var(--nf-ease-standard)",
          }}
        >
          <UiIcon name="chevron-down" size={12} />
        </span>
      ) : null}
    </>
  );

  return (
    <th
      {...rest}
      scope={rest.scope ?? "col"}
      aria-sort={sortable ? sort : undefined}
      className={[
        TH_PAD[density],
        HAIRLINE,
        "text-[var(--nf-text-overline)] font-bold uppercase tracking-[0.06em] text-[var(--nf-content-muted)]",
        align === "end" ? "text-end" : "text-start",
        sticky ? "sticky top-0 z-1" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      /*
       * A sticky header needs its own opaque background or the rows scroll
       * through it. The blur keeps it consistent with every other pinned
       * surface on the platform for the moment a row is mid-transit under it.
       */
      style={
        sticky
          ? {
              background: "var(--nf-surface-primary)",
              backdropFilter: "blur(var(--nf-glass-blur-soft))",
              WebkitBackdropFilter: "blur(var(--nf-glass-blur-soft))",
            }
          : undefined
      }
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSortChange}
          className={[
            "inline-flex items-center gap-1 uppercase tracking-[inherit] transition-colors hover:text-[var(--nf-content-primary)] motion-reduce:transition-none",
            align === "end" ? "flex-row-reverse" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {label}
        </button>
      ) : (
        <span
          className={[
            "inline-flex items-center gap-1",
            align === "end" ? "flex-row-reverse" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {label}
        </span>
      )}
    </th>
  );
}

export type TDProps = {
  /**
   * `end` is the numeric alignment: it right-aligns AND makes the figures
   * tabular via `.nf-numeric`, because those two always travel together. A
   * right-aligned column of proportional digits is worse than a left-aligned
   * one - it looks like it should line up, and does not.
   */
  align?: CellAlign;
  className?: string;
  children: ReactNode;
} & Omit<TdHTMLAttributes<HTMLTableCellElement>, "align" | "className" | "children">;

export function TD({ align = "start", className, children, ...rest }: TDProps) {
  const { density } = useContext(TableContext);

  return (
    <td
      {...rest}
      className={[
        TD_PAD[density],
        HAIRLINE,
        "align-middle text-[var(--nf-content-secondary)]",
        align === "end" ? "nf-numeric text-end" : "text-start",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </td>
  );
}
