"use client";

import { useState } from "react";
import type { Locale } from "@naijafinds/i18n";
import { formatDate } from "@naijafinds/i18n";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { Reveal } from "@/components/site/Reveal";
import type { WalletEntry, WalletEntryKind } from "@/lib/wallet/types";
import { Amount } from "@/components/ui/Amount";

/**
 * Wallet transaction history.
 *
 * Neon filter chips over the ledger, entries grouped under day headers (Today,
 * Yesterday, then the date), each group revealed with a small stagger. Rows
 * are rendered from real entries only; an account that has never moved money
 * gets a proper empty state rather than invented rows, because a wallet's
 * history is a financial record (Master Rules 8 and 50). Amounts are
 * kobo-exact: credits read + in green, debits read -, and non-COMPLETED
 * entries carry a status pill so a pending or failed movement is never
 * mistaken for settled money.
 */

type Filter = "all" | "in" | "out" | "pending";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "in", label: "Money in" },
  { key: "out", label: "Money out" },
  { key: "pending", label: "Pending" },
];

const KIND_ICON: Record<WalletEntryKind, BrandIconName> = {
  deposit: "wallet-secure",
  withdrawal: "naira-hand",
  payment: "card-lock",
  refund: "shield-check",
  transfer_in: "user-check",
  transfer_out: "user-check",
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

/** Local calendar day key, so grouping follows the viewer's clock. */
function dayKey(iso: string): string {
  return new Date(iso).toDateString();
}

function dayLabel(iso: string, locale: Locale): string {
  const key = dayKey(iso);
  const now = new Date();
  if (key === now.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (key === yesterday.toDateString()) return "Yesterday";
  return formatDate(new Date(iso), locale);
}

type DayGroup = { key: string; firstIso: string; entries: WalletEntry[] };

/** Entries are newest first; keep that order inside and across groups. */
function groupByDay(entries: WalletEntry[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const e of entries) {
    const key = dayKey(e.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.entries.push(e);
    else groups.push({ key, firstIso: e.createdAt, entries: [e] });
  }
  return groups;
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
  const groups = groupByDay(visible);

  return (
    <section aria-labelledby="nf-wallet-tx-title">
      <div className="mb-3 flex items-center justify-between gap-4">
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

      {groups.length > 0 ? (
        <div className="space-y-4">
          {groups.map((group, i) => (
            <Reveal key={`${filter}-${group.key}`} delay={Math.min(i * 70, 280)}>
              <h3 className="nf-overline mb-2">{dayLabel(group.firstIso, locale)}</h3>
              <ul className="nf-card divide-y divide-[var(--nf-border-subtle)] p-0">
                {group.entries.map((e, i) => (
                  <EntryRow key={e.id} entry={e} locale={locale} index={i} />
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      ) : (
        <div className="nf-card flex flex-col items-center px-6 py-10 text-center">
          <span className="h-12 w-12">
            <BrandIcon name="wallet-secure" fill />
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

function EntryRow({
  entry,
  locale,
  index,
}: {
  entry: WalletEntry;
  locale: Locale;
  /** Position within its day group; caps the stagger so a long history does
      not keep animating for seconds after the group appears. */
  index: number;
}) {
  const credit = entry.direction === "credit";
  const settled = entry.status === "COMPLETED";

  return (
    <li
      className={`flex items-center gap-4 px-4 py-3.5 ${credit ? "nf-tx-in" : "nf-tx-out"}`}
      style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
    >
      {/* Raw white washes replaced with tokens; they inverted to a white-on-white
          smear on the light theme. */}
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--nf-radius-md)] border border-[var(--nf-elev-1-border)] bg-[var(--nf-surface-inset)] shadow-[var(--nf-elev-1-rim)]">
        <span className="h-12 w-12">
          <BrandIcon name={KIND_ICON[entry.kind]} fill />
        </span>
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        {/* "Booking payment, Victoria Island suite" was rendering as
            "Booking payment, Vic". The note is the only thing on the row that
            says what the money was for, so it wraps. */}
        <span className="block text-[0.875rem] font-semibold">
          {entry.note ?? KIND_LABEL[entry.kind]}
        </span>
        {/* The reference is how a person reconciles this row against their bank
            statement, so it wraps rather than ending at "WD-GTB-00". */}
        <span className="mt-0.5 block text-[0.72rem] text-[var(--nf-content-muted)] [overflow-wrap:anywhere]">
          {KIND_LABEL[entry.kind]} · {entry.reference}
        </span>
      </span>
      {/*
        The amount column.

        Two fixes. It was not tabular, so in a right-aligned stack of naira
        figures the digits visibly jittered from row to row - the exact thing
        that makes a finance screen feel amateur, on the one finance screen the
        product has. And debits were painted in the primary ink, the same colour
        as the label beside them, so only the sign distinguished money leaving
        from money arriving. The reference ledgers colour both directions.

        The kobo drops to the muted ink, matching the hero figure above it, so
        the column reads as one composed number down the whole list.
      */}
      <span className="nf-numeric shrink-0 text-right leading-tight">
        <span
          className={`block text-[0.875rem] font-semibold ${credit ? "text-[var(--nf-state-success)]" : "text-[var(--nf-state-error)]"}`}
        >
          {credit ? "+" : "-"}
          <Amount
            minorUnits={entry.amountMinor}
            locale={locale}
            showFraction
            secondaryClassName="text-[0.62em] font-medium opacity-60"
          />
        </span>
        {!settled && (
          <span
            className={`nf-badge mt-1 ${
              entry.status === "PENDING" ? "nf-badge--pending" : "nf-badge--neutral"
            }`}
          >
            {entry.status.toLowerCase()}
          </span>
        )}
      </span>
    </li>
  );
}
