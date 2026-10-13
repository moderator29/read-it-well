import type { Locale } from "@vallo/i18n/core";
import { Amount } from "@/components/ui/Amount";
import {
  AVAILABLE_LABEL,
  AVAILABLE_WORD,
  MONEY_CENTRE_ABSENT_BODY,
  MONEY_CENTRE_ABSENT_TITLE,
  MONEY_CENTRE_TITLE,
  PROTECTED_LABEL,
  PROTECTED_WORD,
  balanceAsOf,
  heldBySentence,
} from "@/lib/money/copy";
import { formatMoneyDate } from "@/lib/money/dates";
import type { Balances } from "@/lib/money/vallo";
import "@/app/css/money-layer.css";

/**
 * THE MONEY CENTRE: AVAILABLE AND PROTECTED, AS TWO VISIBLY DIFFERENT NUMBERS
 * (D50; FL section 4.3).
 *
 * The wrong read costs somebody money, so the two never look alike: Available
 * sits on a solid success edge, Protected on a dashed info edge with a quieter
 * figure, and each carries a sentence saying what it is. Never colour alone.
 * Above both, who holds them, by name, and when the partner said so.
 *
 * Absent (the protected rail is not live, or the partner read is missing), it
 * says there is no balance and why, and draws no figure at all: a zero here
 * would be a balance Vallo invented. Server-safe; no figure counts or rolls.
 */
export function MoneyCentre({ balances, locale, id = "nf-money-centre" }: { balances: Balances | null; locale: Locale; id?: string }) {
  /* A balance without the partner's time is not shown (lib/money/vallo.ts). */
  const when = balances ? formatMoneyDate(balances.asOf, locale, { withTime: true }) : null;
  if (!balances || !when) {
    return (
      <section className="nf-panel nf-panel--card" aria-labelledby={id} data-testid="money-centre" data-state="absent">
        <h2 id={id} className="nf-body font-semibold text-[var(--nf-content-primary)]">
          {MONEY_CENTRE_ABSENT_TITLE}
        </h2>
        <p className="nf-body-sm mt-inline text-[var(--nf-content-secondary)]">{MONEY_CENTRE_ABSENT_BODY}</p>
      </section>
    );
  }
  return (
    <section aria-labelledby={id} data-testid="money-centre" data-state="ready">
      <h2 id={id} className="nf-overline text-[var(--nf-content-muted)]">
        {MONEY_CENTRE_TITLE}
      </h2>
      <div className="nf-pots mt-row">
        <div className="nf-pot nf-pot--available" data-testid="pot-available">
          <p className="nf-body-sm font-semibold text-[var(--nf-content-primary)]">{AVAILABLE_LABEL}</p>
          <p className="nf-pot__figure">
            <Amount minorUnits={balances.availableMinor} locale={locale} currency={balances.currency} showFraction />
          </p>
          <p className="nf-pot__word nf-body-sm">{AVAILABLE_WORD}</p>
        </div>
        <div className="nf-pot nf-pot--protected" data-testid="pot-protected">
          <p className="nf-body-sm font-semibold text-[var(--nf-content-primary)]">{PROTECTED_LABEL}</p>
          <p className="nf-pot__figure">
            <Amount minorUnits={balances.protectedMinor} locale={locale} currency={balances.currency} showFraction />
          </p>
          <p className="nf-pot__word nf-body-sm">{PROTECTED_WORD}</p>
        </div>
      </div>
      <p className="nf-caption mt-row text-[var(--nf-content-muted)]">
        {heldBySentence(balances.heldBy)} {balanceAsOf(balances.heldBy, when)}
      </p>
    </section>
  );
}
