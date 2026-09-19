"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDate, type Dictionary, type Locale } from "@vallo/i18n";
import { Segmented, type SegmentedOption } from "@/components/ui/Segmented";
import { TextField } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { TYPE } from "@/components/app/Screen";
import { fetchMarkets, type CryptoResponse, type CryptoVs, type MarketRow, type PairRow } from "./client";
import { formatCompact, formatPercent, formatPrice, matchesCoin, movers } from "./format";
import { CoinImage } from "./CoinImage";
import { Sparkline } from "./Sparkline";
import { CryptoFailure } from "./CryptoStates";
import { PairsPanel } from "./PairsPanel";
import { FundWithCrypto } from "./FundWithCrypto";

type CryptoCopy = Dictionary["crypto"];
type Loaded = { state: "loading" } | CryptoResponse<MarketRow[]>;

const VS_OPTIONS: SegmentedOption<CryptoVs>[] = [
  { value: "ngn", label: "NGN" },
  { value: "usd", label: "USD" },
];

/**
 * The market surface, in the register.
 *
 * The off-brand render lends its composition and nothing else: a search
 * field, a Market Overview card with a rail of coin cards (price, 24h
 * change, seven-day sparkline), the two movers columns, then the full list.
 * Its gold, orange and flame are ignored; up is emerald, down is rose, and
 * every line and glow is a depth of blue.
 *
 * DISPLAY ONLY. Nothing here trades, holds or advises. The one thing on the
 * page that touches the person's money is the fund-with-crypto card at the
 * foot, which opens the real Yellow Card top-up when the keys exist and
 * says plainly that they do not otherwise.
 *
 * The feed is BD's proxy behind `client.ts`. Every one of its four states is
 * drawn on purpose: loading, unconfigured (the resting state until the
 * founder's key lands), rate limited, upstream down.
 */
export function CryptoMarket({
  locale,
  copy,
  cryptoEnabled,
  initial,
  initialPairs,
  live = true,
}: {
  locale: Locale;
  copy: CryptoCopy;
  /** Whether the Yellow Card keys exist. Decided on the server. */
  cryptoEnabled: boolean;
  /** A ready response, for the preview harness. */
  initial?: CryptoResponse<MarketRow[]>;
  initialPairs?: CryptoResponse<PairRow[]>;
  /** False renders `initial` and never fetches. */
  live?: boolean;
}) {
  const [vs, setVs] = useState<CryptoVs>("ngn");
  const [tab, setTab] = useState<"coins" | "pairs">("coins");
  const [query, setQuery] = useState("");
  const [markets, setMarkets] = useState<Loaded>(initial ?? { state: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!live) return;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMarkets({ state: "loading" });
    void fetchMarkets(vs, controller.signal).then((result) => {
      if (!controller.signal.aborted) setMarkets(result);
    });
    return () => controller.abort();
  }, [live, vs, attempt]);

  const rows = useMemo<MarketRow[]>(() => ("ok" in markets && markets.ok ? markets.data : []), [markets]);
  const tabOptions: SegmentedOption<"coins" | "pairs">[] = [
    { value: "coins", label: copy.coins },
    { value: "pairs", label: copy.pairs },
  ];
  const shown = useMemo(() => rows.filter((row) => matchesCoin(row, query)), [rows, query]);
  const { gainers, losers } = useMemo(() => movers(rows, 5), [rows]);
  const searching = query.trim().length > 0;

  return (
    <div className="space-y-group" data-testid="crypto-market">
      <TextField
        label={copy.search}
        hideLabel
        type="search"
        leadingIcon="search"
        placeholder={copy.search}
        autoComplete="off"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        clearable="Clear the search"
        onClear={() => setQuery("")}
      />

      <div className="flex flex-wrap items-center justify-between gap-row">
        <Segmented
          options={tabOptions}
          value={tab}
          onChange={setTab}
          size="sm"
          label={copy.title}
          itemIdPrefix="nf-crypto-tab"
          panelIdPrefix="nf-crypto-panel"
        />
        {tab === "coins" && (
          <Segmented
            options={VS_OPTIONS}
            value={vs}
            onChange={setVs}
            semantics="radio"
            size="sm"
            label={copy.priceIn}
          />
        )}
      </div>

      {tab === "pairs" ? (
        <div id="nf-crypto-panel-pairs" role="tabpanel" aria-labelledby="nf-crypto-tab-pairs">
          <PairsPanel locale={locale} copy={copy} initial={initialPairs} live={live} />
        </div>
      ) : (
        <div id="nf-crypto-panel-coins" role="tabpanel" aria-labelledby="nf-crypto-tab-coins" className="space-y-group">
          {!("ok" in markets) ? (
            <MarketSkeleton label={copy.loading} />
          ) : !markets.ok ? (
            <CryptoFailure reason={markets.reason} copy={copy} onRetry={() => setAttempt((n) => n + 1)} />
          ) : (
            <>
              {!searching && (
                <section className="nf-card p-card-sm" aria-labelledby="nf-crypto-overview">
                  <div className="flex items-baseline justify-between gap-md">
                    <div className="min-w-0">
                      <h2 id="nf-crypto-overview" className={TYPE.sectionTitle}>
                        {copy.overview}
                      </h2>
                      <p className={TYPE.rowMeta}>{copy.overviewSub}</p>
                    </div>
                    <a
                      href="#nf-crypto-all"
                      className="nf-tap inline-flex shrink-0 items-center gap-2xs text-[length:var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
                    >
                      {copy.seeAll}
                      <UiIcon name="chevron-right" size={16} />
                    </a>
                  </div>
                  <div className="nf-coin-rail nf-scroll-x mt-row">
                    {rows.slice(0, 6).map((row) => (
                      <CoinCard key={row.id} row={row} vs={vs} locale={locale} />
                    ))}
                  </div>
                </section>
              )}

              {!searching && (gainers.length > 0 || losers.length > 0) && (
                <div className="grid grid-cols-2 gap-row">
                  <MoversCard title={copy.gainers} icon="arrow-up" rows={gainers} vs={vs} locale={locale} />
                  <MoversCard title={copy.losers} icon="arrow-down" rows={losers} vs={vs} locale={locale} />
                </div>
              )}

              <section className="nf-card" id="nf-crypto-all" aria-labelledby="nf-crypto-all-title">
                <div className="nf-tx-card__head">
                  <h2 id="nf-crypto-all-title" className={TYPE.sectionTitle}>
                    {copy.allCoins}
                  </h2>
                  <p className={`shrink-0 ${TYPE.caption}`}>
                    {copy.updated.replace(
                      "{time}",
                      formatDate(new Date(markets.cachedAt), locale, {
                        hour: "numeric",
                        minute: "2-digit",
                        timeZone: "Africa/Lagos",
                      }),
                    )}
                  </p>
                </div>
                {shown.length === 0 ? (
                  <p className={`px-card-sm pb-card-sm pt-row ${TYPE.rowMeta}`}>{copy.noCoins}</p>
                ) : (
                  <ul className="nf-coin-list mt-inline-tight" data-testid="crypto-list">
                    {shown.map((row) => (
                      <CoinRow key={row.id} row={row} vs={vs} locale={locale} />
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      )}

      <FundWithCrypto enabled={cryptoEnabled} locale={locale} copy={copy} />

      <p className={`px-2xs ${TYPE.caption}`}>{copy.displayOnly}</p>
    </div>
  );
}

/* ---------------------------------------------------------------- parts */

function Change({ value, locale, className = "" }: { value: number; locale: Locale; className?: string }) {
  const tone = value > 0 ? "nf-coin-up" : value < 0 ? "nf-coin-down" : "nf-coin-flat";
  return (
    <span className={`nf-numeric inline-flex items-center gap-3xs font-semibold ${tone} ${className}`}>
      {value !== 0 && <UiIcon name={value > 0 ? "arrow-up" : "arrow-down"} size={16} />}
      {formatPercent(value, locale)}
    </span>
  );
}

function CoinCard({ row, vs, locale }: { row: MarketRow; vs: CryptoVs; locale: Locale }) {
  return (
    <Link href={`/crypto/${encodeURIComponent(row.id)}`} className="nf-card nf-card--interactive nf-coin-card">
      <span className="flex items-center gap-inline">
        <CoinImage src={row.image} symbol={row.symbol} name={row.name} />
        <span className="min-w-0">
          <span className={`block ${TYPE.rowTitle}`}>{row.symbol.toUpperCase()}</span>
          <span className={`block truncate ${TYPE.caption}`}>{row.name}</span>
        </span>
      </span>
      <span className={`nf-numeric block ${TYPE.rowTitle}`}>{formatPrice(row.price, vs, locale)}</span>
      <Change value={row.change24h} locale={locale} className="nf-body-sm" />
      <Sparkline values={row.sparkline7d} className="nf-coin-spark w-full" />
    </Link>
  );
}

function CoinRow({ row, vs, locale }: { row: MarketRow; vs: CryptoVs; locale: Locale }) {
  return (
    <li>
      <Link href={`/crypto/${encodeURIComponent(row.id)}`} className="nf-coin-row nf-tap">
        <CoinImage src={row.image} symbol={row.symbol} name={row.name} />
        <span className="min-w-0 flex-1">
          <span className={`block truncate ${TYPE.rowTitle}`}>{row.name}</span>
          <span className={`mt-3xs block ${TYPE.rowMeta}`}>{row.symbol.toUpperCase()}</span>
        </span>
        <Sparkline values={row.sparkline7d} className="nf-coin-spark" />
        <span className="nf-numeric shrink-0 text-right leading-tight">
          <span className={`block ${TYPE.rowTitle}`}>{formatPrice(row.price, vs, locale)}</span>
          <Change value={row.change24h} locale={locale} className="nf-body-sm mt-3xs" />
        </span>
      </Link>
    </li>
  );
}

function MoversCard({
  title,
  icon,
  rows,
  vs,
  locale,
}: {
  title: string;
  icon: "arrow-up" | "arrow-down";
  rows: MarketRow[];
  vs: CryptoVs;
  locale: Locale;
}) {
  return (
    <section className="nf-card p-card-sm" aria-label={title}>
      <div className="flex items-center gap-inline">
        <span className="nf-glyph-tile" aria-hidden="true">
          <UiIcon name={icon} size={20} />
        </span>
        <h2 className={TYPE.rowTitle}>{title}</h2>
      </div>
      <ol className="mt-inline">
        {rows.map((row, i) => (
          <li key={row.id}>
            <Link
              href={`/crypto/${encodeURIComponent(row.id)}`}
              className="nf-tap flex items-center gap-inline rounded-[var(--nf-radius-sm)] py-inline"
            >
              <span className="nf-coin-rank" aria-hidden="true">
                {i + 1}
              </span>
              {/*
                THE PRICE IS COMPACT IN THIS COLUMN, and it was the full
                figure. Two movers cards sit side by side at 390px, and a
                naira price is "₦98,412,500.00": beside a rank, a symbol and
                a signed percentage it truncated to "₦.." and the symbol to
                one letter, so both columns said nothing at all. Compact
                ("₦98.4m") is the same fact at a width this column has.
              */}
              <span className="min-w-0 flex-1">
                <span className={`block truncate ${TYPE.rowTitle}`}>{row.symbol.toUpperCase()}</span>
                <span className={`nf-numeric block truncate ${TYPE.caption}`}>
                  {formatCompact(row.price, vs, locale)}
                </span>
              </span>
              <Change value={row.change24h} locale={locale} className="nf-body-sm shrink-0" />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

function MarketSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" aria-label={label} className="space-y-group">
      <div className="nf-card p-card-sm">
        <Skeleton width="9rem" height="1.25rem" radius="sm" />
        <div className="nf-coin-rail mt-row">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} width="9.25rem" height="9rem" radius="xl" className="shrink-0" />
          ))}
        </div>
      </div>
      <div className="nf-card p-card-sm">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-row py-row">
            <Skeleton width="2.5rem" height="2.5rem" radius="pill" className="shrink-0" />
            <div className="min-w-0 flex-1">
              <Skeleton width="45%" height="1rem" radius="sm" />
              <Skeleton className="mt-inline-tight" width="20%" height="0.8125rem" radius="sm" />
            </div>
            <Skeleton width="4.5rem" height="1.75rem" radius="sm" className="shrink-0" />
            <Skeleton width="4rem" height="1rem" radius="sm" className="shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
