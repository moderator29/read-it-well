import Link from "next/link";
import { formatDate, formatMoney, type Locale } from "@vallo/i18n";
import type { AdminRead } from "@/lib/admin/queries";
import type { EscrowConsole, MoneyConsole, RefundConsole } from "@/lib/admin/money-queries";
import type { AdminUi } from "../_components/ui";
import type { AdminCommon } from "../_components/copy";
import { EscrowRuling } from "../_components/MoneyDecisions";
import { QueueFilters } from "../_components/QueueFilters";
import { EntryRow, RefundsPanel } from "./MoneyRows";
import { DeskHead, Kpi, NumberedPager, Panel, Waiting } from "./_desk/Desk";
import { SeriesChart, SeriesLegend, type Series } from "./_desk/charts";
import { ReconciliationPanel } from "./_desk/Reconciliation";
import {
  MONEY_CONSOLE_CAPS,
  flowFromWhole,
  ledgerFromWhole,
  moneyReadIsWhole,
  percentChange,
  pulseFromWhole,
} from "./_desk/derive";
import type { LedgerPage, MoneyFlow, ReconciliationHealth } from "./_desk/contracts";

/** Ledger rows per page. The render draws six; ten is a page an operator can scan without paging every few seconds. */
export const LEDGER_PAGE_SIZE = 10;

export function MoneyHead() {
  return <DeskHead title="Money" lede="Track transactions, settlements and reconciliation." />;
}

/**
 * The money desk as a function of its reads, so the page does the reading and
 * this does the drawing. See the page for where every figure comes from.
 */
export function MoneyDesk({
  locale,
  ui,
  common,
  query,
  params,
  narrowed,
  page,
  read,
  refunds,
  disputes,
  heldInEscrow,
  health,
  now,
}: {
  locale: Locale;
  ui: AdminUi;
  common: AdminCommon;
  query: { q?: string; from?: string; to?: string };
  params: Record<string, string | undefined>;
  narrowed: boolean;
  page: number;
  read: MoneyConsole;
  refunds: AdminRead<RefundConsole>;
  disputes: AdminRead<EscrowConsole>;
  heldInEscrow: number | null;
  health: ReconciliationHealth | null;
  now: number;
}) {
  const { wallets, recent, stuck, totals } = read;
  const whole = moneyReadIsWhole({
    narrowed,
    recentCount: recent.length,
    walletCount: wallets.length,
  });
  const pulse = whole ? pulseFromWhole(recent, now) : null;
  const flow: MoneyFlow | null = whole ? flowFromWhole(recent, now) : null;
  /* Under a filter the rows are still the filter's whole answer when they
     come back short of the cap, so the table pages them honestly; only the
     running balance needs the unfiltered whole. */
  const ledger: LedgerPage = ledgerFromWhole(recent, page, LEDGER_PAGE_SIZE);
  const ledgerCapped = recent.length >= MONEY_CONSOLE_CAPS.recent;
  const money = (minor: number) => formatMoney(minor, locale);
  const shown = wallets.length + recent.length + stuck.length;

  return (
    <div className="nf-console nf-md">
      <MoneyHead />

      {/* Stuck first. It is the only thing here somebody is waiting on. */}
      {stuck.length > 0 && (
        <Panel title="Stuck, and somebody is waiting" hint={`${stuck.length} pending over half an hour`}>
          <p className="max-w-[62ch] text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-secondary)]">
            These debits have been PENDING for over half an hour. The money has left a spendable
            balance and has not arrived anywhere. The stale hold sweeper releases withdrawal holds
            on a schedule; anything here that is not a withdrawal has not got a sweeper and needs a
            person.
          </p>
          <ul className="mt-sm">
            {stuck.map((entry) => (
              <EntryRow key={entry.id} entry={entry} locale={locale} ui={ui} />
            ))}
          </ul>
        </Panel>
      )}

      {/* The four cards answer for the whole platform and never re-scope
          under the filter below, which is why the filter sits under them. */}
      <div className="nf-md-kpis">
        <Kpi
          label="Wallet float"
          value={pulse ? money(pulse.floatMinor) : null}
          delta={
            pulse
              ? {
                  percent: percentChange(pulse.floatMinor, pulse.hasLastWeek ? pulse.floatWeekAgoMinor : null),
                  against: "vs a week ago",
                }
              : null
          }
          note={pulse ? "Settled money in every wallet" : "Needs the platform-wide wallet total"}
        />
        <Kpi
          label="In escrow"
          value={heldInEscrow === null ? null : money(heldInEscrow)}
          note="Held, awaiting release or disputed"
        />
        <Kpi
          label="Settled this week"
          value={pulse ? money(pulse.settledMinor.thisWeek) : null}
          delta={
            pulse
              ? {
                  percent: percentChange(pulse.settledMinor.thisWeek, pulse.hasLastWeek ? pulse.settledMinor.lastWeek : null),
                  against: "vs the 7 days before",
                }
              : null
          }
          note={pulse ? "Completed wallet entries, last 7 days" : "Needs the platform-wide ledger"}
        />
        <Kpi label="Failed charges" value={null} note="Card and top-up charges that failed this week" />
      </div>

      <FlowPanel flow={flow} locale={locale} />

      <div className="nf-md-grid nf-md-grid--split">
        <ReconciliationPanel health={health} now={now} when={ui.when} variant="ring" />
        <Panel title="Transaction summary" hint="Last 30 days">
          {flow ? (
            <dl className="nf-md-sum">
              <div className="nf-md-sum__row">
                <dt>Money in</dt>
                <dd className="nf-md-sum__figure nf-numeric">{money(flow.last30Days.inMinor)}</dd>
              </div>
              <div className="nf-md-sum__row">
                <dt>Money out</dt>
                <dd className="nf-md-sum__figure nf-numeric">{money(flow.last30Days.outMinor)}</dd>
              </div>
              <div className="nf-md-sum__row nf-md-sum__row--total">
                <dt>Net</dt>
                <dd className="nf-md-sum__figure nf-numeric">
                  {money(flow.last30Days.inMinor - flow.last30Days.outMinor)}
                </dd>
              </div>
            </dl>
          ) : (
            <Waiting
              title="Not connected yet"
              body="Money in, money out and the difference over the last 30 days, across every wallet. The ledger is larger than this desk can read in one go, so these figures wait for a platform-wide total rather than showing part of one."
            />
          )}
        </Panel>
      </div>

      <QueueFilters
        base="/admin/money"
        query={query}
        common={common}
        searchLabel="Find a person, a wallet or a payment"
        searchPlaceholder="Name, wallet id or reference"
      />

      {narrowed && shown === 0 && (
        /* A SEARCH THAT MATCHED NOTHING IS NOT A CLEARANCE. */
        <ui.QueueEmpty title={common.noMatchTitle} body={common.noMatchBody} state="no-match" />
      )}

      <LedgerPanel
        ledger={ledger}
        showBalance={whole}
        capped={ledgerCapped}
        narrowed={narrowed}
        params={params}
        ui={ui}
        locale={locale}
      />

      <Panel title="Wallets" hint={narrowed ? "Matching this filter" : "Newest first, up to forty"}>
        <ui.StatRow>
          <ui.Stat
            label="Settled"
            value={money(totals.balanceMinor)}
            hint={narrowed ? "Across the wallets matching this filter" : "Across the wallets listed below, newest first"}
          />
          <ui.Stat
            label="Held pending"
            value={money(totals.heldMinor)}
            hint="Debits that have left a spendable balance and not settled"
            tone={totals.heldMinor === 0 ? "neutral" : "warning"}
          />
          <ui.Stat label="Wallets" value={String(totals.walletCount)} hint={narrowed ? "Matching this filter" : "Newest first, up to forty"} />
        </ui.StatRow>
        {wallets.length === 0 ? (
          narrowed ? null : (
            <p className="mt-xs text-[length:var(--nf-text-body-sm)] text-[var(--nf-content-muted)]">
              Nobody has a wallet yet. One is created the first time somebody is paid or funds an account.
            </p>
          )
        ) : (
          <ul className="mt-xs">
            {wallets.map((wallet) => (
              <li
                key={wallet.id}
                className="flex flex-wrap items-baseline justify-between gap-x-md gap-y-2xs border-t border-[var(--nf-border-subtle)] py-sm"
              >
                <span className="min-w-0">
                  <span className="block text-[length:var(--nf-text-body-sm)] text-[var(--nf-content-primary)]">
                    {wallet.ownerName ?? "No display name"}
                  </span>
                  {/* The owner's profile id, printed whole: it is what an
                      operator pastes into the search box above. */}
                  <span className="nf-md-ref">{wallet.userId}</span>
                </span>
                <span className="flex shrink-0 items-baseline gap-md">
                  {wallet.heldMinor > 0 && (
                    <span className="text-[length:var(--nf-text-overline)] text-[var(--nf-content-muted)]">
                      {money(wallet.heldMinor)} held
                    </span>
                  )}
                  <span className="nf-numeric text-[length:var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-primary)]">
                    {money(wallet.balanceMinor)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <RefundsPanel refunds={refunds} narrowed={narrowed} locale={locale} ui={ui} className="nf-md-card nf-md-panel" />

      {disputes.state === "ok" && disputes.data.disputes.length > 0 && (
        <Panel title="Disputed holds waiting on a ruling">
          <p className="max-w-[62ch] text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-secondary)]">
            Somebody objected and the money is held until a person rules. Release pays the payee;
            refund returns it to the payer. Both people are sent your ruling word for word, and the
            transition is in the audit log. The full desk is at{" "}
            <Link href="/admin/escrow" className="underline">
              Escrow
            </Link>
            .
          </p>
          <ul className="mt-xs">
            {disputes.data.disputes.map((dispute) => (
              <li key={dispute.id} className="border-t border-[var(--nf-border-subtle)] py-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-x-md gap-y-2xs">
                  <span className="min-w-0">
                    <span className="block text-[length:var(--nf-text-body-sm)] text-[var(--nf-content-primary)]">
                      {dispute.listingTitle ?? "A listing that is no longer there"}
                      {" · "}
                      {dispute.payerName ?? "the payer"} paid, {dispute.payeeName ?? "the payee"} waits
                    </span>
                    {dispute.disputeReason && (
                      <span className="block text-[length:var(--nf-text-caption)] text-[var(--nf-content-secondary)]">
                        {dispute.disputeReason}
                      </span>
                    )}
                  </span>
                  <span className="nf-numeric text-[length:var(--nf-text-body-sm)] font-semibold">
                    {money(dispute.amountMinor)}
                  </span>
                </div>
                <EscrowRuling
                  escrowId={dispute.id}
                  amountMinor={dispute.amountMinor}
                  locale={locale}
                  payerName={dispute.payerName}
                  payeeName={dispute.payeeName}
                />
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}


function monthLabel(month: string, locale: Locale, withYear = false): string {
  return formatDate(new Date(`${month}-15T12:00:00Z`), locale, {
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "Africa/Lagos",
  });
}

function FlowPanel({ flow, locale }: { flow: MoneyFlow | null; locale: Locale }) {
  const series: Series[] = [
    { name: "Money in", values: flow ? flow.months.map((m) => m.inMinor) : [], rank: 0, area: true },
    { name: "Money out", values: flow ? flow.months.map((m) => m.outMinor) : [], rank: 1, area: true, dash: "6 4" },
  ];
  const legend = <SeriesLegend series={series} />;

  if (!flow) {
    return (
      <Panel title="Money in vs money out" aside={legend}>
        <Waiting
          title="Not connected yet"
          body="Settled money coming into wallets against settled money leaving them, month by month for a year. The ledger is larger than this desk can read in one go, so the chart waits for a platform-wide monthly total rather than drawing part of the history."
        />
      </Panel>
    );
  }
  if (flow.months.length < 2) {
    return (
      <Panel title="Money in vs money out" aside={legend}>
        <p className="nf-md-empty">
          {flow.months.length === 0
            ? "No money has settled yet. The chart draws from the first month that has a settled entry."
            : `Money has settled in one month so far (${monthLabel(flow.months[0]!.month, locale, true)}). A trend needs a second month, so there is no line yet.`}
        </p>
      </Panel>
    );
  }

  return (
    <Panel title="Money in vs money out" aside={legend}>
      <SeriesChart
        id="money-flow"
        xLabels={flow.months.map((m) => monthLabel(m.month, locale))}
        series={series}
        label="Settled money in and out of wallets by month"
        yLabel={(v) => formatMoney(v, locale, "NGN", { compact: true })}
        readout={flow.months.map((m) => ({
          title: monthLabel(m.month, locale, true),
          rows: [
            { label: "Money in", value: formatMoney(m.inMinor, locale) },
            { label: "Money out", value: formatMoney(m.outMinor, locale) },
          ],
        }))}
      />
    </Panel>
  );
}

function LedgerPanel({
  ledger,
  showBalance,
  capped,
  narrowed,
  params,
  ui,
  locale,
}: {
  ledger: LedgerPage;
  showBalance: boolean;
  capped: boolean;
  narrowed: boolean;
  params: Record<string, string | undefined>;
  ui: AdminUi;
  locale: Locale;
}) {
  const foot = capped
    ? "The newest 60 entries. Older entries are not reachable from this desk yet."
    : !showBalance && ledger.total > 0
      ? "The balance column is the platform float, so it is shown only for the unfiltered ledger."
      : undefined;
  return (
    <Panel title="Ledger" foot={foot}>
      {ledger.total === 0 ? (
        narrowed ? null : <p className="nf-md-empty">No money has moved yet.</p>
      ) : (
        <>
          <table className="nf-md-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Description</th>
                <th scope="col">Type</th>
                <th scope="col" className="nf-md-num">
                  Amount
                </th>
                {showBalance && (
                  <th scope="col" className="nf-md-num">
                    Balance
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {ledger.rows.map((row) => (
                <tr key={row.id}>
                  <td className="nf-md-date" data-label="Date">
                    {ui.day(row.createdAt)}
                  </td>
                  <td className="nf-md-desc" data-label="Description">
                    <span className="flex flex-wrap items-center justify-end gap-xs md:justify-start">
                      {row.note ?? ui.columnLabel("walletEntryKind", row.kind)}
                      {row.ownerName ? ` · ${row.ownerName}` : ""}
                      {row.status !== "COMPLETED" && (
                        <ui.StatusChip label={ui.columnLabel("walletEntryStatus", row.status)} status={row.status} />
                      )}
                    </span>
                    {/* The reference, never clipped: it is what a payment is traced by. */}
                    <span className="nf-md-ref">{row.reference}</span>
                  </td>
                  <td data-label="Type" className={row.direction === "credit" ? "nf-md-credit" : "nf-md-debit"}>
                    {row.direction === "credit" ? "Credit" : "Debit"}
                  </td>
                  <td className="nf-md-num nf-md-strong" data-label="Amount">
                    {formatMoney(row.amountMinor, locale)}
                  </td>
                  {showBalance && (
                    <td className="nf-md-num nf-md-strong" data-label="Balance">
                      {row.balanceAfterMinor === null ? "" : formatMoney(row.balanceAfterMinor, locale)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <NumberedPager
            base="/admin/money"
            params={params}
            page={ledger.page}
            total={ledger.total}
            pageSize={ledger.pageSize}
            noun="entries"
          />
        </>
      )}
    </Panel>
  );
}
