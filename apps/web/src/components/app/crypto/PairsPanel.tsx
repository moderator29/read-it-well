"use client";

import { useEffect, useState } from "react";
import type { Dictionary, Locale } from "@vallo/i18n";
import { TextField } from "@/components/ui/Field";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { TYPE } from "@/components/app/Screen";
import { Skeleton } from "@/components/ui/Skeleton";
import { fetchPairs, PAIR_NETWORKS, type CryptoResponse, type PairRow } from "./client";
import { formatCompact, formatPercent, formatPrice } from "./format";
import { CryptoFailure } from "./CryptoStates";

type CryptoCopy = Dictionary["crypto"];
type Loaded = { state: "loading" } | CryptoResponse<PairRow[]>;

/**
 * The Pairs tab: GeckoTerminal's top pools on a network, searchable.
 *
 * A network is a chip rail (one of a set, so `choice` semantics), the query
 * is debounced so a person typing "usdc" does not fire four requests, and
 * the list draws what the feed returns: pair, DEX, price in dollars, 24h
 * change and 24h volume. Nothing is tradeable from here and nothing says
 * it is.
 */
export function PairsPanel({
  locale,
  copy,
  initial,
  live = true,
}: {
  locale: Locale;
  copy: CryptoCopy;
  /** A ready response, for the preview harness. */
  initial?: CryptoResponse<PairRow[]>;
  /** False renders `initial` and never fetches. */
  live?: boolean;
}) {
  const [network, setNetwork] = useState(PAIR_NETWORKS[0]!.id);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [pairs, setPairs] = useState<Loaded>(initial ?? { state: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!live) return;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPairs({ state: "loading" });
    void fetchPairs(network, debounced, controller.signal).then((result) => {
      if (!controller.signal.aborted) setPairs(result);
    });
    return () => controller.abort();
  }, [live, network, debounced, attempt]);

  return (
    <div className="space-y-row">
      <ChipRow radiogroup label={copy.network}>
        {PAIR_NETWORKS.map((one) => (
          <Chip
            key={one.id}
            size="sm"
            behaviour="choice"
            selected={network === one.id}
            onSelectedChange={() => setNetwork(one.id)}
          >
            {one.label}
          </Chip>
        ))}
      </ChipRow>
      <TextField
        label={copy.pairsSearch}
        hideLabel
        type="search"
        leadingIcon="search"
        placeholder={copy.pairsSearch}
        autoComplete="off"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        clearable="Clear the search"
        onClear={() => setQuery("")}
      />

      {!("ok" in pairs) ? (
        <div className="nf-card p-card-sm" role="status" aria-live="polite" aria-label={copy.loading}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-row py-row">
              <Skeleton width="2.5rem" height="2.5rem" radius="pill" className="shrink-0" />
              <div className="min-w-0 flex-1">
                <Skeleton width="50%" height="1rem" radius="sm" />
                <Skeleton className="mt-inline-tight" width="30%" height="0.8125rem" radius="sm" />
              </div>
              <Skeleton width="4rem" height="1rem" radius="sm" className="shrink-0" />
            </div>
          ))}
        </div>
      ) : !pairs.ok ? (
        <CryptoFailure reason={pairs.reason} copy={copy} onRetry={() => setAttempt((n) => n + 1)} ghosts={false} />
      ) : pairs.data.length === 0 ? (
        <p className={`px-2xs py-row ${TYPE.rowMeta}`}>{copy.noPairs}</p>
      ) : (
        <ul className="nf-card nf-coin-list" data-testid="crypto-pairs">
          {pairs.data.map((pair) => {
            const up = pair.change24h > 0;
            const down = pair.change24h < 0;
            return (
              <li key={pair.address} className="nf-pair-row">
                <span className="nf-coin-img" aria-hidden="true">
                  <span className="nf-coin-img__fallback">{pair.baseSymbol.slice(0, 4).toUpperCase()}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate ${TYPE.rowTitle}`}>
                    {pair.baseSymbol} / {pair.quoteSymbol}
                  </span>
                  <span className={`mt-3xs block truncate ${TYPE.rowMeta}`}>
                    {pair.dex}
                    <span aria-hidden="true"> · </span>
                    {formatCompact(pair.volume24h, "usd", locale)}
                  </span>
                </span>
                <span className="nf-numeric shrink-0 text-right leading-tight">
                  <span className={`block ${TYPE.rowTitle}`}>{formatPrice(pair.priceUsd, "usd", locale)}</span>
                  <span
                    className={`nf-body-sm mt-3xs block font-semibold ${
                      up ? "nf-coin-up" : down ? "nf-coin-down" : "nf-coin-flat"
                    }`}
                  >
                    {formatPercent(pair.change24h, locale)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
