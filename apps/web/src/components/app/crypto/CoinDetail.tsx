"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { formatDate, type Dictionary, type Locale } from "@vallo/i18n";
import { ButtonLink } from "@/components/ui/Button";
import { Segmented, type SegmentedOption } from "@/components/ui/Segmented";
import { Skeleton } from "@/components/ui/Skeleton";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { TYPE } from "@/components/app/Screen";
import { fetchCoin, type CoinDetail as Coin, type CryptoResponse, type CryptoVs } from "./client";
import { chartValues, formatCompact, formatPercent, formatPrice, linePath, plainText } from "./format";
import { CoinImage } from "./CoinImage";
import { CryptoFailure } from "./CryptoStates";

type CryptoCopy = Dictionary["crypto"];
type Loaded = { state: "loading" } | CryptoResponse<Coin>;

const CHART_W = 320;
const CHART_H = 160;

const VS_OPTIONS: SegmentedOption<CryptoVs>[] = [
  { value: "ngn", label: "NGN" },
  { value: "usd", label: "USD" },
];

/**
 * One coin: the image, the name, the price and its 24h change as the
 * headline; a seven-day chart in the blue family; the facts a market page
 * states (cap, volume, high, low, 7d); the feed's description as text with
 * a disclosure. Display only, with the sentence that says so.
 *
 * The chart is one SVG path over a faint grid. Its line is brand blue
 * whatever the week did, because the sign lives in the percentage beside
 * the price; a rose chart would be the page shouting a fact it has already
 * stated quietly.
 */
export function CoinDetail({
  id,
  locale,
  copy,
  initial,
  live = true,
}: {
  id: string;
  locale: Locale;
  copy: CryptoCopy;
  initial?: CryptoResponse<Coin>;
  live?: boolean;
}) {
  const [vs, setVs] = useState<CryptoVs>("ngn");
  const [coin, setCoin] = useState<Loaded>(initial ?? { state: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const gradientId = useId();

  useEffect(() => {
    if (!live) return;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCoin({ state: "loading" });
    void fetchCoin(id, vs, controller.signal).then((result) => {
      if (!controller.signal.aborted) setCoin(result);
    });
    return () => controller.abort();
  }, [live, id, vs, attempt]);

  const values = useMemo(
    () => ("ok" in coin && coin.ok ? chartValues(coin.data.chart7d) : []),
    [coin],
  );
  const path = useMemo(() => linePath(values, CHART_W, CHART_H, 6), [values]);

  if (!("ok" in coin)) {
    return (
      <div role="status" aria-live="polite" aria-label={copy.loading} className="space-y-group">
        <div className="flex items-center gap-row">
          <Skeleton width="3.5rem" height="3.5rem" radius="pill" className="shrink-0" />
          <div className="min-w-0 flex-1">
            <Skeleton width="40%" height="1.25rem" radius="sm" />
            <Skeleton className="mt-inline-tight" width="20%" height="0.8125rem" radius="sm" />
          </div>
        </div>
        <Skeleton width="60%" height="2.5rem" radius="sm" />
        <Skeleton height="11rem" radius="xl" />
        <div className="nf-crypto-stats">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} height="4rem" radius="md" />
          ))}
        </div>
      </div>
    );
  }

  if (!coin.ok) {
    return (
      <div className="space-y-group">
        <CryptoFailure reason={coin.reason} copy={copy} onRetry={() => setAttempt((n) => n + 1)} ghosts={false} />
        <ButtonLink href="/crypto" variant="secondary" full>
          {copy.backToMarket}
        </ButtonLink>
      </div>
    );
  }

  const data = coin.data;
  const tone = data.change24h > 0 ? "nf-coin-up" : data.change24h < 0 ? "nf-coin-down" : "nf-coin-flat";
  const description = plainText(data.description);
  const long = description.length > 280;
  const shownDescription = expanded || !long ? description : `${description.slice(0, 280).trimEnd()}…`;

  return (
    <div className="space-y-group" data-testid="crypto-coin">
      <div className="flex items-center gap-row">
        <CoinImage src={data.image} symbol={data.symbol} name={data.name} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className={TYPE.sectionTitle}>{data.name}</h2>
          <p className={TYPE.rowMeta}>{data.symbol.toUpperCase()}</p>
        </div>
        <Segmented
          options={VS_OPTIONS}
          value={vs}
          onChange={setVs}
          semantics="radio"
          size="sm"
          label={copy.priceIn}
        />
      </div>

      <div>
        <p className="nf-h0 nf-numeric text-[var(--nf-content-primary)]">{formatPrice(data.price, vs, locale)}</p>
        <p className={`nf-numeric mt-inline-tight inline-flex items-center gap-3xs nf-body font-semibold ${tone}`}>
          {data.change24h !== 0 && <UiIcon name={data.change24h > 0 ? "arrow-up" : "arrow-down"} size={16} />}
          {formatPercent(data.change24h, locale)}
          <span className="font-medium text-[var(--nf-content-muted)]"> {copy.change24h}</span>
        </p>
      </div>

      <section className="nf-card p-card-sm" aria-label={copy.chart7d}>
        <div className="flex items-baseline justify-between gap-md">
          <h3 className={TYPE.label}>{copy.chart7d}</h3>
          <p className={`nf-numeric ${TYPE.caption}`}>
            {formatPercent(data.change7d, locale)} {copy.change7d}
          </p>
        </div>
        <div className="nf-crypto-chart mt-row">
          {path ? (
            <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" role="img" aria-label={copy.chart7d}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75].map((f) => (
                <line
                  key={f}
                  x1="0"
                  x2={CHART_W}
                  y1={CHART_H * f}
                  y2={CHART_H * f}
                  className="nf-crypto-chart__grid"
                  strokeWidth="1"
                  strokeDasharray="3 5"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <path d={path.area} fill={`url(#${gradientId})`} />
              <path
                d={path.line}
                fill="none"
                className="nf-crypto-chart__line"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          ) : (
            <p className={`py-block text-center ${TYPE.rowMeta}`}>{copy.upstreamBody}</p>
          )}
        </div>
        {path && (
          <div className="nf-crypto-chart__axis nf-numeric" aria-hidden="true">
            <span>{formatPrice(path.min, vs, locale)}</span>
            <span>{formatPrice(path.max, vs, locale)}</span>
          </div>
        )}
      </section>

      <dl className="nf-crypto-stats">
        <Stat label={copy.marketCap} value={formatCompact(data.marketCap, vs, locale)} />
        <Stat label={copy.volume24h} value={formatCompact(data.volume24h, vs, locale)} />
        <Stat label={copy.high24h} value={formatPrice(data.high24h, vs, locale)} />
        <Stat label={copy.low24h} value={formatPrice(data.low24h, vs, locale)} />
      </dl>

      {description.length > 0 && (
        <section className="nf-card p-card-sm" aria-labelledby="nf-coin-about">
          <h3 id="nf-coin-about" className={TYPE.rowTitle}>
            {copy.about.replace("{name}", data.name)}
          </h3>
          <p className={`mt-inline whitespace-pre-line ${TYPE.body}`}>{shownDescription}</p>
          {long && (
            <button
              type="button"
              className="nf-tap mt-inline text-[length:var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
              aria-expanded={expanded}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? copy.readLess : copy.readMore}
            </button>
          )}
        </section>
      )}

      <p className={`px-2xs ${TYPE.caption}`}>
        {copy.updated.replace(
          "{time}",
          formatDate(new Date(coin.cachedAt), locale, {
            hour: "numeric",
            minute: "2-digit",
            timeZone: "Africa/Lagos",
          }),
        )}
        <span aria-hidden="true"> · </span>
        {copy.displayOnly}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="nf-crypto-stat">
      <dt className={TYPE.label}>{label}</dt>
      <dd className={`nf-numeric mt-3xs ${TYPE.rowTitle}`}>{value}</dd>
    </div>
  );
}
