import type { ReactNode } from "react";
/* Route sheets, imported where they are drawn (the C12 pattern map.css set):
   the sheet itself, and the print rules that print it and nothing else. */
import "@/app/css/document.css";
import "@/app/css/print.css";
import {
  DOC_PRINT_ATTR,
  documentRowClass,
  documentSheetClass,
  documentStateClass,
  type DocumentKind,
} from "./document-sheet";

/**
 * THE DOCUMENT SHEET (D28.1): a receipt, an agreement's terms or a statement,
 * drawn as a light sheet of paper on whatever theme the member chose.
 *
 * The page around it stays in the member's theme: the header, the dock, the
 * controls and the action tiles under the sheet are all ordinary night (or
 * Light) surfaces. Only the document is paper, because only the document is
 * a thing somebody screenshots, prints and hands to a bank, a landlord or a
 * lawyer.
 *
 * Presentational and server-safe. It decides nothing about the money: every
 * figure, reference and state it shows is handed in by a page that read it.
 * It never draws a barcode, a hash, an id or a confirmation the caller did
 * not pass, and it has no defaults that could put one on the paper.
 *
 * `printable` marks the one sheet on a page that prints (print.css). Leave it
 * off a second sheet on the same page.
 */
export function DocumentSheet({
  kind = "document",
  printable = false,
  as: Tag = "article",
  className,
  children,
  "aria-labelledby": labelledBy,
  "aria-label": label,
  "data-testid": testId,
}: {
  kind?: DocumentKind;
  printable?: boolean;
  as?: "article" | "section" | "div";
  className?: string;
  children: ReactNode;
  "aria-labelledby"?: string;
  "aria-label"?: string;
  "data-testid"?: string;
}) {
  const printAttr = printable ? { [DOC_PRINT_ATTR]: "" } : {};
  return (
    <Tag
      className={documentSheetClass(kind, className)}
      aria-labelledby={labelledBy}
      aria-label={label}
      data-testid={testId}
      data-doc-kind={kind}
      {...printAttr}
    >
      {children}
    </Tag>
  );
}

/** The sheet's heading block: a quiet label above, the title under it. */
export function DocHead({ label, title, id, children }: { label?: ReactNode; title?: ReactNode; id?: string; children?: ReactNode }) {
  return (
    <header className="nf-doc__head">
      {label ? <p className="nf-doc__label">{label}</p> : null}
      {title ? (
        <h2 id={id} className="nf-doc__title">
          {title}
        </h2>
      ) : null}
      {children}
    </header>
  );
}

/**
 * The one figure on the sheet, already formatted by the caller through the
 * money helpers. It never counts or rolls: a document states money that has
 * already been decided, and motion on it would imply movement.
 */
export function DocFigure({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <p className="nf-doc__figure nf-numeric" data-testid={testId}>
      {children}
    </p>
  );
}

/** The key-value list. Rows go inside, in reading order. */
export function DocRows({ children, testId, className }: { children: ReactNode; testId?: string; className?: string }) {
  return (
    <dl className={["nf-doc__rows", className ?? ""].filter(Boolean).join(" ")} data-testid={testId}>
      {children}
    </dl>
  );
}

/** One line of the document: a label and its value, a sentence, or the total. */
export function DocRow({
  label,
  children,
  variant = "value",
  numeric = false,
}: {
  label: ReactNode;
  children: ReactNode;
  variant?: "value" | "prose" | "total";
  /** Tabular, for a figure, a date or a reference. */
  numeric?: boolean;
}) {
  return (
    <div className={documentRowClass(variant)}>
      <dt>{label}</dt>
      <dd className={numeric ? "nf-numeric" : undefined}>{children}</dd>
    </div>
  );
}

/**
 * A state said in words with a shape beside it: the filled circle for done,
 * the hollow one for waiting. Pass the words the record supports; the
 * component never supplies "Confirmed" on its own.
 */
export function DocState({ done, children }: { done: boolean; children: ReactNode }) {
  return (
    <span className={documentStateClass(done)}>
      <span className="nf-doc__mark" aria-hidden="true" />
      <span>{children}</span>
    </span>
  );
}

/** A titled group inside the sheet (the payments under a total, say). */
export function DocSection({ title, children, id }: { title: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section className="nf-doc__section" aria-labelledby={id}>
      <h3 id={id} className="nf-doc__section-title">
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * The tear line between a receipt's heading and its ledger, with a notch at
 * each edge (the founder's printer source). Decoration only, so hidden from
 * assistive technology, and dropped from print.
 */
export function DocPerforation() {
  return <div className="nf-doc__perf" aria-hidden="true" />;
}

/** The quiet footnote at the foot of a sheet. */
export function DocNote({ children }: { children: ReactNode }) {
  return <p className="nf-doc__note">{children}</p>;
}

/**
 * The row of actions under a sheet (reference 7074: PDF, Share, Dispute), in
 * the member's theme rather than on the paper. Pass `ActionTile`s, and only
 * for actions that exist: a tile with nowhere to go is worse than no tile.
 */
export function DocActions({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="nf-doc-actions" role="group" aria-label={label}>
      {children}
    </div>
  );
}
