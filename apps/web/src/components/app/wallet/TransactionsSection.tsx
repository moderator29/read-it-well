"use client";

import { useState } from "react";
import type { Locale } from "@naijafinds/i18n";
import { formatDate } from "@naijafinds/i18n";
import { Icon, type IconName } from "@/design-system/icons/Icon";
import type { WalletEntry, WalletEntryKind } from "@/lib/wallet/types";
import { formatKoboExact } from "./money";

/**
 * Wallet transaction history.
 *
 * Filter chips over the ledger, mirroring the notifications pattern. Rows are
 * rendered from real entries only; an account that has never moved money gets
 * a proper empty state rather than invented rows, because a wallet's history
 * is a financial record (Master Rules 8 and 50). Amounts are kobo-exact:
 * credits read +, debits read -, and non-COMPLETED entries carry their status
 * so a pending or failed movement is never mistaken for settled money.
 */

type Filter = "all" | "in" | "out" | "pending";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "in", label: "Money in" },
  { key: "out", label: "Money out" },
  { key: "pending", label: "Pending" },
];

const KIND_ICON: Record<WalletEntryKind, IconName> = {
  deposit: "wallet",
  withdrawal: "wallet",
  payment: "booking",
  refund: "verified",
  transfer_in: "profile",
  transfer_out: "profile",
};

const KIND_LABEL: Record<WalletEntryKind, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  payment: "Payment",
  refund: "Refund",
  transfer_in: "Transfer received",
  transfer_out: "Transfer sent",
};

function matches(entry: WalletEntry, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "pending") return entry.status === "PENDING";
  return filter === "in" ? entry.direction === "credit" : entry.direction === "debit";
}

export function TransactionsSection({
  entries,
  locale,
}: {
  entries: WalletEntry[];
  locale: Locale;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = entries.filter((e) => matches(e, filter));

  return (
    <section aria-labelledby="nf-wallet-tx-title">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="nf-wallet-tx-title" className="nf-overline">
          Transactions
        </h2>
        <ul className="nf-scroll-x flex gap-2">
          {FILTERS.map((f) => (
            <li key={f.key}>
              <button
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
                className={`nf-chip ${filter === f.key ? "nf-chip--active" : ""}`}
              >
                {f.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {visible.length > 0 ? (
        <ul className="nf-card divide-y divide-[var(--nf-border-subtle)] p-0">
          {visible.map((e) => (
            <EntryRow key={e.id} entry={e} locale={locale} />
          ))}
        </ul>
      ) : (
        <div className="nf-card flex flex-col items-center px-6 py-10 text-center">
          <span className="h-7 w-7">
            <Icon name="wallet" fill />
          </span>
          <p className="mt-3 text-[0.9375rem] font-semibold">No transactions yet</p>
          <p className="mt-1 max-w-[34ch] text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
            {filter === "all"
              ? "Every deposit, payment, transfer and withdrawal will appear here the moment it happens."
              : "Nothing in this category yet. Movements will appear here the moment they happen."}
          </p>
        </div>
      )}
    </section>
  );
}

function EntryRow({ entry, locale }: { entry: WalletEntry; locale: Locale }) {
  const amount = formatKoboExact(entry.amountMinor, locale);
  const credit = entry.direction === "credit";
  const settled = entry.status === "COMPLETED";

  return (
    <li className="flex items-center gap-3 px-4 py-3.5">
      <span className="h-7 w-7 shrink-0">
        <Icon name={KIND_ICON[entry.kind]} fill ramp={credit ? "emerald" : "sky"} />
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-[0.875rem] font-semibold">
          {entry.note ?? KIND_LABEL[entry.kind]}
        </span>
        <span className="mt-0.5 block text-[0.72rem] text-[var(--nf-content-muted)]">
          {KIND_LABEL[entry.kind]} · {formatDate(new Date(entry.createdAt), locale)}
        </span>
      </span>
      <span className="shrink-0 text-right leading-tight">
        <span
          className={`block text-[0.875rem] font-semibold ${
            credit ? "text-[var(--nf-state-success)]" : ""
          }`}
        >
          {credit ? "+" : "-"}
          {amount.whole}
          {amount.kobo}
        </span>
        {!settled && (
          <span className="nf-badge mt-1">{entry.status.toLowerCase()}</span>
        )}
      </span>
    </li>
  );
}
