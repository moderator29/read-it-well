import type { Locale } from "@vallo/i18n/core";
import { Amount } from "@/components/ui/Amount";
import { formatKoboExact } from "@/components/app/money/money";

/**
 * The total at the top of a money history.
 *
 * Drawn the way the platform has always drawn its one hero figure: lit blue
 * glass, the naira at full size and the kobo at six tenths of it on the same
 * line, never wrapped. The split is `formatKoboExact`'s, which is integer
 * arithmetic throughout; this file never divides a kobo figure.
 *
 * WHAT THE FIGURE IS, said under it every time: a sum of payments that have
 * already moved. It is not an amount anybody is holding, and the sentence
 * under it (`HISTORY_NOT_A_BALANCE`, or the lister's settlement sentence)
 * says so in the words `lib/money/copy.ts` owns. The label is passed in, so
 * the payer's card says what they paid and the lister's says their share.
 *
 * `facts` are the smaller figures beside the total (refunded, reversed, what
 * renters paid), each positive and each named, so no reader has to work out
 * which way a minus sign points.
 */
export type HistoryFact = { label: string; minor: number };

export function HistoryHero({
  label,
  totalMinor,
  locale,
  note,
  facts = [],
  id,
}: {
  label: string;
  totalMinor: number;
  locale: Locale;
  note: string;
  facts?: HistoryFact[];
  id: string;
}) {
  const { whole, kobo } = formatKoboExact(totalMinor, locale);
  const long = whole.length + kobo.length > 12;
  return (
    <section aria-labelledby={id} className="nf-history-hero" data-testid="history-total">
      <p id={id} className="nf-history-hero__label">
        {label}
      </p>
      <p className={`nf-history-hero__figure nf-numeric ${long ? "nf-history-hero__figure--long" : ""}`}>
        {whole}
        <span className="nf-history-kobo nf-history-kobo--hero">{kobo}</span>
      </p>
      <p className="nf-history-hero__note">{note}</p>
      {facts.length > 0 && (
        <dl className="nf-history-hero__facts">
          {facts.map((fact) => (
            <div key={fact.label} className="nf-history-hero__fact">
              <dt>{fact.label}</dt>
              <dd>
                <Amount minorUnits={fact.minor} locale={locale} showFraction secondaryClassName="nf-history-kobo" />
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
