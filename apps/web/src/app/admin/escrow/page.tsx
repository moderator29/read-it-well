import type { Metadata } from "next";
import { formatMoney, getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getEscrowConsole, type EscrowView } from "@/lib/admin/money-queries";
import { adminUi, type AdminUi } from "../_components/ui";
import { QUEUE_PAGE_SIZE } from "@/lib/admin/queue-filter";
import {
  QueueFilters,
  QueuePager,
  queueNarrowed,
  readQueueQuery,
  type QueueStatusOption,
} from "../_components/QueueFilters";
import { Constants } from "@/lib/supabase/database.types";
import { ESCROW_STATE_WORDS } from "@/components/app/untranslated";
import type { StatusTone } from "@/components/ui/StatusPill";
import { EscrowRuling } from "../_components/MoneyDecisions";

export const metadata: Metadata = {
  title: "Escrow",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PURPOSE_LABEL: Record<string, string> = {
  rent_deposit: "Rent deposit",
  first_rent: "First rent",
  purchase_deposit: "Purchase deposit",
  purchase_balance: "Purchase balance",
};

/*
 * A tone per state, from the console's own six-value vocabulary.
 *
 * "warning" for everything still running rather than "info", because held money
 * is not neutral information: somebody is short of it until it settles.
 * "danger" only for a dispute, which is the one state that needs a person.
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

/* Staged in `components/app/untranslated.ts` with the rest of this owner's
   untranslated copy, so translating it is one job rather than a hunt. The
   destination is `t.admin.escrow.state.<VALUE>`. `STATE_TONE` above stays here:
   a tone is not copy. */
const STATE_LABEL = ESCROW_STATE_WORDS;

/**
 * The escrow console, and the dispute queue that is the point of it.
 *
 * Everything else on this page is context for the top section. A dispute is two
 * people who disagree about money the platform is holding, and until somebody
 * rules on it neither of them can have it. That is the single most acute state
 * this product can put anybody in, and it had no screen at all.
 *
 * The ruling control shows both confirmations, whether the payer's half came
 * from a real inspection, and the objection in the objector's own words, so the
 * decision is taken with the evidence in the same frame rather than after
 * clicking through to find it.
 */
/**
 * The chips, from `escrow_state` itself.
 *
 * Eight values, and the words are the ones this screen already uses for the
 * chip on each card, so the filter and the row it filters cannot disagree.
 * `STATE_LABEL` is still English, and it is staged in
 * `components/app/untranslated.ts` rather than written here.
 */
function statusFilters(): readonly QueueStatusOption[] {
  return Constants.public.Enums.escrow_state.map((value) => ({
    value,
    label: STATE_LABEL[value] ?? value,
  }));
}

export default async function AdminEscrowPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const common = t.admin.common;
  const ui = adminUi(t, locale);

  /* The shared queue frame. This desk read the newest two hundred escrows and
     printed all of them in three sections, so the two hundred and first did not
     exist for an operator and there was no way to ask for one property's. The
     stat tiles above are deliberately NOT narrowed: see `getEscrowConsole`. */
  const params = await searchParams;
  const query = readQueueQuery(params);
  const read = await getEscrowConsole({
    ...(query.q ? { q: query.q } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.from ? { from: query.from } : {}),
    ...(query.to ? { to: query.to } : {}),
    ...(query.offset ? { offset: query.offset } : {}),
  });

  if (read.state !== "ok") {
    return (
      <div className="nf-console">
        <ui.QueueHeader
          title="Escrow"
          lede="Money the platform is holding between two people."
        />
        <ui.QueueUnavailable />
      </div>
    );
  }

  const { disputes, open, settled, totals, full } = read.data;
  const shown = disputes.length + open.length + settled.length;
  const narrowed = queueNarrowed(query) || (query.offset ?? 0) > 0;

  return (
    <div className="nf-console">
      <ui.QueueHeader
        title="Escrow"
        lede="Money the platform is holding between two people. Every movement here is written to the audit log by the database, including the ones nobody took."
        count={disputes.length}
      />

      <ui.StatRow>
        <ui.Stat
          label="Held right now"
          value={formatMoney(totals.heldMinor, locale)}
          hint="Money the platform is between two people on"
          tone={totals.heldMinor === 0 ? "neutral" : "warning"}
        />
        <ui.Stat label="Open" value={String(totals.openCount)} hint="Still running" />
        <ui.Stat
          label="In dispute"
          value={String(totals.disputeCount)}
          hint={
            totals.disputeCount === 0 ? "Nobody is waiting on a ruling" : "Waiting on a person"
          }
          tone={totals.disputeCount === 0 ? "success" : "danger"}
        />
      </ui.StatRow>

      {/* Under the tiles, not above them. The tiles answer "how much are we
          holding", which is true of the whole platform and does not change when
          an operator narrows; the filter belongs with the rows it narrows. */}
      <QueueFilters
        base="/admin/escrow"
        query={query}
        common={common}
        statuses={statusFilters()}
        searchPlaceholder="Search by property"
      />

      {narrowed && shown === 0 && (
        <ui.QueueEmpty title={common.noMatchTitle} body={common.noMatchBody} />
      )}

      <ui.Section
        title="Disputes"
        hint="Two people who disagree about money the platform is holding. Until somebody rules, neither of them can have it."
      >
        {/* The per-section empty states are statements about the WHOLE desk,
            and under a filter they stop being true: "Nothing is in dispute" is
            a lie to somebody who has narrowed to RELEASED. Narrowed, the
            section simply says nothing and the one no-match panel above
            answers for the screen. */}
        {disputes.length === 0 ? (
          narrowed ? null : (
            /* The body says every escrow "either settled on its own or is
               still running", which presumes there are escrows. `escrows` holds
               zero rows today, so unqualified this is an emerald tick over a
               sentence about a table that has never been written to. The open
               and settled lists are the evidence either way. F2-056. */
            <ui.QueueEmpty
              title="Nothing is in dispute"
              body="Every escrow either settled on its own or is still running. Nobody is waiting on a ruling."
              everHadRows={open.length + settled.length > 0}
            />
          )
        ) : (
          <ul className="nf-stack nf-stack--row">
            {disputes.map((escrow) => (
              <li key={escrow.id}>
                <EscrowCard escrow={escrow} ui={ui} locale={locale} rulable />
              </li>
            ))}
          </ul>
        )}
      </ui.Section>

      <ui.Section title="Open holds">
        {open.length === 0 ? (
          narrowed ? null : (
            <p className="nf-body text-content-2">
              The platform is not holding anybody&apos;s money.
            </p>
          )
        ) : (
          <ul className="nf-stack nf-stack--row">
            {open.map((escrow) => (
              <li key={escrow.id}>
                <EscrowCard escrow={escrow} ui={ui} locale={locale} />
              </li>
            ))}
          </ul>
        )}
      </ui.Section>

      {settled.length > 0 && (
        <ui.Section title="Recently settled">
          <ul className="nf-stack nf-stack--row">
            {settled.map((escrow) => (
              <li key={escrow.id}>
                <EscrowCard escrow={escrow} ui={ui} locale={locale} />
              </li>
            ))}
          </ul>
        </ui.Section>
      )}

      <QueuePager
        base="/admin/escrow"
        query={query}
        pageSize={QUEUE_PAGE_SIZE}
        full={full}
        count={shown}
      />
    </div>
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
  locale: Awaited<ReturnType<typeof getLocale>>;
  rulable?: boolean;
}) {
  return (
    <article className="nf-card p-card">
      <div className="flex flex-wrap items-center gap-inline">
        <ui.StatusChip
          label={STATE_LABEL[escrow.state] ?? escrow.state}
          tone={STATE_TONE[escrow.state] ?? "neutral"}
        />
        <span className="nf-numeric nf-h4">{formatMoney(escrow.amountMinor, locale)}</span>
        <span className="nf-body-sm text-content-2">
          {PURPOSE_LABEL[escrow.purpose] ?? escrow.purpose}
        </span>
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
          <ui.DetailRow
            label="Releases on its own"
            value={`${ui.when(escrow.autoReleaseAt)} if nobody acts`}
          />
        )}
        {escrow.disputeReason && (
          <ui.DetailRow label="The objection" value={escrow.disputeReason} />
        )}
        {escrow.resolutionNote && (
          <ui.DetailRow label="The ruling" value={escrow.resolutionNote} />
        )}
        {escrow.commissionMinor !== null && (
          <ui.DetailRow
            label="Platform share"
            value={
              escrow.commissionMinor === 0
                ? "No fee"
                : formatMoney(escrow.commissionMinor, locale)
            }
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
