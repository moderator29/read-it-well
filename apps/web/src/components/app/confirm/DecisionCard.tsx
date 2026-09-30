import "@/app/css/decision-card.css";
import type { ReactNode } from "react";

/**
 * THE DECISION CARD, "AWAITING YOU" (spec section 14, reference 36; plan
 * items 21 and 22). The one place a warm tint appears: the warning hue's own
 * surface, no border, the card radius. A section label with how long it has
 * waited, the title of the decision, the quoted request in a white well when
 * there is one, itemised lines (label left, amount right, tabular), a
 * hairline, the total, then ONE full-width primary and up to two secondaries
 * side by side.
 *
 * It draws only; it decides nothing and holds no action of its own. Every
 * control it shows is the page's existing control handed in (the agreement's
 * ConfirmTerms and CancelAgreement, a host's Accept and Decline), so a card
 * can never do something the record's own page could not. It is drawn only
 * where a real pending decision exists for the viewer; the page decides.
 * Server-safe.
 */
export type DecisionLine = { label: ReactNode; amount: ReactNode };

export function DecisionCard({
  label,
  when,
  title,
  sub,
  quote,
  lines = [],
  total,
  primary,
  secondary = [],
  className,
  testId,
}: {
  /** The section label, e.g. "Awaiting you". */
  label: ReactNode;
  /** How long it has waited, already worded ("2 h", "Since 1 Sep"). */
  when?: ReactNode;
  title: ReactNode;
  /** One muted line under the title (what happens if nobody decides). */
  sub?: ReactNode;
  /** The other side's own words, when the record holds them. */
  quote?: ReactNode;
  lines?: readonly DecisionLine[];
  total?: DecisionLine;
  /** The one primary, drawn full width. */
  primary: ReactNode;
  /** Up to two secondaries, side by side. */
  secondary?: readonly ReactNode[];
  className?: string;
  testId?: string;
}) {
  return (
    <section className={["nf-decision", className ?? ""].filter(Boolean).join(" ")} data-testid={testId}>
      <div className="nf-decision__head">
        <p className="nf-section-label nf-decision__label">{label}</p>
        {when != null ? <p className="nf-decision__when">{when}</p> : null}
      </div>
      <div>
        <h2 className="nf-decision__title">{title}</h2>
        {sub != null ? <p className="nf-decision__sub">{sub}</p> : null}
      </div>
      {quote != null ? <blockquote className="nf-decision__quote">{quote}</blockquote> : null}
      {lines.length > 0 || total ? (
        <dl className="nf-decision__lines">
          {lines.map((line, index) => (
            <div key={index} className="nf-decision__line">
              <dt>{line.label}</dt>
              <dd className="nf-numeric">{line.amount}</dd>
            </div>
          ))}
          {total ? (
            <div className="nf-decision__line nf-decision__total">
              <dt>{total.label}</dt>
              <dd className="nf-numeric">{total.amount}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      <div className="nf-decision__primary">{primary}</div>
      {secondary.length > 0 ? (
        <div className="nf-decision__secondary" data-count={secondary.length}>
          {secondary.map((node, index) => (
            <div key={index}>{node}</div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
