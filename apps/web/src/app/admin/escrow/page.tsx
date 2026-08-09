import type { Metadata } from "next";
import { formatMoney, getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getEscrowConsole, type EscrowView } from "@/lib/admin/money-queries";
import { adminUi, type AdminUi } from "../_components/ui";
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

const STATE_LABEL: Record<string, string> = {
  INITIATED: "Agreed, not funded",
  FUNDED: "Funded",
  HELD: "Held",
  RELEASE_REQUESTED: "Release asked for",
  RELEASED: "Released",
  REFUNDED: "Refunded",
  DISPUTED: "In dispute",
  RESOLVED: "Ruled on",
};

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
export default async function AdminEscrowPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const ui = adminUi(t, locale);

  const read = await getEscrowConsole();

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

  const { disputes, open, settled, totals } = read.data;

  return (
    <div className="nf-console">
      <ui.QueueHeader
        title="Escrow"
        lede="Money the platform is holding between two people. Every movement here is written to the audit log by the database, including the ones nobody took."
        count={disputes.length}
      />

      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="nf-card p-4">
          <p className="text-[0.75rem] uppercase tracking-wide text-[var(--nf-content-muted)]">
            Held right now
          </p>
          <p className="nf-numeric mt-1 text-[1.25rem] font-bold">
            {formatMoney(totals.heldMinor, locale)}
          </p>
        </div>
        <div className="nf-card p-4">
          <p className="text-[0.75rem] uppercase tracking-wide text-[var(--nf-content-muted)]">
            Open
          </p>
          <p className="nf-numeric mt-1 text-[1.25rem] font-bold">{totals.openCount}</p>
        </div>
        <div className="nf-card p-4">
          <p className="text-[0.75rem] uppercase tracking-wide text-[var(--nf-content-muted)]">
            In dispute
          </p>
          <p className="nf-numeric mt-1 text-[1.25rem] font-bold">{totals.disputeCount}</p>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-[1rem] font-semibold text-[var(--nf-content-primary)]">
          Disputes
        </h2>
        {disputes.length === 0 ? (
          <ui.QueueEmpty
            title="Nothing is in dispute"
            body="Every escrow either settled on its own or is still running. Nobody is waiting on a ruling."
          />
        ) : (
          <ul className="space-y-3">
            {disputes.map((escrow) => (
              <li key={escrow.id}>
                <EscrowCard escrow={escrow} ui={ui} locale={locale} rulable />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-[1rem] font-semibold text-[var(--nf-content-primary)]">
          Open holds
        </h2>
        {open.length === 0 ? (
          <p className="text-[0.875rem] text-[var(--nf-content-muted)]">
            The platform is not holding anybody&apos;s money.
          </p>
        ) : (
          <ul className="space-y-3">
            {open.map((escrow) => (
              <li key={escrow.id}>
                <EscrowCard escrow={escrow} ui={ui} locale={locale} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {settled.length > 0 && (
        <section>
          <h2 className="mb-2 text-[1rem] font-semibold text-[var(--nf-content-primary)]">
            Recently settled
          </h2>
          <ul className="space-y-3">
            {settled.map((escrow) => (
              <li key={escrow.id}>
                <EscrowCard escrow={escrow} ui={ui} locale={locale} />
              </li>
            ))}
          </ul>
        </section>
      )}
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
    <article className="nf-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <ui.StatusChip
          label={STATE_LABEL[escrow.state] ?? escrow.state}
          tone={STATE_TONE[escrow.state] ?? "neutral"}
        />
        <span className="nf-numeric text-[1rem] font-bold">
          {formatMoney(escrow.amountMinor, locale)}
        </span>
        <span className="text-[0.8125rem] text-[var(--nf-content-secondary)]">
          {PURPOSE_LABEL[escrow.purpose] ?? escrow.purpose}
        </span>
        <span className="ml-auto text-[0.75rem] text-[var(--nf-content-muted)]">
          {ui.when(escrow.createdAt)}
        </span>
      </div>

      <dl className="mt-2">
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
        <EscrowRuling escrowId={escrow.id} amountMinor={escrow.amountMinor} locale={locale} />
      )}
    </article>
  );
}
