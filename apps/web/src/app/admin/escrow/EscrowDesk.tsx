import Link from "next/link";
import { Fragment } from "react";
import { formatMoney, type Locale } from "@vallo/i18n";
import type { AdminRead } from "@/lib/admin/queries";
import type { EscrowConsole, EscrowView } from "@/lib/admin/money-queries";
import { QUEUE_PAGE_SIZE } from "@/lib/admin/queue-filter";
import { Constants } from "@/lib/supabase/database.types";
import { ESCROW_STATE_WORDS } from "@/components/app/untranslated";
import { StatusPill, type StatusTone } from "@/components/ui/StatusPill";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { AdminUi } from "../_components/ui";
import type { AdminCommon } from "../_components/copy";
import {
  QueueFilters,
  QueuePager,
  queueNarrowed,
  type QueueQuery,
  type QueueStatusOption,
} from "../_components/QueueFilters";
import { EscrowRuling } from "../_components/MoneyDecisions";
import { DeskHead, Panel, Waiting } from "../money/_desk/Desk";
import { Donut } from "../money/_desk/charts";
import { ReconciliationPanel } from "../money/_desk/Reconciliation";
import { countdown, pipelineFromWhole, wholeDays } from "../money/_desk/derive";
import type { EscrowEvent, EscrowPipeline, EscrowState, ReconciliationHealth } from "../money/_desk/contracts";

const PURPOSE_LABEL: Record<string, string> = {
  rent_deposit: "Rent deposit",
  first_rent: "First rent",
  purchase_deposit: "Purchase deposit",
  purchase_balance: "Purchase balance",
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
};

/* Staged in `components/app/untranslated.ts`; the destination is
   `t.admin.escrow.state.<VALUE>`. */
const STATE_LABEL = ESCROW_STATE_WORDS;

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
  return Constants.public.Enums.escrow_state.map((value) => ({
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
 * The escrow desk as a function of its reads. The page reads; this draws.
 * See the page for where every figure comes from.
 */
export function EscrowDesk({
  locale,
  ui,
  common,
  query,
  read,
  everything,
  pagedStageCounts,
  health,
  now,
}: {
  locale: Locale;
  ui: AdminUi;
  common: AdminCommon;
  query: QueueQuery;
  read: EscrowConsole;
  everything: AdminRead<EscrowConsole>;
  /** Per-state counts from each state's own page, used when `everything` is not whole. */
  pagedStageCounts: Record<string, string> | null;
  health: ReconciliationHealth | null;
  now: number;
}) {
  const { disputes, open, settled, totals, full } = read;
  const shown = disputes.length + open.length + settled.length;
  const narrowed = queueNarrowed(query) || (query.offset ?? 0) > 0;

  /* Whole only when the unfiltered first page is not full. */
  const allRows =
    everything.state === "ok" && !everything.data.full
      ? [...everything.data.disputes, ...everything.data.open, ...everything.data.settled]
      : null;
  const pipeline: EscrowPipeline | null = allRows ? pipelineFromWhole(allRows) : null;
  const stageCounts = pipeline
    ? Object.fromEntries(STAGES.map((s) => [s.state, String(pipeline.byState[s.state].count)]))
    : (pagedStageCounts ?? {});

  const liveRows = [...disputes, ...open];

  return (
    <div className="nf-console nf-md">
      <EscrowHead />

      <nav className="nf-md-pipeline" aria-label="Escrows by state">
        {STAGES.map((stage, i) => (
          <Fragment key={stage.state}>
            {i > 0 && (
              <span className="nf-md-stage__arrow" aria-hidden="true">
                <UiIcon name="arrow-right" size={16} />
              </span>
            )}
            <Link
              href={query.status === stage.state ? "/admin/escrow" : `/admin/escrow?status=${stage.state}`}
              className={`nf-md-card nf-md-stage nf-md-kpi ${stage.state === "DISPUTED" && stageCounts[stage.state] !== "0" ? "nf-md-stage--alarm" : ""}`}
              aria-current={query.status === stage.state ? "true" : undefined}
            >
              <span className="nf-md-stage__label">{stage.label}</span>
              <span className="nf-md-stage__count">{stageCounts[stage.state] ?? "?"}</span>
            </Link>
          </Fragment>
        ))}
      </nav>

      <QueueFilters
        base="/admin/escrow"
        query={query}
        common={common}
        statuses={statusFilters()}
        searchPlaceholder="Search by property"
      />

      {narrowed && shown === 0 && (
        /* A SEARCH THAT MATCHED NOTHING IS NOT A CLEARANCE. */
        <ui.QueueEmpty title={common.noMatchTitle} body={common.noMatchBody} state="no-match" />
      )}

      {disputes.length > 0 && (
        <Panel
          title="Waiting on a ruling"
          hint="Until somebody rules, neither person can have the money"
        >
          <ul className="nf-md-stack">
            {disputes.map((escrow) => (
              <li key={escrow.id}>
                <EscrowCard escrow={escrow} ui={ui} locale={locale} rulable />
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="nf-md-grid nf-md-grid--main">
        <Panel
          title={query.status ? `Escrows: ${STATE_LABEL[query.status as EscrowState] ?? query.status}` : "Live escrows"}
          hint={shown > 0 ? `${shown} on this page` : undefined}
        >
          {(query.status ? [...liveRows, ...settled] : liveRows).length === 0 ? (
            narrowed ? null : (
              <p className="nf-md-empty">The platform is not holding anybody&apos;s money.</p>
            )
          ) : (
            <EscrowTable rows={query.status ? [...liveRows, ...settled] : liveRows} now={now} locale={locale} ui={ui} />
          )}
          <QueuePager base="/admin/escrow" query={query} pageSize={QUEUE_PAGE_SIZE} full={full} count={shown} />
        </Panel>

        <div className="nf-md-stack">
          <Panel title="Float total">
            <p className="nf-md-figure">{formatMoney(totals.heldMinor, locale)}</p>
            <p className="nf-md-panel__foot">
              Held, awaiting release or disputed, across every escrow. {totals.openCount} still running.
            </p>
          </Panel>
          <ReconciliationPanel health={health} now={now} when={ui.when} variant="check" />
        </div>
      </div>

      {!query.status && settled.length > 0 && (
        <Panel title="Recently settled">
          <EscrowTable rows={settled} now={now} locale={locale} ui={ui} />
        </Panel>
      )}

      <div className="nf-md-grid nf-md-grid--halves">
        <Panel title="Escrow by purpose">
          {pipeline ? (
            pipeline.total === 0 ? (
              <p className="nf-md-empty">No escrow has been opened yet.</p>
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
            )
          ) : (
            <Waiting
              title="Not connected yet"
              body="How many escrows are rent deposits, first rent, purchase deposits and purchase balances. There are more escrows than this desk can read in one go, so the split waits for a platform-wide count."
            />
          )}
        </Panel>
        <Panel title="Recent activity">
          {pipeline ? (
            pipeline.recent.length === 0 ? (
              <p className="nf-md-empty">Nothing has happened to an escrow yet.</p>
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
            )
          ) : (
            <Waiting
              title="Not connected yet"
              body="The newest escrow movements across the platform: opened, funded, held, released, refunded, disputed and ruled on. There are more escrows than this desk can read in one go, so the list waits for a platform-wide read."
            />
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
}: {
  rows: EscrowView[];
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
        {rows.map((escrow) => {
          const held = wholeDays(escrow.heldAt, now);
          const release = countdown(escrow.autoReleaseAt, now);
          const live = ["FUNDED", "HELD", "RELEASE_REQUESTED", "INITIATED"].includes(escrow.state);
          return (
            <tr key={escrow.id}>
              <td className="nf-md-lead" data-label="">
                <span className="nf-md-cell-row">
                  <span className="nf-md-thumb" aria-hidden="true">
                    <BrandIcon name="shield-home" size={30} />
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
                {escrow.payerName ?? "Payer"} <span aria-hidden="true">&rarr;</span>
                <span className="sr-only"> to </span> {escrow.payeeName ?? "payee"}
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
}: {
  escrow: EscrowView;
  ui: AdminUi;
  locale: Locale;
  rulable?: boolean;
}) {
  return (
    <article className="nf-md-card nf-md-panel">
      <div className="flex flex-wrap items-center gap-inline">
        <ui.StatusChip label={STATE_LABEL[escrow.state] ?? escrow.state} tone={STATE_TONE[escrow.state] ?? "neutral"} />
        <span className="nf-numeric nf-h4">{formatMoney(escrow.amountMinor, locale)}</span>
        <span className="nf-body-sm text-content-2">{PURPOSE_LABEL[escrow.purpose] ?? escrow.purpose}</span>
        <span className="nf-caption ml-auto">{ui.when(escrow.createdAt)}</span>
      </div>

      <dl className="mt-row">
        <ui.DetailRow label="Payer" value={escrow.payerName} />
        <ui.DetailRow label="Payee" value={escrow.payeeName} />
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
