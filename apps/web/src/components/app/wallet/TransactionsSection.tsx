"use client";

import { useState } from "react";
import { formatDate, type Dictionary, type Locale } from "@vallo/i18n";
import { Reveal } from "@/components/site/Reveal";
import type { WalletEntry } from "@/lib/wallet/types";
import { walletWords } from "./kinds";
import { EntryRow } from "./EntryRow";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { EmptyState } from "@/components/app/Screen";

/**
 * Wallet transaction history.
 *
 * Filter chips over the ledger, entries grouped under day headers (Today,
 * Yesterday, then the date), each group a glass card in the register of the
 * wallet home's recent card, so a movement is drawn identically on both
 * screens through the one `EntryRow`. Rows are rendered from real entries
 * only; an account that has never moved money gets a proper empty state
 * rather than invented rows, because a wallet's history is a financial
 * record. Amounts are kobo-exact and non-COMPLETED entries carry their
 * state as a word, so a pending or failed movement is never mistaken for
 * settled money.
 */

type Filter = "all" | "in" | "out" | "pending";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "in", label: "Money in" },
  { key: "out", label: "Money out" },
  { key: "pending", label: "Pending" },
];

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
  copy,
  heading = true,
}: {
  entries: WalletEntry[];
  locale: Locale;
  copy: Dictionary["wallet"]["home"];
  /** Draw the "Transactions" overline. False where the page header says it. */
  heading?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = entries.filter((e) => matches(e, filter));
  const groups = groupByDay(visible);
  const words = walletWords(locale);

  return (
    <section aria-labelledby="nf-wallet-tx-title">
      <div className="mb-heading flex items-center justify-between gap-md">
        {heading ? (
          <h2 id="nf-wallet-tx-title" className="nf-overline">
            Transactions
          </h2>
        ) : (
          <span className="sr-only" id="nf-wallet-tx-title">
            Transactions
          </span>
        )}
        {/* `behaviour="filter"`: aria-pressed, one control per view. `size="sm"`
            keeps the 36px paint while the primitive grows the hit region to
            44pt underneath. */}
        <ChipRow bleed={false} fadeEdges={false} className="min-w-0">
          {FILTERS.map((f) => (
            <Chip
              key={f.key}
              size="sm"
              behaviour="filter"
              selected={filter === f.key}
              onSelectedChange={() => setFilter(f.key)}
              className="shrink-0"
            >
              {f.label}
            </Chip>
          ))}
        </ChipRow>
      </div>

      {groups.length > 0 ? (
        <div className="space-y-group">
          {groups.map((group, i) => (
            <Reveal key={`${filter}-${group.key}`} delay={Math.min(i * 70, 280)}>
              <section className="nf-card" aria-label={dayLabel(group.firstIso, locale)}>
                <h3 className="nf-tx-card__head nf-overline">{dayLabel(group.firstIso, locale)}</h3>
                <ul className="nf-tx-list">
                  {group.entries.map((e) => (
                    <EntryRow
                      key={e.id}
                      entry={e}
                      locale={locale}
                      words={words}
                      completedLabel={copy.completed}
                    />
                  ))}
                </ul>
              </section>
            </Reveal>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="wallet-secure"
          title="No transactions yet"
          body={
            filter === "all"
              ? "Every deposit, payment, transfer and withdrawal will appear here the moment it happens."
              : "Nothing in this category yet. Movements will appear here the moment they happen."
          }
        />
      )}
    </section>
  );
}
