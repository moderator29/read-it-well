"use client";

import { useState } from "react";
import type { Locale } from "@naijafinds/i18n";
import { formatDate } from "@naijafinds/i18n";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { Reveal } from "@/components/site/Reveal";
import type { WalletEntry, WalletEntryKind } from "@/lib/wallet/types";
import { Amount } from "@/components/ui/Amount";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { StatusPill, toneForStatus } from "@/components/ui/StatusPill";
import { EmptyState, TYPE } from "@/components/app/Screen";

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
  escrow_hold: "shield-lock",
  escrow_release: "shield-check",
  escrow_refund: "shield-check",
};

const KIND_LABEL: Record<WalletEntryKind, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  payment: "Payment",
  refund: "Refund",
  transfer_in: "Transfer received",
  transfer_out: "Transfer sent",
  /* Escrow money is wallet money and it shows in this one statement, so it
     needs words a payer recognises rather than the enum's own vocabulary.
     "Held in escrow" says where the money is; the other two say where it
     went. */
  escrow_hold: "Held in escrow",
  escrow_release: "Escrow released",
  escrow_refund: "Escrow refunded",
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
      <div className="mb-heading flex items-center justify-between gap-md">
        <h2 id="nf-wallet-tx-title" className="nf-overline">
          Transactions
        </h2>
        {/*
          The ledger filters, on the shared rail.

          `behaviour="filter"` rather than `"choice"`, because that is what
          these already were: `aria-pressed`, one control per view, not a radio
          group. Keeping the announced semantics is worth more than the tidier
          radio pattern here.

          `size="sm"` keeps the 36px paint the header row is built around while
          the primitive grows the hit region to 44pt underneath - the previous
          chips were tappable at 36px, under the floor. The rail does not bleed
          or fade because it is not a full-width rail: it shares a row with the
          section heading.
        */}
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
        /*
          ONE CARD PER DAY WAS N CARDS FOR ONE LIST.

          Each day group wrapped its rows in its own `nf-card`, so a wallet with
          movement in the last week drew five or six separate glass surfaces
          down the screen, each one a border, a blur, a radius and a corner
          bloom, for a single continuous statement. That is exactly the "eight
          cards where the reference draws one" ratio, and on the wallet it is
          worse than elsewhere because the balance hero directly above is itself
          a card: the eye read seven peers where there is one hero and one list.

          Hairline rows on the ground now, which is what the Inbox already does
          with the same shape of content, and the day label is the group label
          above each run rather than an overline inside a box. The history goes
          from six containers to none, and the balance card is the only surface
          on the screen again.
        */
        <div className="space-y-block">
          {groups.map((group, i) => (
            <Reveal key={`${filter}-${group.key}`} delay={Math.min(i * 70, 280)}>
              <h3 className="nf-group-label">{dayLabel(group.firstIso, locale)}</h3>
              <ul className="divide-y divide-[var(--nf-border-subtle)]">
                {group.entries.map((e, i) => (
                  <EntryRow key={e.id} entry={e} locale={locale} index={i} />
                ))}
              </ul>
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
      className={`flex items-center gap-md py-row ${credit ? "nf-tx-in" : "nf-tx-out"}`}
      style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
    >
      {/*
        THE OBJECT LOST ITS PLINTH, AND THE PLINTH WAS SMALLER THAN THE OBJECT.

        This was a 44px bordered, filled, rim-shadowed tile with a 48px
        `BrandIcon` inside it. Two separate faults in four lines. The artwork is
        lit and carries its own shadow, so a plate behind it flattens exactly
        the depth it was drawn to have - `BrandIcon`'s own documentation says a
        tile is earned only when the object is the subject of a surface, and in
        a ledger row it is the smallest thing on the line. And the numbers did
        not fit: h-12 inside h-11 is 48 inside 44, so every object in the
        statement was overflowing its own container by two pixels on each side.

        On the surface at 40px now, nothing drawn around it, and one container
        per ledger row leaves the screen.
      */}
      <span className="block h-10 w-10 shrink-0">
        <BrandIcon name={KIND_ICON[entry.kind]} fill />
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        {/* "Booking payment, Victoria Island suite" was rendering as
            "Booking payment, Vic". The note is the only thing on the row that
            says what the money was for, so it wraps. */}
        <span className={`block ${TYPE.rowTitle}`}>{entry.note ?? KIND_LABEL[entry.kind]}</span>

        {/*
          THE PROPERTY, WHICH THIS LEDGER NEVER NAMED.

          Both reference platforms put the property on every money row that has
          one, and it is the difference between a receipt somebody has to
          remember and one they can check: "Held in escrow, ₦1,200,000" against
          "Held in escrow, ₦1,200,000, 3 bedroom flat at Admiralty Way".

          Nothing is invented. It is resolved in the repository from the
          reference the escrow leg was keyed on, so a row only carries a title
          when a real listing is genuinely behind it, and a listing that has
          since come down leaves the row exactly as it was.
        */}
        {entry.property && (
          <span className={`mt-inline-tight block ${TYPE.rowMeta} [overflow-wrap:anywhere]`}>
            {entry.property}
          </span>
        )}

        {/* The reference is how a person reconciles this row against their bank
            statement, so it wraps rather than ending at "WD-GTB-00". */}
        <span className={`mt-inline-tight block ${TYPE.caption} [overflow-wrap:anywhere]`}>
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
          className={`block nf-body font-semibold ${credit ? "text-[var(--nf-state-success)]" : "text-[var(--nf-state-error)]"}`}
        >
          {credit ? "+" : "-"}
          <Amount
            minorUnits={entry.amountMinor}
            locale={locale}
            showFraction
            secondaryClassName="text-[0.62em] font-medium opacity-60"
          />
        </span>
        {/* An unsettled movement, in the platform's one status vocabulary.
            The old pair sent everything that was not PENDING to neutral, so a
            FAILED withdrawal and a REVERSED transfer - the two entries on this
            screen somebody most needs to notice - were painted as "no state".
            Not `live`: a ledger renders many of these at once, and a live
            region per row would announce the whole history on arrival. */}
        {!settled && (
          <StatusPill tone={toneForStatus(entry.status)} className="mt-inline-tight">
            {entry.status.toLowerCase()}
          </StatusPill>
        )}
      </span>
    </li>
  );
}
