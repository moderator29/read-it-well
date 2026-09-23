import Link from "next/link";
import { LiveRefresh } from "../_components/LiveRefresh";
import { Fragment } from "react";
import { formatDate, formatMoney, type Locale } from "@vallo/i18n";
import type { EscrowView } from "@/lib/admin/money-queries";
import type { EscrowDesk as EscrowDeskData, EvidenceItem, FloatHistory } from "@/lib/admin/reads/escrow";
import { ESCROW_STATE_WORDS } from "@/components/app/untranslated";
import { StatusPill, type StatusTone } from "@/components/ui/StatusPill";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { AdminUi } from "../_components/ui";
import type { AdminCommon } from "../_components/copy";
import {
  QueueFilters,
  queueNarrowed,
  type QueueQuery,
  type QueueStatusOption,
} from "../_components/QueueFilters";
import { EscrowRuling } from "../_components/MoneyDecisions";
import { CalmNote, DeskHead, EmptyChart, Framed, NumberedPager, Panel, TableNote, Waiting, type CalmNoteProps } from "../money/_desk/Desk";
import { DisputeEvidence } from "../money/_desk/Evidence";
import { BadgeSlot } from "../money/_desk/BadgeSlot";
import type { BadgeTier } from "@/lib/admin/reads/badges";
import type { EscrowDeskRow } from "@/lib/admin/reads/escrow";
import { Donut, SeriesChart, SeriesLegend, type Series } from "../money/_desk/charts";
import { ReconciliationPanel } from "../money/_desk/Reconciliation";
import { ESCROW_STATES, countdown, wholeDays } from "@/lib/admin/reads/money-derive";
import type { EscrowEvent, EscrowState, ReconciliationHealth } from "@/lib/admin/reads/money-types";

const PURPOSE_LABEL: Record<string, string> = {
  rent_deposit: "Rent deposit",
  first_rent: "First rent",
  purchase_deposit: "Purchase deposit",
  purchase_balance: "Purchase balance",
  agency_fee: "Agency fee",
};

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

/* Staged in `components/app/untranslated.ts`; the destination is
   `t.admin.escrow.state.<VALUE>`. */
/* The live schema has CANCELLED; the staged words and the generated types do
   not yet, so it is named here rather than printed as the raw column. */
const STATE_LABEL: Record<string, string> = { ...ESCROW_STATE_WORDS, CANCELLED: "Cancelled" };

/** The six stages the render draws, in the order money moves through them. */
export const STAGES: { state: EscrowState; label: string }[] = [
  { state: "FUNDED", label: "Funded" },
  { state: "HELD", label: "Held" },
  { state: "RELEASE_REQUESTED", label: "Release requested" },
  { state: "RELEASED", label: "Released" },
  { state: "REFUNDED", label: "Refunded" },
  { state: "DISPUTED", label: "Disputed" },
];

const EVENT_WORD: Record<EscrowEvent, string> = {
  opened: "opened",
  funded: "funded",
  held: "held",
  release_requested: "release requested",
  released: "released",
  refunded: "refunded",
  disputed: "disputed",
  resolved: "ruled on",
};

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

function statusFilters(): readonly QueueStatusOption[] {
  return ESCROW_STATES.map((value) => ({
    value,
    label: STATE_LABEL[value] ?? value,
  }));
}

/** The render's short id, from the row's own uuid. The full id rides in the title. */
function shortId(id: string): string {
  return `ES-${id.slice(0, 8).toUpperCase()}`;
}

export function EscrowHead() {
  return <DeskHead title="Escrow" lede="Secure transactions. Fair outcomes." />;
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
      <EscrowHead />

      <nav className="nf-md-pipeline" aria-label="Escrows by state">
        {STAGES.map((stage, i) => {
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
        <p className="nf-md-panel__hint">
          There are more escrows than this desk reads in one pass, so these counts are at least these numbers.
        </p>
      )}

      <QueueFilters
        base="/admin/escrow"
        query={query}
        common={common}
        statuses={statusFilters()}
        searchPlaceholder="Search by property"
      />

      {disputes.length > 0 && (
        <Panel title="Waiting on a ruling" hint="Until somebody rules, neither person can have the money">
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
          title={status ? `Escrows: ${STATE_LABEL[status]}` : "Live escrows"}
          hint={table.total > 0 ? `${table.total} ${table.total === 1 ? "escrow" : "escrows"}` : undefined}
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
                  title: "The platform is not holding anybody's money",
                  fills: "Every escrow still running, with days held and the time left before it releases on its own.",
                  creates:
                    status
                      ? "Escrows in this state appear here as they reach it."
                      : "A tenant or buyer funding a rent deposit, first rent or purchase opens one.",
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
                noun="escrows"
              />
            </>
          )}
        </Panel>

        <div className="nf-md-stack">
          <Panel title="Float total">
            <p className="nf-md-figure">{formatMoney(desk.heldMinor, locale)}</p>
            <p className="nf-md-panel__foot">
              Held, awaiting release or disputed, across every escrow. {desk.openCount} still running.
            </p>
          </Panel>
          <ReconciliationPanel health={health} now={now} when={ui.when} variant="check" />
        </div>
      </div>

      <FloatHistoryPanel float={float} locale={locale} ui={ui} />

      <div className="nf-md-grid nf-md-grid--halves">
        <Panel title="Escrow by purpose">
          {pipeline.total === 0 ? (
            <Framed
              frame={
                <Donut
                  label="Escrows by purpose"
                  totalLabel="Total"
                  totalValue="0"
                  slices={Object.keys(pipeline.byPurpose).map((purpose) => ({
                    label: PURPOSE_LABEL[purpose] ?? purpose,
                    count: 0,
                  }))}
                />
              }
            >
              <CalmNote
                title="No escrow has been opened yet"
                fills="How the platform's escrows split between rent deposits, first rent and purchase money."
                creates="Each escrow a tenant or buyer funds is counted under its purpose."
              />
            </Framed>
          ) : (
            <Donut
              label="Escrows by purpose"
              totalLabel="Total"
              totalValue={String(pipeline.total)}
              slices={Object.entries(pipeline.byPurpose).map(([purpose, v]) => ({
                label: PURPOSE_LABEL[purpose] ?? purpose,
                count: v.count,
              }))}
            />
          )}
        </Panel>
        <Panel title="Recent activity">
          {pipeline.recent.length === 0 ? (
            <CalmNote
              title="Nothing has happened to an escrow yet"
              fills="The newest movements across every escrow: funded, held, release asked for, released, refunded, disputed and ruled on."
              creates="Each step a payer, a payee, the auto release or a ruling takes is listed as it happens."
            />
          ) : (
            <ol className="nf-md-timeline">
              {pipeline.recent.map((event) => (
                <li key={`${event.escrowId}-${event.event}`} className="nf-md-event">
                  <span className={`nf-md-event__dot ${EVENT_DOT[event.event]}`} aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="nf-md-event__what block">
                      <span title={event.escrowId}>{shortId(event.escrowId)}</span> {EVENT_WORD[event.event]}
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
  return (
    <table className="nf-md-table">
      <thead>
        <tr>
          <th scope="col">ID</th>
          <th scope="col">Amount</th>
          <th scope="col">From &rarr; To</th>
          <th scope="col">Purpose</th>
          <th scope="col" className="nf-md-num">
            Days held
          </th>
          <th scope="col" className="nf-md-num">
            Auto release
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
                      {escrow.listingTitle ?? "A listing that is no longer there"}
                    </span>
                  </span>
                </span>
              </td>
              <td className="nf-md-strong nf-numeric" data-label="Amount">
                {formatMoney(escrow.amountMinor, locale)}
              </td>
              <td className="nf-md-desc" data-label="From, to">
                {escrow.payerName ?? "Payer"}
                {escrow.payerId ? <BadgeSlot tier={tiers[escrow.payerId]} /> : null}{" "}
                <span aria-hidden="true">&rarr;</span>
                <span className="sr-only"> to </span> {escrow.payeeName ?? "payee"}
                {escrow.payeeId ? <BadgeSlot tier={tiers[escrow.payeeId]} /> : null}
              </td>
              <td className="nf-md-desc" data-label="Purpose">
                {PURPOSE_LABEL[escrow.purpose] ?? escrow.purpose}
              </td>
              <td className="nf-md-num" data-label="Days held">
                {held === null ? "Not held yet" : held}
              </td>
              <td className="nf-md-num" data-label="Auto release">
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
  return (
    <article className="nf-panel nf-md-card nf-md-panel">
      <div className="flex flex-wrap items-center gap-inline">
        <ui.StatusChip label={STATE_LABEL[escrow.state] ?? escrow.state} tone={STATE_TONE[escrow.state] ?? "neutral"} />
        <span className="nf-numeric nf-h4">{formatMoney(escrow.amountMinor, locale)}</span>
        <span className="nf-body-sm text-content-2">{PURPOSE_LABEL[escrow.purpose] ?? escrow.purpose}</span>
        <span className="nf-caption ml-auto">{ui.when(escrow.createdAt)}</span>
      </div>

      <dl className="mt-row">
        <ui.DetailRow
          label="Payer"
          value={
            <span>
              {escrow.payerName ?? "No display name"}
              {escrow.payerId ? <BadgeSlot tier={tiers[escrow.payerId]} /> : null}
            </span>
          }
        />
        <ui.DetailRow
          label="Payee"
          value={
            <span>
              {escrow.payeeName ?? "No display name"}
              {escrow.payeeId ? <BadgeSlot tier={tiers[escrow.payeeId]} /> : null}
            </span>
          }
        />
        {escrow.listingTitle && <ui.DetailRow label="Property" value={escrow.listingTitle} />}
        <ui.DetailRow
          label="Confirmations"
          value={
            <span>
              {escrow.payerConfirmed ? "Payer has confirmed" : "Payer has not confirmed"}
              {escrow.fromInspection ? " (from a confirmed inspection)" : ""}
              {" · "}
              {escrow.payeeConfirmed ? "Payee has confirmed" : "Payee has not confirmed"}
            </span>
          }
        />
        {escrow.autoReleaseAt && (
          <ui.DetailRow label="Releases on its own" value={`${ui.when(escrow.autoReleaseAt)} if nobody acts`} />
        )}
        {escrow.disputeReason && <ui.DetailRow label="The objection" value={escrow.disputeReason} />}
        {escrow.resolutionNote && <ui.DetailRow label="The ruling" value={escrow.resolutionNote} />}
        {escrow.commissionMinor !== null && (
          <ui.DetailRow
            label="Platform share"
            value={escrow.commissionMinor === 0 ? "No fee" : formatMoney(escrow.commissionMinor, locale)}
          />
        )}
        {escrow.settledAt && <ui.DetailRow label="Settled" value={ui.when(escrow.settledAt)} />}
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
  const series: Series[] = [
    { name: "Escrow float", values: float ? float.points.map((p) => p.floatMinor) : [], rank: 0, area: true },
    { name: "Ledger float", values: float ? float.points.map((p) => p.ledgerFloatMinor) : [], rank: 1, dash: "6 4" },
  ];
  const legend = <SeriesLegend series={series} />;
  const title = "Float, booked daily";
  if (!float) {
    return (
      <Panel title={title} aside={legend}>
        <Waiting
          title="The float history could not be read"
          body="The escrow float booked each day against what the ledger books, and whether the two agree. The read did not answer just now; reload in a moment."
        />
      </Panel>
    );
  }
  const latest = float.points[float.points.length - 1] ?? null;
  const verdict = latest ? (
    <p className="nf-md-invariant">
      <ui.StatusChip
        label={latest.differenceMinor === 0 ? "Balanced" : "Does not balance"}
        tone={latest.differenceMinor === 0 ? "success" : "danger"}
      />
      <span>
        {latest.differenceMinor === 0
          ? `On ${dayLabel(latest.asOf, locale, true)} the escrow float, ${formatMoney(latest.floatMinor, locale)}, equals what the ledger books.`
          : `On ${dayLabel(latest.asOf, locale, true)} the escrow float and the ledger differ by ${formatMoney(Math.abs(latest.differenceMinor), locale)}.`}{" "}
        {float.points.length - float.unbalancedDays} of {float.points.length}{" "}
        {float.points.length === 1 ? "day" : "days"} balanced
        {float.lastUnbalanced ? `; last off on ${dayLabel(float.lastUnbalanced, locale, true)}` : ""}.
      </span>
    </p>
  ) : null;

  if (float.points.length < 2) {
    const xs = float.points.map((p) => dayLabel(p.asOf, locale));
    return (
      <Panel title={title} aside={legend} hint={`${float.total} ${float.total === 1 ? "day" : "days"} booked`}>
        <EmptyChart
          height={180}
          yLabels={["₦0", "", "", "", ""]}
          xLabels={xs.length ? xs : ["", "", "", "", ""]}
          note={{
            title: latest ? `One day booked so far (${dayLabel(latest.asOf, locale, true)})` : "The float has not been booked yet",
            fills: "The money held in escrow, booked once a day, beside the float the ledger books, so a gap between them shows the day it opens.",
            creates: "A daily job books the float each morning. A line needs a second day, so none is drawn.",
          }}
        />
        {verdict}
      </Panel>
    );
  }
  return (
    <Panel title={title} aside={legend} hint={`${float.total} days booked`}>
      <SeriesChart
        id="escrow-float"
        xLabels={float.points.map((p) => dayLabel(p.asOf, locale))}
        series={series}
        height={200}
        label="The escrow float booked each day against the ledger float"
        yLabel={(v) => formatMoney(v, locale, "NGN", { compact: true })}
        readout={float.points.map((p) => ({
          title: dayLabel(p.asOf, locale, true),
          rows: [
            { label: "Escrow float", value: formatMoney(p.floatMinor, locale) },
            { label: "Ledger float", value: formatMoney(p.ledgerFloatMinor, locale) },
            { label: "Difference", value: formatMoney(p.differenceMinor, locale) },
            { label: "Escrows", value: String(p.escrowCount) },
          ],
        }))}
      />
      {verdict}
    </Panel>
  );
}
