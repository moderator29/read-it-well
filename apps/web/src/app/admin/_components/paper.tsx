import type { ReactNode } from "react";
import "@/app/css/document.css";
import "./admin-material.css";

/**
 * THE MONEY DESKS' PAPER PIECES (D28.1: Paper is a treatment for the document,
 * never a screen register).
 *
 * The console stays in the operator's theme. What is a RECORD on a money desk
 * (a reserve statement, a refund record, a payments ledger) is drawn on a light
 * document sheet (`DocumentSheet`, one definition for receipts, statements and
 * agreements) the way a printed statement lies on a desk. What is a CONTROL
 * (a ruling, a decline, a slide to approve) is never on the paper: it sits
 * beside or under it, in the theme's own chrome, because a form field styled
 * for a dark well is wrong on white, and because a control on a record blurs
 * which of the two a person is looking at.
 *
 * These are the two things the sheet did not already have: a status said as a
 * word and a shape that includes FAILED (the sheet's `DocState` deliberately
 * has no third look, since a receipt only ever states what happened; a ledger
 * has to say a refund did not reach the card), and a responsive ledger row
 * that is a card on a phone and a line on a desk.
 *
 * Presentational and server-safe. They decide nothing: every word, figure and
 * state is passed by the desk that read it.
 */
export type PaperState = "done" | "waiting" | "failed" | "neutral";

/** A state in words with a shape: filled circle done, hollow circle waiting,
    filled square failed, a bar for no state. Never colour alone. */
export function PaperStatus({ state, children }: { state: PaperState; children: ReactNode }) {
  return (
    <span className={`nf-paper-status nf-paper-status--${state}`}>
      <span className="nf-paper-status__mark" aria-hidden="true" />
      <span>{children}</span>
    </span>
  );
}

/** A ledger: a list of dated, itemised lines on the sheet. */
export function PaperLedger({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul className="nf-paper-ledger" aria-label={label}>
      {children}
    </ul>
  );
}

/**
 * One line of the ledger. On a phone it is a small card: what it was and the
 * figure on the first line, when it happened and its state on the second. From
 * 768 it is a single line of four columns. Tabular figures throughout.
 */
export function PaperLedgerRow({
  when,
  title,
  sub,
  amount,
  status,
}: {
  when: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  amount: ReactNode;
  /** Optional: a record with no state of its own (a refund already decided) draws none. */
  status?: ReactNode;
}) {
  return (
    <li className="nf-paper-ledger__row">
      <span className="nf-paper-ledger__main">
        <span className="nf-paper-ledger__title">{title}</span>
        {sub ? <span className="nf-paper-ledger__sub">{sub}</span> : null}
      </span>
      <span className="nf-paper-ledger__amount nf-numeric">{amount}</span>
      <span className="nf-paper-ledger__when nf-numeric">{when}</span>
      {status ? <span className="nf-paper-ledger__status">{status}</span> : null}
    </li>
  );
}
