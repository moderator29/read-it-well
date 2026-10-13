"use client";

import { Amount } from "@/components/ui/Amount";
import { ActionTile } from "@/components/ui/ActionTile";
import {
  DocActions,
  DocFigure,
  DocHead,
  DocNote,
  DocPerforation,
  DocRow,
  DocRows,
  DocSection,
  DocState,
  DocumentSheet,
} from "@/components/app/money/DocumentSheet";
import { toast } from "@/lib/ui/toast";
import { Section, SystemFrame } from "../_system/SystemFrame";

/**
 * THE DOCUMENT SHEET, BOTH KINDS (D28.1).
 *
 * A receipt, an agreement's terms or a statement is drawn as a sheet of paper on
 * the member's theme: the page around it stays Night (or Light), only the
 * document is paper, because only the document is a thing somebody screenshots,
 * prints and hands to a bank or a landlord. The tokens are `--nf-doc-*`, the
 * same in both themes; switch the Theme above to see paper on a dark desk and
 * paper on paper.
 *
 *   document  Card radius, solid rules: terms, a statement
 *   receipt   money that has already moved: serrated tear top and bottom,
 *             square corners, dashed ledger rules, a perforation
 *
 * THE FIGURE IS ZERO. The sheet states money that has already been decided and
 * has no defaults, so this board has to hand it something; zero through the
 * product's own `Amount` is the one figure that cannot be mistaken for a real
 * balance. Every label is a slot name, every state a structural word, and there
 * is no reference, barcode, hash or confirmation anywhere, because a sheet never
 * draws one the caller did not read from a record.
 */

function Rows() {
  return (
    <DocRows>
      <DocRow label="Row label">Row value</DocRow>
      <DocRow label="Numeric row" numeric>
        <Amount minorUnits={0} showFraction />
      </DocRow>
      <DocRow label="Prose row" variant="prose">
        A sentence row, for a term or a condition that is not a key and a value.
      </DocRow>
      <DocRow label="Total row" variant="total" numeric>
        <Amount minorUnits={0} showFraction />
      </DocRow>
    </DocRows>
  );
}

export function DocumentSheetBoard() {
  return (
    <SystemFrame
      slug="document-sheet"
      title="Document sheet"
      lede="Paper as a sheet on the member's desk. Two kinds: document and receipt. The sheet states what a record says and decides nothing."
    >
      <Section title="Kind: document" note="Card radius, solid rules. One figure, rows, a titled section, a state in words with a shape, and a footnote.">
        <div className="nf-sg-desk">
          <DocumentSheet kind="document" aria-labelledby="sg-doc-title">
            <DocHead label="Document label" title="Document title" id="sg-doc-title" />
            <DocFigure>
              <Amount minorUnits={0} showFraction />
            </DocFigure>
            <Rows />
            <DocSection title="Section title" id="sg-doc-section">
              <DocRows>
                <DocRow label="Row label">
                  <DocState done>Done state</DocState>
                </DocRow>
                <DocRow label="Row label">
                  <DocState done={false}>Waiting state</DocState>
                </DocRow>
              </DocRows>
            </DocSection>
            <DocNote>A footnote slot.</DocNote>
          </DocumentSheet>
          <DocActions label="Document actions">
            <ActionTile icon="document" label="Action one" onClick={() => toast("Action slot")} />
            <ActionTile icon="share" label="Action two" onClick={() => toast("Action slot")} />
          </DocActions>
        </div>
      </Section>

      <Section title="Kind: receipt" note="The serrated tear, the perforation between the heading and the ledger, square corners and dashed rules. Money that has already moved, never money that is about to.">
        <div className="nf-sg-desk">
          <DocumentSheet kind="receipt" aria-labelledby="sg-rcpt-title">
            <DocHead label="Receipt label" title="Receipt title" id="sg-rcpt-title" />
            <DocPerforation />
            <DocFigure>
              <Amount minorUnits={0} showFraction />
            </DocFigure>
            <Rows />
            <DocNote>A footnote slot.</DocNote>
          </DocumentSheet>
        </div>
      </Section>

      <Section title="Night subtree" note="The same two sheets inside a data-theme dark region, so on Light the dark desk is visible beside the Paper one above.">
        <div data-theme="dark" className="nf-sg-desk">
          <div className="nf-sg-grid nf-sg-grid--wide">
            <DocumentSheet kind="document" aria-label="Document on a night desk">
              <DocHead label="Document label" title="Document title" />
              <Rows />
            </DocumentSheet>
            <DocumentSheet kind="receipt" aria-label="Receipt on a night desk">
              <DocHead label="Receipt label" title="Receipt title" />
              <DocPerforation />
              <Rows />
            </DocumentSheet>
          </div>
        </div>
      </Section>
    </SystemFrame>
  );
}
