"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@vallo/i18n/core";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { MovementTotals, MovementView } from "@/lib/money/member-wallet";
import type { BalanceFigures } from "@/lib/money/funds";
import {
  ACTIVITY_EMPTY,
  BALANCE_TITLE,
  FIGURE_LABEL,
  FILTER_EMPTY,
  FILTER_LABEL,
  NOT_CONNECTED_FIGURE,
  TOTALS_LABEL,
  TRANSACTIONS_MORE,
  UNREACHABLE_FIGURE,
} from "@/lib/money/balance-copy";
import { WALLET_FILTERS, filterMovements, type WalletFilter } from "@/lib/money/wallet-view";
import { MoneyFigure } from "../kit";
import { WALLET_LINKS, WalletHeader, WalletTabs, type WalletLinks } from "./WalletChrome";
import { MovementList, MovementsEmpty } from "./WalletRows";
import "@/app/css/money-wallet.css";

/**
 * THE TRANSACTIONS SCREEN (D81; the brief, section 4). Its own screen, not
 * a second overview: the figure once, small, with Money in and Money out;
 * the filter chips, each one a movement kind the ledger stores; and the
 * list, every row opening its details. No Withdraw and no Send here: the two
 * capsules live on the Overview, and this screen is for reading.
 */
export function TransactionsScreen({
  figures,
  movements,
  totals = null,
  more = false,
  connected = true,
  locale,
  initialFilter = "all",
  links = WALLET_LINKS,
}: {
  figures: BalanceFigures | null;
  movements: MovementView[];
  totals?: MovementTotals | null;
  /** True when the read stopped at its limit and older movements exist. */
  more?: boolean;
  connected?: boolean;
  locale: Locale;
  initialFilter?: WalletFilter;
  links?: WalletLinks;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<WalletFilter>(initialFilter);
  const shown = filterMovements(movements, filter);

  return (
    <div className="nf-balance nf-mw" data-screen="transactions" data-testid="wallet-transactions">
      <WalletHeader title={BALANCE_TITLE} back={links.overview} settings={links.settings} />
      <WalletTabs active="transactions" links={links} />

      <section className="nf-mw-panel nf-mw-summary" aria-label="Summary" data-testid="transactions-summary">
        <div className="nf-mw-summary__main">
          <span className="nf-mw-summary__label">{FIGURE_LABEL.available}</span>
          <span className="nf-mw-summary__figure">
            {figures ? (
              <MoneyFigure minor={figures.available.minor} locale={locale} currency={figures.currency} size="lg" kobo="auto" />
            ) : connected ? (
              UNREACHABLE_FIGURE
            ) : (
              NOT_CONNECTED_FIGURE
            )}
          </span>
        </div>
        {totals && figures ? (
          <div className="nf-mw-summary__ways">
            {(["in", "out"] as const).map((way) => (
              <span key={way} className="nf-mw-summary__way" data-way={way}>
                <UiIcon name={way === "in" ? "arrow-down" : "arrow-up"} size={14} />
                {TOTALS_LABEL[way]} <MoneyFigure minor={way === "in" ? totals.inMinor : totals.outMinor} locale={locale} size="row" kobo="auto" />
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <div className="nf-mw-chips" role="group" aria-label="Filter movements" data-testid="transactions-filters">
        {WALLET_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className="nf-mw-chip"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            data-testid={`transactions-filter-${f}`}
          >
            {FILTER_LABEL[f]}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <MovementsEmpty
          title={FILTER_EMPTY[filter]}
          body={filter === "all" ? ACTIVITY_EMPTY.body : undefined}
          testId="transactions-empty"
        />
      ) : (
        <MovementList movements={shown} locale={locale} onSettled={() => router.refresh()} testId="transactions-list" />
      )}

      {more ? (
        <p className="nf-caption text-center text-[var(--nf-content-muted)]" data-testid="transactions-more">
          {TRANSACTIONS_MORE}
        </p>
      ) : null}
    </div>
  );
}
