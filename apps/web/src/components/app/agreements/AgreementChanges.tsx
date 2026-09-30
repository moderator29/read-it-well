import type { Dictionary } from "@vallo/i18n/core";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * B9: "WHAT CHANGED SINCE YOU CONFIRMED". A tinted card at the top of an
 * agreement whose version moved after this party confirmed. Each changed
 * line prints the old value struck through and the new one beside it, in the
 * page's own order and labels, then who changed it and when. Server-safe: no
 * state, the values arrive already worded.
 *
 * The old value is also said in words for a screen reader ("Was ... Now"),
 * because a strike-through is not announced.
 */
export type WordedChange = { key: string; label: string; before: string; after: string };

export function AgreementChanges({
  changes,
  byLine,
  versionsLine,
  copy,
}: {
  changes: WordedChange[];
  byLine: string;
  versionsLine: string;
  copy: Dictionary["memberKit"]["agreementDiff"];
}) {
  return (
    <section className="nf-terms-diff" aria-labelledby="terms-diff-title" data-testid="agreement-changes">
      <h2 id="terms-diff-title" className="nf-terms-diff__title">
        <UiIcon name="file-search" size={18} className="nf-terms-diff__icon" />
        {copy.title}
      </h2>
      <p className="nf-terms-diff__meta">
        {byLine} {versionsLine}
      </p>
      {changes.length === 0 ? (
        <p className="nf-terms-diff__meta">{copy.noVisible}</p>
      ) : (
        <ul className="nf-terms-diff__rows">
          {changes.map((c) => (
            <li key={c.key} className="nf-terms-diff__row" data-testid={`agreement-change-${c.key}`}>
              <span className="nf-terms-diff__label">{c.label}</span>
              <span className="nf-terms-diff__values">
                <span className="sr-only">{copy.was} </span>
                {c.before === copy.notStated ? (
                  <span className="nf-terms-diff__old">{c.before}</span>
                ) : (
                  <s className="nf-terms-diff__old nf-numeric">{c.before}</s>
                )}
                <UiIcon name="arrow-right" size={14} className="nf-terms-diff__arrow" />
                <span className="sr-only"> {copy.now} </span>
                <strong className="nf-terms-diff__new nf-numeric">{c.after}</strong>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
