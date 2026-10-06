import "./promotion.css";
import { formatNumber, type Dictionary, type Locale } from "@vallo/i18n/core";
import type { PromotionMetricRow } from "@/lib/promotion/measurement";

/**
 * A LISTER'S PROMOTION RESULTS: the figures, each a recorded count or the
 * words "No data" (`VALLO_PROMOTION.md` statement 6). A null is never drawn
 * as a zero, and nothing here projects, averages or compares unless Session
 * 2's read says the comparison is valid; until it exists the screen says
 * when a comparison will be shown instead of showing one.
 */
export function PromotionResults({
  rows,
  notLive,
  copy,
  locale,
}: {
  rows: readonly PromotionMetricRow[];
  /** True while Session 2's read does not exist: the not-live notice leads. */
  notLive: boolean;
  copy: Dictionary["experienceFeatures"]["promotion"];
  locale: Locale;
}) {
  const p = copy;
  return (
    <div className="nf-promo-results" data-testid="promotion-results">
      {notLive ? (
        <div className="nf-promo-results__notice" role="status" data-testid="promotion-not-live">
          <h2 className="nf-promo-results__notice-title">{p.measure.notLiveTitle}</h2>
          <p className="nf-promo-results__notice-body">{p.measure.notLiveBody}</p>
        </div>
      ) : null}

      <section aria-labelledby="promo-figures">
        <h2 id="promo-figures" className="nf-section-label">
          {p.measure.metricsTitle}
        </h2>
        <dl className="nf-promo-results__rows">
          {rows.map(({ metric, value }) => (
            <div key={metric} className="nf-promo-results__row" data-metric={metric} data-no-data={value === null ? "" : undefined}>
              <dt className="nf-promo-results__name">{p.metrics[metric]}</dt>
              <dd className="nf-promo-results__value">
                {value === null ? p.noData : formatNumber(value, locale)}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="nf-promo-results__note">{p.measure.comparison}</p>
    </div>
  );
}
