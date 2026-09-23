import Link from "next/link";
import { LiveRefresh } from "../_components/LiveRefresh";
import { formatDate, formatMoney, getDictionary, plural, type Dictionary, type Locale } from "@vallo/i18n";
import type { AdminRead } from "@/lib/admin/queries";
import type { EscrowConsole, MoneyConsole, RefundConsole } from "@/lib/admin/money-queries";
import type { AdminUi } from "../_components/ui";
import { fill, type AdminCommon } from "../_components/copy";
import { EscrowRuling } from "../_components/MoneyDecisions";
import { QueueFilters } from "../_components/QueueFilters";
import { EntryRow, RefundsPanel } from "./MoneyRows";
import { CalmNote, DeskHead, EmptyChart, Kpi, NumberedPager, Panel, TableNote, Waiting, lastMonths } from "./_desk/Desk";
import { SeriesChart, SeriesLegend, StatusBar, type Series } from "./_desk/charts";
import { ReconciliationPanel } from "./_desk/Reconciliation";
import { DisputeEvidence } from "./_desk/Evidence";
import { PersonTier } from "@/app/admin/_components/PersonTier";
import type { BadgeTier } from "@/lib/admin/reads/badges";
import type { EvidenceItem } from "@/lib/admin/reads/escrow";
import { percentChange } from "@/lib/admin/reads/money-derive";
import type { MoneyDesk as MoneyDeskData } from "@/lib/admin/reads/money";
import type { LedgerPage, MoneyFlow, ReconciliationHealth, RentCharges, RentChargeState } from "@/lib/admin/reads/money-types";

/** Ledger rows per page. The render draws six; ten is a page an operator can scan without paging every few seconds. */
export const LEDGER_PAGE_SIZE = 10;

export function MoneyHead({ locale = "en" }: { locale?: Locale } = {}) {
  const t = getDictionary(locale);
  return <DeskHead title={t.admin.shell.nav.money} lede={t.admin.money.lede} />;
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
  const t = getDictionary(locale);
  const c = t.admin.money;
  const { wallets, recent, stuck, totals } = read;
  const pulse = desk?.pulse ?? null;
  const flow: MoneyFlow | null = desk?.flow ?? null;
  const ledger: LedgerPage | null = desk?.ledger ?? null;
  const money = (minor: number) => formatMoney(minor, locale);
  const shown = wallets.length + recent.length + stuck.length;

  return (
    <div className="nf-console nf-md">
      <LiveRefresh />
      <MoneyHead locale={locale} />

      {/* Stuck first. It is the only thing here somebody is waiting on. */}
      {stuck.length > 0 && (
        <Panel title={c.stuckTitle} hint={fill(c.stuckHint, { count: stuck.length })}>
          <p className="max-w-[62ch] text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-secondary)]">
            {c.stuckBody}
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
          locale={locale}
          label={c.floatLabel}
          value={pulse ? money(pulse.floatMinor) : null}
          delta={pulse ? { percent: percentChange(pulse.floatMinor, pulse.floatWeekAgoMinor), against: t.admin.shell.operations.vsWeekAgo } : null}
          note={c.floatNote}
        />
        <Kpi
          locale={locale}
          label={c.inEscrowLabel}
          value={pulse ? money(pulse.inEscrowMinor) : null}
          delta={pulse ? { percent: percentChange(pulse.inEscrowMinor, pulse.inEscrowWeekAgoMinor), against: t.admin.shell.operations.vsWeekAgo } : null}
          note={c.inEscrowNote}
        />
        <Kpi
          locale={locale}
          label={c.settledLabel}
          value={pulse ? money(pulse.settledMinor.thisWeek) : null}
          delta={
            pulse
              ? { percent: percentChange(pulse.settledMinor.thisWeek, pulse.settledMinor.lastWeek), against: c.vsSevenDaysBefore }
              : null
          }
          note={c.settledNote}
        />
        <Kpi
          locale={locale}
          label={c.failedLabel}
          value={pulse ? money(pulse.failedCharges.thisWeek.amountMinor) : null}
          delta={
            pulse
              ? {
                  percent: percentChange(pulse.failedCharges.thisWeek.amountMinor, pulse.failedCharges.lastWeek.amountMinor),
                  against: c.vsSevenDaysBefore,
                  upIsGood: false,
                }
              : null
          }
          note={pulse ? plural(pulse.failedCharges.thisWeek.count, c.failedNote, locale) : c.failedNoteUnread}
        />
      </div>
      {desk && !desk.complete && (
        <p className="nf-md-panel__hint">{c.incomplete}</p>
      )}

      <FlowPanel flow={flow} locale={locale} now={now} />

      <div className="nf-md-grid nf-md-grid--split">
        <ReconciliationPanel health={health} now={now} when={ui.when} variant="ring" locale={locale} />
        <Panel title={c.summaryTitle} hint={c.last30Days}>
          {flow ? (
            <dl className="nf-md-sum">
              <div className="nf-md-sum__row">
                <dt>{c.moneyIn}</dt>
                <dd className="nf-md-sum__figure nf-numeric">{money(flow.last30Days.inMinor)}</dd>
              </div>
              <div className="nf-md-sum__row">
                <dt>{c.moneyOut}</dt>
                <dd className="nf-md-sum__figure nf-numeric">{money(flow.last30Days.outMinor)}</dd>
              </div>
              <div className="nf-md-sum__row nf-md-sum__row--total">
                <dt>{c.net}</dt>
                <dd className="nf-md-sum__figure nf-numeric">
                  {money(flow.last30Days.inMinor - flow.last30Days.outMinor)}
                </dd>
              </div>
            </dl>
          ) : (
            <Waiting title={c.ledgerUnreadTitle} body={c.summaryUnreadBody} />
          )}
        </Panel>
      </div>

      <RentPanel rent={rent} locale={locale} ui={ui} tiers={tiers} />

      <QueueFilters
        base="/admin/money"
        query={query}
        common={common}
        searchLabel={c.searchLabel}
        searchPlaceholder={c.searchPlaceholder}
      />

      {narrowed && shown === 0 && (
        /* A SEARCH THAT MATCHED NOTHING IS NOT A CLEARANCE. */
        <ui.QueueEmpty title={common.noMatchTitle} body={common.noMatchBody} state="no-match" />
      )}

      {ledger ? (
        <LedgerPanel ledger={ledger} showBalance={!narrowed} narrowed={narrowed} params={params} ui={ui} locale={locale} tiers={tiers} />
      ) : (
        <Panel title={c.ledgerTitle}>
          <Waiting title={c.ledgerUnreadTitle} body={c.ledgerUnreadBody} />
        </Panel>
      )}

      <Panel title={c.walletsTitle} hint={narrowed ? c.matchingFilter : c.newestForty}>
        <ui.StatRow>
          <ui.Stat
            label={c.settled}
            value={money(totals.balanceMinor)}
            hint={narrowed ? c.settledHintNarrowed : c.settledHint}
          />
          <ui.Stat
            label={c.heldPending}
            value={money(totals.heldMinor)}
            hint={c.heldPendingHint}
            tone={totals.heldMinor === 0 ? "neutral" : "warning"}
          />
          <ui.Stat label={c.walletsTitle} value={String(totals.walletCount)} hint={narrowed ? c.matchingFilter : c.newestForty} />
        </ui.StatRow>
        {wallets.length === 0 ? (
          narrowed ? null : (
            <div className="mt-sm">
              <CalmNote
                title={c.walletsNoneTitle}
                fills={c.walletsNoneFills}
                creates={c.walletsNoneCreates}
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
                    {wallet.ownerName ?? c.noDisplayName}
                    <PersonTier tier={tiers[wallet.userId]} />
                  </span>
                  {/* The owner's profile id, printed whole: it is what an
                      operator pastes into the search box above. */}
                  <span className="nf-md-ref">{wallet.userId}</span>
                </span>
                <span className="flex shrink-0 items-baseline gap-md">
                  {wallet.heldMinor > 0 && (
                    <span className="text-[length:var(--nf-text-overline)] text-[var(--nf-content-muted)]">
                      {fill(c.held, { amount: money(wallet.heldMinor) })}
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
        <Panel title={c.disputesTitle}>
          <p className="max-w-[62ch] text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-secondary)]">
            {c.disputesBody}{" "}
            <Link href="/admin/escrow" className="underline">
              {t.admin.shell.nav.escrow}
            </Link>
            .
          </p>
          <ul className="mt-xs">
            {disputes.data.disputes.map((dispute) => (
              <li key={dispute.id} className="border-t border-[var(--nf-border-subtle)] py-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-x-md gap-y-2xs">
                  <span className="min-w-0">
                    <span className="block text-[length:var(--nf-text-body-sm)] text-[var(--nf-content-primary)]">
                      {dispute.listingTitle ?? c.listingGone}
                      {" · "}
                      {fill(c.disputeLine, { payer: dispute.payerName ?? c.thePayer, payee: dispute.payeeName ?? c.thePayee })}
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

const RENT_TONE: Record<RentChargeState, "success" | "warning" | "danger" | "info"> = {
  awaiting: "warning",
  paid: "success",
  cancelled: "danger",
  no_show: "danger",
  check: "info",
};

/** A tenancy charge's state in words: the desk's own four, and the console's word for cancelled. */
function rentStateWord(state: RentChargeState, t: Dictionary): string {
  return state === "cancelled" ? t.admin.common.status.CANCELLED : t.admin.money.rentState[state];
}

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
  const t = getDictionary(locale);
  const c = t.admin.money;
  if (!rent) {
    return (
      <Panel title={c.rentTitle}>
        <Waiting title={c.rentUnreadTitle} body={c.rentUnreadBody} />
      </Panel>
    );
  }
  const period: Record<string, string> = c.rentPeriod;
  const b = rent.byState;
  const money = (minor: number, currency?: string) => formatMoney(minor, locale, currency);
  return (
    <Panel
      title={c.rentTitle}
      hint={plural(rent.total, rent.complete ? c.rentHint : c.rentHintPartial, locale)}
    >
      <StatusBar
        locale={locale}
        label={c.rentByState}
        segments={[
          { key: "awaiting", label: c.rentState.awaiting, count: b.awaiting, tone: "pending" },
          { key: "paid", label: c.rentState.paid, count: b.paid, tone: "good" },
          { key: "ended", label: c.rentEnded, count: b.cancelled + b.no_show, tone: "bad" },
          { key: "check", label: c.rentState.check, count: b.check, tone: "info" },
        ]}
      />
      <dl className="nf-md-sum mt-md">
        <div className="nf-md-sum__row">
          <dt>{c.rentState.paid}</dt>
          <dd className="nf-md-sum__figure nf-numeric">{money(rent.paidMinor)}</dd>
        </div>
        <div className="nf-md-sum__row">
          <dt>{c.rentState.awaiting}</dt>
          <dd className="nf-md-sum__figure nf-numeric">{money(rent.awaitingMinor)}</dd>
        </div>
      </dl>
      <table className="nf-md-table mt-md">
        <caption className="sr-only">{c.rentCaption}</caption>
        <thead>
          <tr>
            <th scope="col">{c.opened}</th>
            <th scope="col">{c.tenancy}</th>
            <th scope="col">{c.moveIn}</th>
            <th scope="col" className="nf-md-num">
              {c.total}
            </th>
            <th scope="col">{c.state}</th>
          </tr>
        </thead>
        <tbody>
          {rent.latest.length === 0 ? (
            <TableNote
              columns={5}
              note={{
                title: c.rentNoneTitle,
                fills: c.rentNoneFills,
                creates: c.rentNoneCreates,
                action: { href: "/admin/bookings", label: c.openBookings },
              }}
            />
          ) : (
            rent.latest.map((row) => (
              <tr key={row.id}>
                <td className="nf-md-date" data-label={c.opened}>
                  {ui.day(row.createdAt)}
                </td>
                <td className="nf-md-desc" data-label={c.tenancy}>
                  <span className="block min-w-0">
                    <span className="block">
                      {row.listingTitle ?? c.listingGone}
                      {row.tenantName ? ` · ${row.tenantName}` : ""}
                      {row.tenantId ? <PersonTier tier={tiers[row.tenantId]} /> : null}
                    </span>
                    <span className="nf-md-ref">{row.bookingId}</span>
                  </span>
                </td>
                <td data-label={c.moveIn}>
                  {ui.day(`${row.moveIn}T12:00:00Z`)} · {period[row.rentPeriod] ?? row.rentPeriod}
                </td>
                <td className="nf-md-num nf-md-strong" data-label={c.total}>
                  {money(row.totalMinor, row.currency)}
                </td>
                <td data-label={c.state}>
                  <ui.StatusChip label={rentStateWord(row.state, t)} tone={RENT_TONE[row.state]} />
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
  const c = getDictionary(locale).admin.money;
  const series: Series[] = [
    { name: c.moneyIn, values: flow ? flow.months.map((m) => m.inMinor) : [], rank: 0, area: true },
    { name: c.moneyOut, values: flow ? flow.months.map((m) => m.outMinor) : [], rank: 1, area: true, dash: "6 4" },
  ];
  const legend = <SeriesLegend series={series} />;

  if (!flow) {
    return (
      <Panel title={c.flowTitle} aside={legend}>
        <Waiting title={c.ledgerUnreadTitle} body={c.flowUnreadBody} />
      </Panel>
    );
  }
  if (flow.months.length < 2) {
    return (
      <Panel title={c.flowTitle} aside={legend}>
        <EmptyChart
          height={200}
          yLabels={[formatMoney(0, locale), "", "", "", ""]}
          xLabels={lastMonths(now, 12).map((m) => monthLabel(m, locale))}
          note={{
            title:
              flow.months.length === 0
                ? c.flowNoneTitle
                : fill(c.flowOneMonth, { month: monthLabel(flow.months[0]!.month, locale, true) }),
            fills: c.flowFills,
            creates: c.flowCreates,
            action: { href: "/admin/payments", label: c.openPayments },
          }}
        />
      </Panel>
    );
  }

  return (
    <Panel title={c.flowTitle} aside={legend}>
      <SeriesChart
        locale={locale}
        id="money-flow"
        xLabels={flow.months.map((m) => monthLabel(m.month, locale))}
        series={series}
        label={c.flowLabel}
        yLabel={(v) => formatMoney(v, locale, "NGN", { compact: true })}
        readout={flow.months.map((m) => ({
          title: monthLabel(m.month, locale, true),
          rows: [
            { label: c.moneyIn, value: formatMoney(m.inMinor, locale) },
            { label: c.moneyOut, value: formatMoney(m.outMinor, locale) },
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
  const c = getDictionary(locale).admin.money;
  const foot = !showBalance && ledger.total > 0 ? c.ledgerFoot : undefined;
  return (
    <Panel title={c.ledgerTitle} foot={foot}>
      {ledger.total === 0 ? (
        narrowed ? null : (
          <table className="nf-md-table">
            <thead>
              <tr>
                <th scope="col">{c.date}</th>
                <th scope="col">{c.description}</th>
                <th scope="col">{c.type}</th>
                <th scope="col" className="nf-md-num">{c.amount}</th>
                <th scope="col" className="nf-md-num">{c.balance}</th>
              </tr>
            </thead>
            <tbody>
              <TableNote
                columns={5}
                note={{
                  title: c.ledgerNoneTitle,
                  fills: c.ledgerNoneFills,
                  creates: c.ledgerNoneCreates,
                  action: { href: "/admin/payments", label: c.openPayments },
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
                <th scope="col">{c.date}</th>
                <th scope="col">{c.description}</th>
                <th scope="col">{c.type}</th>
                <th scope="col" className="nf-md-num">
                  {c.amount}
                </th>
                {showBalance && (
                  <th scope="col" className="nf-md-num">
                    {c.balance}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {ledger.rows.map((row) => (
                <tr key={row.id}>
                  <td className="nf-md-date" data-label={c.date}>
                    {ui.day(row.createdAt)}
                  </td>
                  <td className="nf-md-desc" data-label={c.description}>
                    <span className="block min-w-0">
                      <span className="flex flex-wrap items-center justify-end gap-xs md:justify-start">
                        {row.note ?? ui.columnLabel("walletEntryKind", row.kind)}
                        {row.ownerName ? ` · ${row.ownerName}` : ""}
                        {row.ownerId ? <PersonTier tier={tiers[row.ownerId]} /> : null}
                        {row.status !== "COMPLETED" && (
                          <ui.StatusChip label={ui.columnLabel("walletEntryStatus", row.status)} status={row.status} />
                        )}
                      </span>
                      {/* The reference, never clipped: it is what a payment is traced by. */}
                      <span className="nf-md-ref">{row.reference}</span>
                    </span>
                  </td>
                  <td data-label={c.type} className={row.direction === "credit" ? "nf-md-credit" : "nf-md-debit"}>
                    {row.direction === "credit" ? c.credit : c.debit}
                  </td>
                  <td className="nf-md-num nf-md-strong" data-label={c.amount}>
                    {formatMoney(row.amountMinor, locale)}
                  </td>
                  {showBalance && (
                    <td className="nf-md-num nf-md-strong" data-label={c.balance}>
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
            noun={c.entries}
            locale={locale}
          />
        </>
      )}
    </Panel>
  );
}
