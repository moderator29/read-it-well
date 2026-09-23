import Link from "next/link";
import { LiveRefresh } from "../_components/LiveRefresh";
import { Fragment } from "react";
import { formatDate, formatMoney, getDictionary, plural, type Dictionary, type Locale } from "@vallo/i18n";
import type { EscrowView } from "@/lib/admin/money-queries";
import type { EscrowDesk as EscrowDeskData, EvidenceItem, FloatHistory } from "@/lib/admin/reads/escrow";
import { StatusPill, type StatusTone } from "@/components/ui/StatusPill";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { AdminUi } from "../_components/ui";
import { fill, type AdminCommon } from "../_components/copy";
import {
  QueueFilters,
  queueNarrowed,
  type QueueQuery,
  type QueueStatusOption,
} from "../_components/QueueFilters";
import { EscrowRuling } from "../_components/MoneyDecisions";
import { CalmNote, DeskHead, EmptyChart, Framed, NumberedPager, Panel, TableNote, Waiting, type CalmNoteProps } from "../money/_desk/Desk";
import { DisputeEvidence } from "../money/_desk/Evidence";
import { PersonTier } from "@/app/admin/_components/PersonTier";
import type { BadgeTier } from "@/lib/admin/reads/badges";
import type { EscrowDeskRow } from "@/lib/admin/reads/escrow";
import { Donut, SeriesChart, SeriesLegend, type Series } from "../money/_desk/charts";
import { ReconciliationPanel } from "../money/_desk/Reconciliation";
import { ESCROW_STATES, countdown, wholeDays } from "@/lib/admin/reads/money-derive";
import type { EscrowEvent, EscrowState, ReconciliationHealth } from "@/lib/admin/reads/money-types";


/*
 * A tone per state. "warning" (cyan, pending) for everything still running,
 * because held money is not neutral information: somebody is short of it
 * until it settles. "danger" only for a dispute, the one state that needs a
 * person.
 */
const STATE_TONE: Record<string, StatusTone> = {
  INITIATED: "neutral",
  FUNDED: "warning",
  HELD: "warning",
  RELEASE_REQUESTED: "warning",
  RELEASED: "success",
  REFUNDED: "success",
  DISPUTED: "danger",
  RESOLVED: "success",
  CANCELLED: "neutral",
};

/* The state words live at `t.admin.escrow.state` (the destination the staged
   block in `components/app/untranslated.ts` names). The live schema has
   CANCELLED, which the desk words as the console's own `Cancelled`. */
function stateLabels(t: Dictionary): Record<string, string> {
  return { ...t.admin.escrow.state, CANCELLED: t.admin.common.status.CANCELLED };
}

/** A purpose in words, or the raw value when the live schema is ahead of the words. */
function purposeLabel(t: Dictionary, purpose: string): string {
  return (t.admin.escrow.purpose as Record<string, string>)[purpose] ?? purpose;
}

/** The six stages the render draws, in the order money moves through them. */
export const STAGES = ["FUNDED", "HELD", "RELEASE_REQUESTED", "RELEASED", "REFUNDED", "DISPUTED"] as const satisfies readonly EscrowState[];

const EVENT_DOT: Record<EscrowEvent, string> = {
  opened: "",
  funded: "",
  held: "",
  release_requested: "nf-md-event__dot--pending",
  released: "nf-md-event__dot--good",
  refunded: "",
  disputed: "nf-md-event__dot--bad",
  resolved: "nf-md-event__dot--good",
};

function statusFilters(labels: Record<string, string>): readonly QueueStatusOption[] {
  return ESCROW_STATES.map((value) => ({
    value,
    label: labels[value] ?? value,
  }));
}

/** The render's short id, from the row's own uuid. The full id rides in the title. */
function shortId(id: string): string {
  return `ES-${id.slice(0, 8).toUpperCase()}`;
}

export function EscrowHead({ locale = "en" }: { locale?: Locale } = {}) {
  const t = getDictionary(locale);
  return <DeskHead title={t.admin.shell.nav.escrow} lede={t.admin.escrow.lede} />;
}

/**
 * The escrow desk as a function of its read (`getEscrowDesk` in
 * `lib/admin/reads/escrow.ts`). The page reads; this draws.
 */
export function EscrowDesk({
  locale,
  ui,
  common,
  query,
  params,
  desk,
  health,
  evidence,
  float,
  tiers = {},
  now,
}: {
  /** Badge tiers keyed by user id, from `public.person_badge`. */
  tiers?: Record<string, BadgeTier>;
  locale: Locale;
  ui: AdminUi;
  common: AdminCommon;
  query: QueueQuery;
  params: Record<string, string | undefined>;
  desk: EscrowDeskData;
  health: ReconciliationHealth | null;
  /** `getDisputeEvidence` for every dispute: null when the read failed, which is never "nothing filed". */
  evidence: Record<string, EvidenceItem[]> | null;
  /** `getEscrowFloatHistory`: null when it could not be read. */
  float: FloatHistory | null;
  now: number;
}) {
  const t = getDictionary(locale);
  const c = t.admin.escrow;
  const STATE_LABEL = stateLabels(t);
  const { pipeline, disputes, table } = desk;
  const status = query.status && STATE_LABEL[query.status] ? query.status : null;
  const narrowed = queueNarrowed(query);
  const stageHref = (state: EscrowState) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "status" && k !== "page" && k !== "offset") next.set(k, v);
    if (status !== state) next.set("status", state);
    const qs = next.toString();
    return qs ? `/admin/escrow?${qs}` : "/admin/escrow";
  };

  return (
    <div className="nf-console nf-md nf-md--escrow">
      <LiveRefresh />
      <EscrowHead locale={locale} />

      <nav className="nf-md-pipeline" aria-label={c.byState}>
        {STAGES.map((state, i) => {
          const stage = { state, label: c.stage[state] };
          const count = pipeline.byState[stage.state]?.count ?? 0;
          return (
            <Fragment key={stage.state}>
              {i > 0 && (
                <span className="nf-md-stage__arrow" aria-hidden="true">
                  <UiIcon name="arrow-right" size={16} />
                </span>
              )}
              <Link
                href={stageHref(stage.state)}
                className={`nf-panel nf-panel--card nf-md-card nf-md-stage nf-md-kpi ${stage.state === "DISPUTED" && count > 0 ? "nf-md-stage--alarm" : ""}`}
                aria-current={status === stage.state ? "true" : undefined}
              >
                <span className="nf-md-stage__label">{stage.label}</span>
                <span className="nf-md-stage__count">{count}</span>
              </Link>
            </Fragment>
          );
        })}
      </nav>
      {!desk.complete && (
        <p className="nf-md-panel__hint">{c.incomplete}</p>
      )}

      <QueueFilters
        base="/admin/escrow"
        query={query}
        common={common}
        statuses={statusFilters(STATE_LABEL)}
        searchPlaceholder={common.searchPlaceholders.escrow}
      />

      {disputes.length > 0 && (
        <Panel title={c.rulingTitle} hint={c.rulingHint}>
          <ul className="nf-md-stack">
            {disputes.map((escrow) => (
              <li key={escrow.id}>
                <EscrowCard
                  tiers={tiers}
                  escrow={escrow}
                  ui={ui}
                  locale={locale}
                  rulable
                  evidence={evidence ? (evidence[escrow.id] ?? []) : null}
                />
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="nf-md-grid nf-md-grid--main">
        <Panel
          title={status ? fill(c.tableInState, { state: STATE_LABEL[status] ?? status }) : c.tableTitle}
          hint={table.total > 0 ? plural(table.total, c.count, locale) : undefined}
        >
          {table.rows.length === 0 ? (
            narrowed ? (
              /* A SEARCH THAT MATCHED NOTHING IS NOT A CLEARANCE. */
              <ui.QueueEmpty title={common.noMatchTitle} body={common.noMatchBody} state="no-match" />
            ) : (
              <EscrowTable
                rows={[]}
                now={now}
                locale={locale}
                ui={ui}
                empty={{
                  title: c.noneTitle,
                  fills: c.noneFills,
                  creates: status ? c.noneCreatesState : c.noneCreates,
                }}
              />
            )
          ) : (
            <>
              <EscrowTable rows={table.rows} now={now} locale={locale} ui={ui} tiers={tiers} />
              <NumberedPager
                base="/admin/escrow"
                params={params}
                page={table.page}
                total={table.total}
                pageSize={table.pageSize}
                noun={c.escrows}
                locale={locale}
              />
            </>
          )}
        </Panel>

        <div className="nf-md-stack">
          <Panel title={c.floatTitle}>
            <p className="nf-md-figure">{formatMoney(desk.heldMinor, locale)}</p>
            <p className="nf-md-panel__foot">{fill(c.floatFoot, { count: desk.openCount })}</p>
          </Panel>
          <ReconciliationPanel health={health} now={now} when={ui.when} variant="check" locale={locale} />
        </div>
      </div>

      <FloatHistoryPanel float={float} locale={locale} ui={ui} />

      <div className="nf-md-grid nf-md-grid--halves">
        <Panel title={c.byPurposeTitle}>
          {pipeline.total === 0 ? (
            <Framed
              frame={
                <Donut
                  label={c.byPurposeLabel}
                  totalLabel={c.total}
                  totalValue="0"
                  slices={Object.keys(pipeline.byPurpose).map((purpose) => ({
                    label: purposeLabel(t, purpose),
                    count: 0,
                  }))}
                />
              }
            >
              <CalmNote
                title={c.byPurposeNoneTitle}
                fills={c.byPurposeNoneFills}
                creates={c.byPurposeNoneCreates}
              />
            </Framed>
          ) : (
            <Donut
              label={c.byPurposeLabel}
              totalLabel={c.total}
              totalValue={String(pipeline.total)}
              slices={Object.entries(pipeline.byPurpose).map(([purpose, v]) => ({
                label: purposeLabel(t, purpose),
                count: v.count,
              }))}
            />
          )}
        </Panel>
        <Panel title={c.recentTitle}>
          {pipeline.recent.length === 0 ? (
            <CalmNote title={c.recentNoneTitle} fills={c.recentNoneFills} creates={c.recentNoneCreates} />
          ) : (
            <ol className="nf-md-timeline">
              {pipeline.recent.map((event) => (
                <li key={`${event.escrowId}-${event.event}`} className="nf-md-event">
                  <span className={`nf-md-event__dot ${EVENT_DOT[event.event]}`} aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="nf-md-event__what block">
                      <span title={event.escrowId}>{shortId(event.escrowId)}</span> {c.event[event.event]}
                      {" · "}
                      {formatMoney(event.amountMinor, locale)}
                    </span>
                    <span className="nf-md-event__when block">{ui.when(event.at)}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  );
}


function EscrowTable({
  rows,
  now,
  locale,
  ui,
  empty,
  tiers = {},
}: {
  empty?: CalmNoteProps;
  tiers?: Record<string, BadgeTier>;
  rows: (EscrowView & Partial<Pick<EscrowDeskRow, "payerId" | "payeeId">>)[];
  now: number;
  locale: Locale;
  ui: AdminUi;
}) {
  const t = getDictionary(locale);
  const c = t.admin.escrow;
  const STATE_LABEL = stateLabels(t);
  return (
    <table className="nf-md-table">
      <thead>
        <tr>
          <th scope="col">{c.id}</th>
          <th scope="col">{c.amount}</th>
          <th scope="col">{c.fromTo}</th>
          <th scope="col">{c.purposeColumn}</th>
          <th scope="col" className="nf-md-num">
            {c.daysHeld}
          </th>
          <th scope="col" className="nf-md-num">
            {c.autoRelease}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && empty ? <TableNote columns={6} note={empty} /> : null}
        {rows.map((escrow) => {
          const held = wholeDays(escrow.heldAt, now);
          const release = countdown(escrow.autoReleaseAt, now);
          const live = ["FUNDED", "HELD", "RELEASE_REQUESTED", "INITIATED"].includes(escrow.state);
          return (
            <tr key={escrow.id}>
              <td className="nf-md-lead" data-label="">
                <span className="nf-md-cell-row">
                  <span className="nf-md-thumb" aria-hidden="true">
                    <UiIcon name="wallet" size={20} className="text-[var(--nf-brand-quiet)]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium text-[var(--nf-content-primary)]" title={escrow.id}>
                      {shortId(escrow.id)}
                    </span>
                    <span className="block truncate text-[length:var(--nf-text-caption)]">
                      {escrow.listingTitle ?? t.admin.money.listingGone}
                    </span>
                  </span>
                </span>
              </td>
              <td className="nf-md-strong nf-numeric" data-label={c.amount}>
                {formatMoney(escrow.amountMinor, locale)}
              </td>
              <td className="nf-md-desc" data-label={c.fromToLabel}>
                {escrow.payerName ?? c.payerFallback}
                {escrow.payerId ? <PersonTier tier={tiers[escrow.payerId]} /> : null}{" "}
                <span aria-hidden="true">&rarr;</span>
                <span className="sr-only">{` ${c.to} `}</span> {escrow.payeeName ?? c.payeeFallback}
                {escrow.payeeId ? <PersonTier tier={tiers[escrow.payeeId]} /> : null}
              </td>
              <td className="nf-md-desc" data-label={c.purposeColumn}>
                {purposeLabel(t, escrow.purpose)}
              </td>
              <td className="nf-md-num" data-label={c.daysHeld}>
                {held === null ? c.notHeldYet : held}
              </td>
              <td className="nf-md-num" data-label={c.autoRelease}>
                {live && release ? (
                  <span className={`nf-md-countdown ${release.due ? "nf-md-countdown--due" : ""}`} title={ui.when(escrow.autoReleaseAt)}>
                    {release.label}
                  </span>
                ) : (
                  <StatusPill tone={STATE_TONE[escrow.state] ?? "neutral"}>
                    {STATE_LABEL[escrow.state] ?? escrow.state}
                  </StatusPill>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function EscrowCard({
  escrow,
  ui,
  locale,
  rulable = false,
  evidence,
  tiers = {},
}: {
  tiers?: Record<string, BadgeTier>;
  escrow: EscrowView & Partial<Pick<EscrowDeskRow, "payerId" | "payeeId">>;
  ui: AdminUi;
  locale: Locale;
  rulable?: boolean;
  /** What is filed on this dispute; null when the evidence read failed. */
  evidence?: EvidenceItem[] | null;
}) {
  const t = getDictionary(locale);
  const c = t.admin.escrow;
  const STATE_LABEL = stateLabels(t);
  return (
    <article className="nf-panel nf-md-card nf-md-panel">
      <div className="flex flex-wrap items-center gap-inline">
        <ui.StatusChip label={STATE_LABEL[escrow.state] ?? escrow.state} tone={STATE_TONE[escrow.state] ?? "neutral"} />
        <span className="nf-numeric nf-h4">{formatMoney(escrow.amountMinor, locale)}</span>
        <span className="nf-body-sm text-content-2">{purposeLabel(t, escrow.purpose)}</span>
        <span className="nf-caption ml-auto">{ui.when(escrow.createdAt)}</span>
      </div>

      <dl className="mt-row">
        <ui.DetailRow
          label={c.payer}
          value={
            <span>
              {escrow.payerName ?? t.admin.money.noDisplayName}
              {escrow.payerId ? <PersonTier tier={tiers[escrow.payerId]} /> : null}
            </span>
          }
        />
        <ui.DetailRow
          label={c.payee}
          value={
            <span>
              {escrow.payeeName ?? t.admin.money.noDisplayName}
              {escrow.payeeId ? <PersonTier tier={tiers[escrow.payeeId]} /> : null}
            </span>
          }
        />
        {escrow.listingTitle && <ui.DetailRow label={c.property} value={escrow.listingTitle} />}
        <ui.DetailRow
          label={c.confirmations}
          value={
            <span>
              {escrow.payerConfirmed ? c.payerConfirmed : c.payerNotConfirmed}
              {escrow.fromInspection ? ` ${c.fromInspection}` : ""}
              {" · "}
              {escrow.payeeConfirmed ? c.payeeConfirmed : c.payeeNotConfirmed}
            </span>
          }
        />
        {escrow.autoReleaseAt && (
          <ui.DetailRow label={c.releasesAlone} value={fill(c.ifNobodyActs, { when: ui.when(escrow.autoReleaseAt) })} />
        )}
        {escrow.disputeReason && <ui.DetailRow label={c.objection} value={escrow.disputeReason} />}
        {escrow.resolutionNote && <ui.DetailRow label={c.ruling} value={escrow.resolutionNote} />}
        {escrow.commissionMinor !== null && (
          <ui.DetailRow
            label={c.platformShare}
            value={escrow.commissionMinor === 0 ? c.noFee : formatMoney(escrow.commissionMinor, locale)}
          />
        )}
        {escrow.settledAt && <ui.DetailRow label={c.settled} value={ui.when(escrow.settledAt)} />}
      </dl>

      {rulable && (
        <DisputeEvidence
          tiers={tiers}
          items={evidence ?? []}
          readable={evidence !== null}
          payerName={escrow.payerName}
          payeeName={escrow.payeeName}
          locale={locale}
          ui={ui}
        />
      )}

      {rulable && (
        <EscrowRuling
          escrowId={escrow.id}
          amountMinor={escrow.amountMinor}
          locale={locale}
          payerName={escrow.payerName}
          payeeName={escrow.payeeName}
        />
      )}
    </article>
  );
}

function dayLabel(asOf: string, locale: Locale, withYear = false): string {
  return formatDate(new Date(`${asOf}T12:00:00Z`), locale, {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" as const } : {}),
  });
}

/**
 * The escrow float as booked once a day (`escrow_float_snapshots`), against
 * the float the ledger books, with the invariant the table records: the
 * difference between the two, where zero is balanced.
 */
function FloatHistoryPanel({ float, locale, ui }: { float: FloatHistory | null; locale: Locale; ui: AdminUi }) {
  const c = getDictionary(locale).admin.escrow;
  const series: Series[] = [
    { name: c.escrowFloat, values: float ? float.points.map((p) => p.floatMinor) : [], rank: 0, area: true },
    { name: c.ledgerFloat, values: float ? float.points.map((p) => p.ledgerFloatMinor) : [], rank: 1, dash: "6 4" },
  ];
  const legend = <SeriesLegend series={series} />;
  const title = c.floatHistoryTitle;
  if (!float) {
    return (
      <Panel title={title} aside={legend}>
        <Waiting title={c.floatUnreadTitle} body={c.floatUnreadBody} />
      </Panel>
    );
  }
  const latest = float.points[float.points.length - 1] ?? null;
  const verdict = latest ? (
    <p className="nf-md-invariant">
      <ui.StatusChip
        label={latest.differenceMinor === 0 ? c.balanced : c.notBalanced}
        tone={latest.differenceMinor === 0 ? "success" : "danger"}
      />
      <span>
        {latest.differenceMinor === 0
          ? fill(c.balancedOn, { date: dayLabel(latest.asOf, locale, true), amount: formatMoney(latest.floatMinor, locale) })
          : fill(c.differOn, {
              date: dayLabel(latest.asOf, locale, true),
              amount: formatMoney(Math.abs(latest.differenceMinor), locale),
            })}{" "}
        {fill(plural(float.points.length, c.daysBalanced, locale), { balanced: float.points.length - float.unbalancedDays })}
        {float.lastUnbalanced ? fill(c.lastOff, { date: dayLabel(float.lastUnbalanced, locale, true) }) : ""}.
      </span>
    </p>
  ) : null;

  if (float.points.length < 2) {
    const xs = float.points.map((p) => dayLabel(p.asOf, locale));
    return (
      <Panel title={title} aside={legend} hint={plural(float.total, c.daysBooked, locale)}>
        <EmptyChart
          height={180}
          yLabels={[formatMoney(0, locale), "", "", "", ""]}
          xLabels={xs.length ? xs : ["", "", "", "", ""]}
          note={{
            title: latest ? fill(c.oneDay, { date: dayLabel(latest.asOf, locale, true) }) : c.notBooked,
            fills: c.floatFills,
            creates: c.floatCreates,
          }}
        />
        {verdict}
      </Panel>
    );
  }
  return (
    <Panel title={title} aside={legend} hint={fill(c.daysBooked.other, { count: float.total })}>
      <SeriesChart
        locale={locale}
        id="escrow-float"
        xLabels={float.points.map((p) => dayLabel(p.asOf, locale))}
        series={series}
        height={200}
        label={c.floatChartLabel}
        yLabel={(v) => formatMoney(v, locale, "NGN", { compact: true })}
        readout={float.points.map((p) => ({
          title: dayLabel(p.asOf, locale, true),
          rows: [
            { label: c.escrowFloat, value: formatMoney(p.floatMinor, locale) },
            { label: c.ledgerFloat, value: formatMoney(p.ledgerFloatMinor, locale) },
            { label: c.difference, value: formatMoney(p.differenceMinor, locale) },
            { label: c.escrowsRow, value: String(p.escrowCount) },
          ],
        }))}
      />
      {verdict}
    </Panel>
  );
}
