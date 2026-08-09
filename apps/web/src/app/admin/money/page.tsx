import type { Metadata } from "next";
import { formatMoney, getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getMoneyConsole, type WalletEntryView } from "@/lib/admin/money-queries";
import { adminUi } from "../_components/ui";

export const metadata: Metadata = {
  title: "Money",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The money console. Wallets, the ledger, and anything stuck.
 *
 * The console had fourteen sections and not one of them was about money. An
 * operator asked "where is my five thousand naira" had nothing to open: no
 * wallet view, no ledger, no way to find a withdrawal that had been sitting
 * PENDING since Tuesday. The only answer available to support was to ask an
 * engineer to run SQL against production, which is both slow and the worst
 * possible habit to build.
 *
 * STUCK COMES FIRST, above the totals and above the ledger, because it is the
 * only thing on this page where somebody is currently waiting. A PENDING debit
 * is money that has left a person's spendable balance and has not arrived
 * anywhere; every minute it sits there is a minute somebody is short.
 */
export default async function AdminMoneyPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const ui = adminUi(t, locale);

  const read = await getMoneyConsole();

  if (read.state !== "ok") {
    return (
      <div className="nf-console">
        <ui.QueueHeader title="Money" lede="Wallets, the ledger, and anything stuck." />
        <ui.QueueUnavailable />
      </div>
    );
  }

  const { wallets, recent, stuck, totals } = read.data;

  function EntryRow({ entry }: { entry: WalletEntryView }) {
    const outgoing = entry.direction === "debit";
    return (
      <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-[var(--nf-border-subtle)] py-2.5">
        <span className="min-w-0">
          <span className="block text-[0.875rem] text-[var(--nf-content-primary)]">
            {entry.note ?? entry.kind.replace(/_/g, " ")}
            {entry.ownerName ? ` · ${entry.ownerName}` : ""}
          </span>
          <span className="block truncate font-mono text-[0.6875rem] text-[var(--nf-content-muted)]">
            {entry.reference}
          </span>
        </span>
        <span className="flex shrink-0 items-baseline gap-3">
          <ui.StatusChip label={entry.status} status={entry.status} />
          <span className="nf-numeric text-[0.875rem] font-semibold">
            {outgoing ? "-" : "+"}
            {formatMoney(entry.amountMinor, locale)}
          </span>
          <span className="text-[0.6875rem] text-[var(--nf-content-muted)]">
            {ui.when(entry.createdAt)}
          </span>
        </span>
      </li>
    );
  }

  return (
    <div className="nf-console">
      <ui.QueueHeader
        title="Money"
        lede="Every wallet, the ledger behind them, and anything that has stopped moving. Amounts are what the ledger says, summed from COMPLETED entries only."
        count={stuck.length}
      />

      {/* Stuck first. It is the only thing here somebody is waiting on. */}
      {stuck.length > 0 && (
        <section className="nf-card mb-5 p-4 sm:p-5">
          <h2 className="text-[1rem] font-semibold text-[var(--nf-content-primary)]">
            Stuck, and somebody is waiting
          </h2>
          <p className="mt-1 max-w-[62ch] text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
            These debits have been PENDING for over half an hour. The money has
            left a spendable balance and has not arrived anywhere. The stale
            hold sweeper releases withdrawal holds on a schedule; anything here
            that is not a withdrawal has not got a sweeper and needs a person.
          </p>
          <ul className="mt-3">
            {stuck.map((entry) => (
              <EntryRow key={entry.id} entry={entry} />
            ))}
          </ul>
        </section>
      )}

      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="nf-card p-4">
          <p className="text-[0.75rem] uppercase tracking-wide text-[var(--nf-content-muted)]">
            Settled across all wallets
          </p>
          <p className="nf-numeric mt-1 text-[1.25rem] font-bold">
            {formatMoney(totals.balanceMinor, locale)}
          </p>
        </div>
        <div className="nf-card p-4">
          <p className="text-[0.75rem] uppercase tracking-wide text-[var(--nf-content-muted)]">
            Held pending
          </p>
          <p className="nf-numeric mt-1 text-[1.25rem] font-bold">
            {formatMoney(totals.heldMinor, locale)}
          </p>
        </div>
        <div className="nf-card p-4">
          <p className="text-[0.75rem] uppercase tracking-wide text-[var(--nf-content-muted)]">
            Wallets
          </p>
          <p className="nf-numeric mt-1 text-[1.25rem] font-bold">{totals.walletCount}</p>
        </div>
      </section>

      <section className="nf-card mb-5 p-4 sm:p-5">
        <h2 className="text-[1rem] font-semibold text-[var(--nf-content-primary)]">Wallets</h2>
        {wallets.length === 0 ? (
          <p className="mt-2 text-[0.875rem] text-[var(--nf-content-muted)]">
            Nobody has a wallet yet. One is created the first time somebody is
            paid or funds an account.
          </p>
        ) : (
          <ul className="mt-2">
            {wallets.map((wallet) => (
              <li
                key={wallet.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-[var(--nf-border-subtle)] py-2.5"
              >
                <span className="min-w-0">
                  <span className="block text-[0.875rem] text-[var(--nf-content-primary)]">
                    {wallet.ownerName ?? "No display name"}
                  </span>
                  <span className="block truncate font-mono text-[0.6875rem] text-[var(--nf-content-muted)]">
                    {wallet.userId}
                  </span>
                </span>
                <span className="flex shrink-0 items-baseline gap-4">
                  {wallet.heldMinor > 0 && (
                    <span className="text-[0.75rem] text-[var(--nf-content-muted)]">
                      {formatMoney(wallet.heldMinor, locale)} held
                    </span>
                  )}
                  <span className="nf-numeric text-[0.9375rem] font-semibold">
                    {formatMoney(wallet.balanceMinor, locale)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="nf-card p-4 sm:p-5">
        <h2 className="text-[1rem] font-semibold text-[var(--nf-content-primary)]">
          The ledger, newest first
        </h2>
        {recent.length === 0 ? (
          <p className="mt-2 text-[0.875rem] text-[var(--nf-content-muted)]">
            No money has moved yet.
          </p>
        ) : (
          <ul className="mt-2">
            {recent.map((entry) => (
              <EntryRow key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
