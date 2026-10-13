import "./promotion.css";
import { formatNumber, type Dictionary, type Locale } from "@vallo/i18n/core";
import type { MetricGap, PromotionMetricRow, SourceSplitRow } from "@/lib/promotion/measurement";

/**
 * A LISTING'S FIGURES: each a recorded count, or the words "No data" with the
 * reason beside them (`VALLO_PROMOTION.md` statement 6). A null is never drawn
 * as a zero. Nothing here projects, averages or estimates.
 *
 * THE SPLIT. Impressions and views by where they were served are drawn ONLY
 * from `split`, which `sourceSplit` fills from a recorded source dimension and
 * nothing else. Today no read records one, so `split` is null and the screen
 * says, in plain words, that the split is not recorded and these are totals:
 * no sentence claims a share for the promoted slot.
 */
const GAP_WORDS: Record<MetricGap, keyof Dictionary["experienceFeatures"]["promotion"]["gaps"]> = {
  notReadable: "notReadable",
  notKept: "notKept",
  readFailed: "readFailed",
};

export function PromotionResults({
  rows,
  split,
  notice,
  copy,
  locale,
}: {
  rows: readonly PromotionMetricRow[];
  /** From `sourceSplit`; null draws no split and says it is not recorded. */
  split: readonly SourceSplitRow[] | null;
  /** A lead notice, e.g. "No promotion has run on this listing". */
  notice?: { title: string; body: string } | null;
  copy: Dictionary["experienceFeatures"]["promotion"];
  locale: Locale;
}) {
  const p = copy;
  return (
    <div className="nf-promo-results" data-testid="promotion-results">
      {notice ? (
        <div className="nf-promo-results__notice" role="status" data-testid="promotion-notice">
          <h2 className="nf-promo-results__notice-title">{notice.title}</h2>
          <p className="nf-promo-results__notice-body">{notice.body}</p>
        </div>
      ) : null}

      <section aria-labelledby="promo-figures">
        <h2 id="promo-figures" className="nf-section-label">
          {p.measure.metricsTitle}
        </h2>
        <dl className="nf-promo-results__rows">
          {rows.map(({ metric, value, gap }) => (
            <div key={metric} className="nf-promo-results__row" data-metric={metric} data-no-data={value === null ? "" : undefined}>
              <dt className="nf-promo-results__name">{p.metrics[metric]}</dt>
              <dd className="nf-promo-results__value">
                {value === null ? p.noData : formatNumber(value, locale)}
              </dd>
              {value === null && gap ? (
                <dd className="nf-promo-results__gap" data-gap={gap}>
                  {p.gaps[GAP_WORDS[gap]]}
                </dd>
              ) : null}
            </div>
          ))}
        </dl>
      </section>

      {split ? (
        <section aria-labelledby="promo-split" data-testid="promotion-split">
          <h2 id="promo-split" className="nf-section-label">
            {p.measure.splitTitle}
          </h2>
          <dl className="nf-promo-results__rows">
            {split.flatMap((row) => [
              <div key={`${row.metric}-promoted`} className="nf-promo-results__row" data-metric={row.metric} data-source="promoted">
                <dt className="nf-promo-results__name">
                  {p.metrics[row.metric]}, {p.measure.splitPromoted.toLowerCase()}
                </dt>
                <dd className="nf-promo-results__value">{formatNumber(row.promoted, locale)}</dd>
              </div>,
              <div key={`${row.metric}-organic`} className="nf-promo-results__row" data-metric={row.metric} data-source="organic">
                <dt className="nf-promo-results__name">
                  {p.metrics[row.metric]}, {p.measure.splitOrganic.toLowerCase()}
                </dt>
                <dd className="nf-promo-results__value">{formatNumber(row.organic, locale)}</dd>
              </div>,
            ])}
          </dl>
        </section>
      ) : (
        <p className="nf-promo-results__note" data-testid="promotion-split-not-recorded">
          {p.measure.splitNotRecorded}
        </p>
      )}
    </div>
  );
}
