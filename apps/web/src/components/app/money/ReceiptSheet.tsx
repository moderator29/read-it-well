import type { ReactNode } from "react";
import { DocFigure, DocHead, DocNote, DocPerforation, DocRow, DocRows, DocState, DocumentSheet } from "./DocumentSheet";
import type { ReceiptModel } from "./receipt-model";

/**
 * A RECEIPT ON THE DOCUMENT SHEET, FROM THE ONE RECEIPT MODEL (reference
 * 7082, D28.1, north star 16.5).
 *
 * Draws a `ReceiptModel` and nothing else, in the model's order: the quiet
 * kind, the title and the place, the label and the hero figure, the tear
 * line, the facts, the itemised lines and the total under its rule, then the
 * confirmations the record holds, the reference when there is one, and the
 * rail in Session 2's sentence. The receipt email (`lib/email/receipt.ts`)
 * draws the same model in the same order, which is what "a receipt email
 * matches the on-screen receipt exactly" means in code.
 *
 * The figure does not count up and nothing on the paper animates except the
 * sheet's own unroll: a receipt states money that has already moved
 * (MOTION_SYSTEM "money, where motion must never mislead").
 *
 * Server-safe and presentational. `actions` goes under the sheet, in the
 * member's theme (`DocActions`), never on the paper.
 */
export function ReceiptSheet({
  receipt,
  headingId,
  actions,
  testId = "receipt-sheet",
}: {
  receipt: ReceiptModel;
  headingId: string;
  actions?: ReactNode;
  testId?: string;
}) {
  return (
    <>
      <DocumentSheet kind="receipt" printable as="section" aria-labelledby={headingId} data-testid={testId}>
        <DocHead label={receipt.kind} title={receipt.title} id={headingId}>
          {receipt.place ? <p className="nf-doc__label">{receipt.place}</p> : null}
        </DocHead>
        <div className="nf-doc__hero">
          <p className="nf-doc__label">{receipt.figureLabel}</p>
          <DocFigure testId={`${testId}-figure`}>{receipt.figure}</DocFigure>
        </div>
        <DocPerforation />
        <DocRows testId={`${testId}-lines`}>
          {receipt.facts.map((row) => (
            <DocRow key={`fact-${row.label}`} label={row.label}>
              {row.value}
            </DocRow>
          ))}
          {receipt.lines.map((row) => (
            <DocRow key={`line-${row.label}`} label={row.label} numeric>
              {row.value}
            </DocRow>
          ))}
          <DocRow label={receipt.total.label} variant="total" numeric>
            {receipt.total.value}
          </DocRow>
        </DocRows>
        {receipt.confirmations.length > 0 || receipt.reference ? (
          <DocRows testId={`${testId}-confirmations`} className="nf-doc__rows--confirm">
            {receipt.confirmations.map((row) => (
              <DocRow key={`confirm-${row.label}`} label={row.label}>
                <DocState done>{row.state}</DocState>
              </DocRow>
            ))}
            {receipt.reference ? (
              <DocRow label={receipt.reference.label} numeric>
                <span className="nf-doc__ref">{receipt.reference.value}</span>
              </DocRow>
            ) : null}
          </DocRows>
        ) : null}
        <DocNote>{receipt.note}</DocNote>
      </DocumentSheet>
      {actions}
    </>
  );
}
