import Link from "next/link";
import { LiveRefresh } from "../_components/LiveRefresh";
import { formatDate, formatMoney, type Locale } from "@vallo/i18n";
import type { AdminRead } from "@/lib/admin/queries";
import type { EscrowConsole, MoneyConsole, RefundConsole } from "@/lib/admin/money-queries";
import type { AdminUi } from "../_components/ui";
import type { AdminCommon } from "../_components/copy";
import { EscrowRuling } from "../_components/MoneyDecisions";
import { QueueFilters } from "../_components/QueueFilters";
import { EntryRow, RefundsPanel } from "./MoneyRows";
import { CalmNote, DeskHead, EmptyChart, Kpi, NumberedPager, Panel, TableNote, Waiting, lastMonths } from "./_desk/Desk";
import { SeriesChart, SeriesLegend, StatusBar, type Series } from "./_desk/charts";
import { ReconciliationPanel } from "./_desk/Reconciliation";
import { DisputeEvidence } from "./_desk/Evidence";
import { BadgeSlot } from "./_desk/BadgeSlot";
import type { BadgeTier } from "@/lib/admin/reads/badges";
import type { EvidenceItem } from "@/lib/admin/reads/escrow";
import { percentChange } from "@/lib/admin/reads/money-derive";
import type { MoneyDesk as MoneyDeskData } from "@/lib/admin/reads/money";
import type { LedgerPage, MoneyFlow, ReconciliationHealth, RentCharges, RentChargeState } from "@/lib/admin/reads/money-types";

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
  read,
  desk,
  refunds,
  disputes,
  health,
  rent,
  evidence = {},
  tiers = {},
  now,
}: {
  locale: Locale;
  ui: AdminUi;
  common: AdminCommon;
  query: { q?: string; from?: string; to?: string };
  params: Record<string, string | undefined>;
  narrowed: boolean;
  read: MoneyConsole;
  /** `getMoneyDesk`: the pulse, the flow and the ledger page. Null when it could not be read. */
  desk: MoneyDeskData | null;
  refunds: AdminRead<RefundConsole>;
  disputes: AdminRead<EscrowConsole>;
  health: ReconciliationHealth | null;
  /** `getRentCharges`: every tenancy charge by state, and the newest. Null when it could not be read. */
  rent: RentCharges | null;
  /** `getDisputeEvidence` for the disputes below; null when the read failed. */
  evidence?: Record<string, EvidenceItem[]> | null;
  /** Badge tiers from `public.person_badge`, keyed by user id. */
  tiers?: Record<string, BadgeTier>;
  now: number;
}) {
  const { wallets, recent, stuck, totals } = read;
  const pulse = desk?.pulse ?? null;
  const flow: MoneyFlow | null = desk?.flow ?? null;
  const ledger: LedgerPage | null = desk?.ledger ?? null;
  const money = (minor: number) => formatMoney(minor, locale);
  const shown = wallets.length + recent.length + stuck.length;

  return (
    <div className="nf-console nf-md">
      <LiveRefresh />
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
          delta={pulse ? { percent: percentChange(pulse.floatMinor, pulse.floatWeekAgoMinor), against: "vs a week ago" } : null}
          note="Settled money in every wallet"
        />
        <Kpi
          label="In escrow"
          value={pulse ? money(pulse.inEscrowMinor) : null}
          delta={pulse ? { percent: percentChange(pulse.inEscrowMinor, pulse.inEscrowWeekAgoMinor), against: "vs a week ago" } : null}
          note="Held, awaiting release or disputed"
        />
        <Kpi
          label="Settled this week"
          value={pulse ? money(pulse.settledMinor.thisWeek) : null}
          delta={
            pulse
              ? { percent: percentChange(pulse.settledMinor.thisWeek, pulse.settledMinor.lastWeek), against: "vs the 7 days before" }
              : null
          }
          note="Completed wallet entries, last 7 days"
        />
        <Kpi
          label="Failed charges"
          value={pulse ? money(pulse.failedCharges.thisWeek.amountMinor) : null}
          delta={
            pulse
              ? {
                  percent: percentChange(pulse.failedCharges.thisWeek.amountMinor, pulse.failedCharges.lastWeek.amountMinor),
                  against: "vs the 7 days before",
                  upIsGood: false,
                }
              : null
          }
          note={
            pulse
              ? `${pulse.failedCharges.thisWeek.count} failed card or top-up ${pulse.failedCharges.thisWeek.count === 1 ? "charge" : "charges"} this week`
              : "Card and top-up charges that failed this week"
          }
        />
      </div>
      {desk && !desk.complete && (
        <p className="nf-md-panel__hint">
          The ledger is larger than this desk reads in one pass, so the figures above are at least these
          amounts rather than totals.
        </p>
      )}

      <FlowPanel flow={flow} locale={locale} now={now} />

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
              title="The ledger could not be read"
              body="Money in, money out and the difference over the last 30 days, across every wallet. The read did not answer just now; nothing about the money itself is implied. Reload in a moment."
            />
          )}
        </Panel>
      </div>

      <RentPanel rent={rent} locale={locale} ui={ui} tiers={tiers} />

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

      {ledger ? (
        <LedgerPanel ledger={ledger} showBalance={!narrowed} narrowed={narrowed} params={params} ui={ui} locale={locale} tiers={tiers} />
      ) : (
        <Panel title="Ledger">
          <Waiting
            title="The ledger could not be read"
            body="Every wallet entry, newest first, with the platform float after each one. The read did not answer just now; reload in a moment."
          />
        </Panel>
      )}

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
            <div className="mt-sm">
              <CalmNote
                title="Nobody has a wallet yet"
                fills="Every wallet on the platform, newest first, with what is settled and what is held."
                creates="A wallet is created the first time somebody is paid or funds an account."
              />
            </div>
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
                    <BadgeSlot tier={tiers[wallet.userId]} />
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

      <RefundsPanel refunds={refunds} narrowed={narrowed} locale={locale} ui={ui} className="nf-panel nf-md-card nf-md-panel" />

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
                <DisputeEvidence
                  tiers={tiers}
                  items={evidence ? (evidence[dispute.id] ?? []) : []}
                  readable={evidence !== null}
                  payerName={dispute.payerName}
                  payeeName={dispute.payeeName}
                  locale={locale}
                  ui={ui}
                />
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

const RENT_STATE: Record<RentChargeState, { label: string; tone: "success" | "warning" | "danger" | "info" }> = {
  awaiting: { label: "Awaiting payment", tone: "warning" },
  paid: { label: "Paid", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
  no_show: { label: "Did not move in", tone: "danger" },
  check: { label: "Needs a look", tone: "info" },
};

const RENT_PERIOD: Record<string, string> = { month: "Monthly", quarter: "Quarterly", year: "Yearly" };

/**
 * Tenancy charges (`rent_payments`): the move-in money a tenant pays after an
 * accepted inspection. Exact counts by state on the status four, what is paid
 * and what is awaited in kobo through the formatter, and the newest charges.
 * Whole-platform, so it never re-scopes under the filter below it.
 */
function RentPanel({
  rent,
  locale,
  ui,
  tiers,
}: {
  rent: RentCharges | null;
  locale: Locale;
  ui: AdminUi;
  tiers: Record<string, BadgeTier>;
}) {
  if (!rent) {
    return (
      <Panel title="Tenancy charges">
        <Waiting
          title="Tenancy charges could not be read"
          body="Every move-in charge by where it stands, and the newest ones. The read did not answer just now; nothing about the charges themselves is implied. Reload in a moment."
        />
      </Panel>
    );
  }
  const b = rent.byState;
  const money = (minor: number, currency?: string) => formatMoney(minor, locale, currency);
  return (
    <Panel
      title="Tenancy charges"
      hint={`${rent.total} ${rent.total === 1 ? "charge" : "charges"}${rent.complete ? "" : ", more than one pass reads"}`}
    >
      <StatusBar
        label="Tenancy charges by state"
        segments={[
          { key: "awaiting", label: "Awaiting payment", count: b.awaiting, tone: "pending" },
          { key: "paid", label: "Paid", count: b.paid, tone: "good" },
          { key: "ended", label: "Cancelled or did not move in", count: b.cancelled + b.no_show, tone: "bad" },
          { key: "check", label: "Needs a look", count: b.check, tone: "info" },
        ]}
      />
      <dl className="nf-md-sum mt-md">
        <div className="nf-md-sum__row">
          <dt>Paid</dt>
          <dd className="nf-md-sum__figure nf-numeric">{money(rent.paidMinor)}</dd>
        </div>
        <div className="nf-md-sum__row">
          <dt>Awaiting payment</dt>
          <dd className="nf-md-sum__figure nf-numeric">{money(rent.awaitingMinor)}</dd>
        </div>
      </dl>
      <table className="nf-md-table mt-md">
        <caption className="sr-only">The newest tenancy charges</caption>
        <thead>
          <tr>
            <th scope="col">Opened</th>
            <th scope="col">Tenancy</th>
            <th scope="col">Move-in</th>
            <th scope="col" className="nf-md-num">
              Total
            </th>
            <th scope="col">State</th>
          </tr>
        </thead>
        <tbody>
          {rent.latest.length === 0 ? (
            <TableNote
              columns={5}
              note={{
                title: "No tenancy charge yet",
                fills: "Every move-in charge by where it stands, what is paid and what is awaited, and the newest charges.",
                creates:
                  "A charge opens when a tenant starts paying the move-in costs on an inspection the lister accepted.",
                action: { href: "/admin/bookings", label: "Open bookings" },
              }}
            />
          ) : (
            rent.latest.map((row) => (
              <tr key={row.id}>
                <td className="nf-md-date" data-label="Opened">
                  {ui.day(row.createdAt)}
                </td>
                <td className="nf-md-desc" data-label="Tenancy">
                  <span className="block min-w-0">
                    <span className="block">
                      {row.listingTitle ?? "A listing that is no longer there"}
                      {row.tenantName ? ` · ${row.tenantName}` : ""}
                      {row.tenantId ? <BadgeSlot tier={tiers[row.tenantId]} /> : null}
                    </span>
                    <span className="nf-md-ref">{row.bookingId}</span>
                  </span>
                </td>
                <td data-label="Move-in">
                  {ui.day(`${row.moveIn}T12:00:00Z`)} · {RENT_PERIOD[row.rentPeriod] ?? row.rentPeriod}
                </td>
                <td className="nf-md-num nf-md-strong" data-label="Total">
                  {money(row.totalMinor, row.currency)}
                </td>
                <td data-label="State">
                  <ui.StatusChip label={RENT_STATE[row.state].label} tone={RENT_STATE[row.state].tone} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </Panel>
  );
}

function monthLabel(month: string, locale: Locale, withYear = false): string {
  return formatDate(new Date(`${month}-15T12:00:00Z`), locale, {
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "Africa/Lagos",
  });
}

function FlowPanel({ flow, locale, now }: { flow: MoneyFlow | null; locale: Locale; now: number }) {
  const series: Series[] = [
    { name: "Money in", values: flow ? flow.months.map((m) => m.inMinor) : [], rank: 0, area: true },
    { name: "Money out", values: flow ? flow.months.map((m) => m.outMinor) : [], rank: 1, area: true, dash: "6 4" },
  ];
  const legend = <SeriesLegend series={series} />;

  if (!flow) {
    return (
      <Panel title="Money in vs money out" aside={legend}>
        <Waiting
          title="The ledger could not be read"
          body="Settled money coming into wallets against settled money leaving them, month by month for a year. The read did not answer just now; reload in a moment."
        />
      </Panel>
    );
  }
  if (flow.months.length < 2) {
    return (
      <Panel title="Money in vs money out" aside={legend}>
        <EmptyChart
          height={200}
          yLabels={["₦0", "", "", "", ""]}
          xLabels={lastMonths(now, 12).map((m) => monthLabel(m, locale))}
          note={{
            title:
              flow.months.length === 0
                ? "No money has settled yet"
                : `One month of settled money so far (${monthLabel(flow.months[0]!.month, locale, true)})`,
            fills: "Settled money into wallets against settled money out, month by month for a year.",
            creates:
              "Every top-up, booking payment, payout and refund that completes adds to it. A line needs a second month, so none is drawn.",
            action: { href: "/admin/payments", label: "Open payments" },
          }}
        />
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
  narrowed,
  params,
  ui,
  locale,
  tiers,
}: {
  tiers: Record<string, BadgeTier>;
  ledger: LedgerPage;
  showBalance: boolean;
  narrowed: boolean;
  params: Record<string, string | undefined>;
  ui: AdminUi;
  locale: Locale;
}) {
  const foot =
    !showBalance && ledger.total > 0
      ? "The balance column is the platform float, so it is shown only for the unfiltered ledger."
      : undefined;
  return (
    <Panel title="Ledger" foot={foot}>
      {ledger.total === 0 ? (
        narrowed ? null : (
          <table className="nf-md-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Description</th>
                <th scope="col">Type</th>
                <th scope="col" className="nf-md-num">Amount</th>
                <th scope="col" className="nf-md-num">Balance</th>
              </tr>
            </thead>
            <tbody>
              <TableNote
                columns={5}
                note={{
                  title: "No money has moved yet",
                  fills: "Every wallet entry, newest first, with the platform float after each one.",
                  creates: "A top-up, a booking payment, a payout or a refund writes the first entry.",
                  action: { href: "/admin/payments", label: "Open payments" },
                }}
              />
            </tbody>
          </table>
        )
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
                    <span className="block min-w-0">
                      <span className="flex flex-wrap items-center justify-end gap-xs md:justify-start">
                        {row.note ?? ui.columnLabel("walletEntryKind", row.kind)}
                        {row.ownerName ? ` · ${row.ownerName}` : ""}
                        {row.ownerId ? <BadgeSlot tier={tiers[row.ownerId]} /> : null}
                        {row.status !== "COMPLETED" && (
                          <ui.StatusChip label={ui.columnLabel("walletEntryStatus", row.status)} status={row.status} />
                        )}
                      </span>
                      {/* The reference, never clipped: it is what a payment is traced by. */}
                      <span className="nf-md-ref">{row.reference}</span>
                    </span>
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
