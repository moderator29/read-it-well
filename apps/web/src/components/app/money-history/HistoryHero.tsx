import { intlTag, type Locale } from "@vallo/i18n/core";
import { CountedText, HeroFigure } from "@/components/ui/HeroFigure";
import { Amount } from "@/components/ui/Amount";
import { HeroBand } from "@/components/ui/HeroBand";
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
  /* The figure's width in ems: the kobo at six tenths of the size
     (`.nf-history-kobo--hero`). Measured in Chromium at 0.83 to 0.86 em per
     character (₦450,000.00 is 319px at 39px), so 0.88 leaves a hairline. */
  const ems = (whole.length + 0.6 * kobo.length) * 0.88;
  return (
    /* The headline money figure sits on the hero band (the founder's widened
       Q2): the navy block in light, a raised night surface at night, white
       type. Same figure, same note, same facts as before. */
    /* SECTION 17 (refs 44 and 45): the figure is centred, the label a muted
       caption above it, the note a quiet line under it, and the naira count
       up once (never under reduced motion, Calm or Off). */
    <HeroBand as="section" aria-labelledby={id} data-testid="history-total" className="nf-history-hero--centred">
      <HeroFigure id={id} caption={label} sub={note} size={long ? "md" : "lg"} ems={ems}>
        {totalMinor >= 0 ? (
          <CountedText text={whole} value={Math.floor(totalMinor / 100)} tag={intlTag[locale] ?? "en-NG"} />
        ) : (
          whole
        )}
        <span className="nf-history-kobo nf-history-kobo--hero">{kobo}</span>
      </HeroFigure>
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
    </HeroBand>
  );
}
