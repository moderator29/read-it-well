import { Amount } from "@/components/ui/Amount";
import { ShareCardFrame } from "@/components/share/ShareCardFrame";
import { CONFIDENCE_FILL } from "@/lib/ui/meter";
import { EmptyState } from "@/components/app/Screen";
import { TYPE } from "@/components/app/Screen";
import type { Locale } from "@vallo/i18n/core";
import { COMPARABLES_LEAD, PRICE_CHECK_DISCLAIMER } from "@/lib/price-check/disclaimer";
import type { PriceCheckResult } from "@/lib/price-check/gate";
import { REFUSALS, type RefusalCode } from "@/lib/price-check/refusals";
import type { Comparable } from "@/lib/price-check/types";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { IconPlate } from "@/components/ui/IconPlate";

/**
 * THE RESULT SURFACE: a figure, or a refusal, and never both.
 *
 * ---------------------------------------------------------------------------
 * THE ORDER IS THE RULING AND IT IS NOT A LAYOUT PREFERENCE.
 *
 *   1  the subject line, plain text, no card
 *   2  the figure OR the refusal
 *   3  the basis line, small, muted, ALWAYS PRESENT, never behind a tap
 *   4  the confidence row
 *   5  the standing disclaimer, in full, on the surface
 *   6  what it is based on: the comparables
 *   7  what to do next
 *
 * THE MIDPOINT IS NOT RENDERED LARGER THAN THE BOUNDS. A range whose middle is
 * emphasised is a point estimate with decoration, which is precisely the thing
 * this feature exists to refuse to build. All three numbers are set at one
 * size and the word between them is muted.
 *
 * ---------------------------------------------------------------------------
 * ON A REFUSAL THERE IS NO FIGURE ANYWHERE ON THE SCREEN.
 *
 * Not greyed out, not struck through, not "we estimate around X but". The
 * discriminated union makes that structural rather than disciplined: the
 * refused branch of `PriceCheckResult` has no `midMinor` to render.
 */

export type ResultCopy = {
  askingRange: string;
  perYear: string;
  perProperty: string;
  perSqm: string;
  basis: string;
  confidence: string;
  confidenceLow: string;
  confidenceMedium: string;
  confidenceHigh: string;
  confidenceExplain: string;
  confidenceBody: string;
  sizedShortfall: string;
  comparablesHeading: string;
  distanceAway: string;
  listedAgo: string;
  listedRecently: string;
  spreadHeading: string;
};

export type RefusalCopy = Record<RefusalCode, { title: string; body: string }>;

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );
}

/** "quite", "fairly", "not very". Never a percentage: that would be invented. */
function confidenceWord(band: "low" | "medium" | "high", copy: ResultCopy): string {
  if (band === "high") return copy.confidenceHigh;
  if (band === "medium") return copy.confidenceMedium;
  return copy.confidenceLow;
}

export function AnsweredResult({
  result,
  locale,
  copy,
  intent,
}: {
  result: Extract<PriceCheckResult, { kind: "answered" }>;
  locale: Locale;
  copy: ResultCopy;
  intent: "rent" | "sale";
}) {
  const months = Math.max(1, Math.round(result.medianAgeDays / 30));

  /*
   * THE SHARE CARD FRAME (spec section 10, reference 33). The range is the
   * figure, low and high at one size (see the header). The meter pictures the
   * confidence BAND the database computed as three, six or nine bars, always
   * in the one blue (the band is not good or bad news, so it is never green,
   * amber and red), and its word is the band's own word: no percentage is
   * printed because none was computed. The basis sentence is the first
   * checklist line, always present, never behind a tap.
   */
  const basis = fill(copy.basis, {
    count: result.comparableCount,
    radius: result.radiusM,
    months,
  });

  return (
    <div>
      <ShareCardFrame
        testId="price-check-card"
        align="center"
        title={copy.askingRange}
        figureSize="lg"
        figure={
          <span className="nf-pc-range">
            <Amount minorUnits={result.lowMinor} locale={locale} glance />
            <span className="nf-pc-range__join">to</span>
            <Amount minorUnits={result.highMinor} locale={locale} glance />
          </span>
        }
        figureUnit={intent === "rent" ? copy.perYear : copy.perProperty}
        meter={{
          filled: CONFIDENCE_FILL[result.confidence],
          word: `${copy.confidence}: ${confidenceWord(result.confidence, copy)}`,
          level: "high",
        }}
        checks={[
          { tone: "success", label: basis },
          ...(result.sizedShortfall ? [{ tone: "warning" as const, label: copy.sizedShortfall }] : []),
        ]}
        honest={copy.confidenceBody}
      />

      <Disclaimer />
    </div>
  );
}

/**
 * The standing disclaimer, in full, on the surface.
 *
 * NOT behind a `Disclosure`, and the first sentence is never truncated. A
 * thing a person needs in order to decide whether to act stays on the page.
 * The wording is one constant on every surface, because a disclaimer
 * paraphrased per screen is four disclaimers and three of them have not been
 * read by anybody.
 */
export function Disclaimer() {
  return (
    <div className="nf-pc-disclaimer nf-body-sm">
      <p>
        <span className="nf-pc-disclaimer__lead">{PRICE_CHECK_DISCLAIMER.lead}</span>{" "}
        {PRICE_CHECK_DISCLAIMER.body.join(" ")}
      </p>
      <p className="mt-inline">{PRICE_CHECK_DISCLAIMER.handOff}</p>
    </div>
  );
}

export function RefusalPanel({
  result,
  refusalCopy,
  actions,
}: {
  result: Extract<PriceCheckResult, { kind: "refused" }>;
  refusalCopy: RefusalCopy;
  /** The next actions, already built by the screen that knows where they go. */
  actions?: React.ReactNode;
}) {
  const spec = REFUSALS[result.code];
  const words = refusalCopy[result.code];

  return (
    <EmptyState
      icon={spec.icon}
      title={fill(words.title, { count: result.comparableCount })}
      body={fill(words.body, { count: result.comparableCount, radius: result.radiusM })}
      action={actions}
      data-testid={`nf-pc-refusal-${result.code}`}
    />
  );
}

/**
 * The `wide_dispersion` drawing: one tick per comparable on a price axis, no
 * figure anywhere.
 *
 * The reader SEES the disagreement instead of being told about it, which is
 * the only honest way to render a market that does not agree with itself. Five
 * listings asking N1.8m, N2.2m, N3.5m, N6m and N9m produce five ticks that
 * obviously disagree; a fixed plus-or-minus-fifteen-per-cent band would have
 * printed N3.0m to N4.0m over that same set, which is a lie told with a
 * straight face.
 */
export function StripPlot({
  comparables,
  locale,
  heading,
}: {
  comparables: Comparable[];
  locale: Locale;
  heading: string;
}) {
  const prices = comparables.map((c) => c.priceMinor).filter((p) => p > 0);
  if (prices.length === 0) return null;

  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const span = high - low || 1;

  return (
    <div>
      <p className={TYPE.label}>{heading}</p>
      <div className="nf-pc-strip" role="img" aria-label={heading}>
        <div className="nf-pc-strip__axis" />
        {prices.map((price, index) => (
          <span
            key={`${price}-${index}`}
            className="nf-pc-strip__tick"
            /* The only inline style on this surface, and it is a POSITION
               computed from data rather than a colour or a spacing value: a
               per-tick class would be a stylesheet with one rule per price. */
            style={{ left: `calc(var(--nf-space-sm) + ${((price - low) / span) * 100}% - 0.25rem)` }}
          />
        ))}
        <span className="nf-pc-strip__end nf-pc-strip__end--low">
          <Amount minorUnits={low} locale={locale} compact />
        </span>
        <span className="nf-pc-strip__end nf-pc-strip__end--high">
          <Amount minorUnits={high} locale={locale} compact />
        </span>
      </div>
    </div>
  );
}

/**
 * The comparables, shown in full.
 *
 * This is the single most trust-building element in the feature and it is the
 * one thing competitors cannot copy without revealing that they have nothing.
 * The line above it is the most valuable copy in the product: it is true, it
 * explains the limitation, and it tells the reader something about their own
 * country that they will repeat.
 */
export function ComparablesRail({
  comparables,
  locale,
  copy,
}: {
  comparables: Comparable[];
  locale: Locale;
  copy: ResultCopy;
}) {
  if (comparables.length === 0) return null;

  return (
    <div>
      <p className={TYPE.sectionTitle}>{copy.comparablesHeading}</p>
      <p className="mt-inline nf-body-sm text-[var(--nf-content-secondary)]">{COMPARABLES_LEAD}</p>

      <div className="nf-pc-rail mt-block">
        {comparables.map((comparable) => {
          const months = Math.round(comparable.ageDays / 30);
          return (
            <article key={comparable.id} className="nf-panel nf-panel--card p-card-sm">
              <p className="nf-body-sm font-semibold text-[var(--nf-content-primary)]">
                <Amount minorUnits={comparable.priceMinor} locale={locale} glance />
              </p>
              <p className="mt-inline-tight nf-caption text-[var(--nf-content-muted)]">
                {comparable.bedrooms > 0 ? `${comparable.bedrooms} bed` : null}
                {comparable.sizeSqm !== null ? ` · ${comparable.sizeSqm} sqm` : null}
              </p>
              <p className="mt-inline-tight nf-caption text-[var(--nf-content-muted)]">
                {fill(copy.distanceAway, { metres: Math.round(comparable.distanceM) })}
                {" · "}
                {months < 1
                  ? copy.listedRecently
                  : fill(copy.listedAgo, { months })}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}

/** The mark beside a heading, kept here so the screen files stay about layout. */
export function PriceCheckMark() {
  return (
    <IconPlate size="md" tone="brand">
      <UiIcon name="coins" size={20} />
    </IconPlate>
  );
}
