import type { Metadata } from "next";
import { formatMoney, getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getPaymentHealth, STALE_HOLD_MINUTES } from "@/lib/admin/payments-queries";
import { adminUi } from "../_components/ui";
import { SweepHolds } from "./SweepHolds";

export const metadata: Metadata = {
  title: "Payments",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Payment and wallet health.
 *
 * THE QUESTION THIS SCREEN ANSWERS. "Is anybody's money stuck." It had no
 * screen. `private.wallets_overdrawn()` and `private.stale_withdrawal_holds()`
 * were written when the wallet layer landed and their public pass-throughs
 * carry EXECUTE for `service_role` only, so the nightly reconcile job could
 * call them and a person could not. The honest description of the old state is
 * that an operator asked by a user where their withdrawal went had to ask an
 * engineer to run SQL against production.
 *
 * THE ORDER IS THE PRIORITY, and it is not the order the data arrives in.
 * An overdrawn wallet comes first because it is the only finding here that
 * means the books are WRONG rather than slow: every other row on this page is
 * money in the wrong place, and that one is money that does not add up. It is
 * also the only one this console offers no button for, deliberately. A ledger
 * that has lost an argument with itself is not something to paper over with an
 * adjusting entry from a web form; it is an engineering incident, and the
 * screen says so instead of offering a fix that would destroy the evidence.
 *
 * Stale holds come second and carry the one action, because they are the
 * finding where somebody is actively short of their own money.
 *
 * Unsettled payments come last and are read-only: the reconcile route at
 * /api/paystack/reconcile is what re-asks the provider, and duplicating that as
 * a button here would give two code paths permission to decide a payment landed.
 */
export default async function AdminPaymentsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const ui = adminUi(t, locale);

  const read = await getPaymentHealth(STALE_HOLD_MINUTES);
  /* The moment this page's rows were read, handed to the sweep control so its
     age arithmetic runs against the same clock the list was built from. */
  const asOf = new Date().toISOString();

  if (read.state !== "ok") {
    return (
      <div className="nf-console">
        <ui.QueueHeader
          title="Payments"
          lede="Money that is stuck, short, or waiting on the provider."
        />
        <ui.QueueUnavailable />
      </div>
    );
  }

  const { overdrawn, staleHolds, unsettled, totals, staleMinutes } = read.data;
  const healthy = overdrawn.length === 0 && staleHolds.length === 0 && unsettled.length === 0;

  return (
    <div className="nf-console">
      <ui.QueueHeader
        title="Payments"
        lede="Money that is stuck, short, or waiting on the provider. Everything here is read from the ledger itself rather than from a cached figure, so a number on this page is the number in the database."
        count={overdrawn.length + staleHolds.length}
      />

      <ui.StatRow>
        <ui.Stat
          label="Ledger shortfall"
          value={formatMoney(totals.shortfallMinor, locale)}
          hint={
            overdrawn.length === 0
              ? "Every wallet adds up"
              : `${overdrawn.length === 1 ? "1 wallet is" : `${overdrawn.length} wallets are`} below zero`
          }
          tone={overdrawn.length === 0 ? "success" : "danger"}
        />
        <ui.Stat
          label="Frozen by stuck holds"
          value={formatMoney(totals.frozenMinor, locale)}
          hint={
            staleHolds.length === 0
              ? "Nothing is held past its window"
              : `${staleHolds.length === 1 ? "1 withdrawal" : `${staleHolds.length} withdrawals`} older than ${staleMinutes} minutes`
          }
          tone={staleHolds.length === 0 ? "success" : "warning"}
        />
        <ui.Stat
          label="Waiting on the provider"
          value={formatMoney(totals.unsettledMinor, locale)}
          hint={
            unsettled.length === 0
              ? "Nothing unsettled in thirty days"
              : `${unsettled.length === 1 ? "1 payment" : `${unsettled.length} payments`} pending or failed`
          }
          tone={unsettled.length === 0 ? "success" : "neutral"}
        />
      </ui.StatRow>

      {healthy && (
        <ui.QueueEmpty
          title="The money is where it should be"
          body="No wallet is overdrawn, no withdrawal is held past its window, and the provider has settled everything it was sent in the last thirty days."
        />
      )}

      {overdrawn.length > 0 && (
        <ui.Section
          title="Overdrawn wallets"
          hint="A wallet whose settled entries sum below zero. This is not a delay, it is an arithmetic failure in the ledger, and it has no button here on purpose: an adjusting entry typed into a web form would bury the evidence an engineer needs to find the cause."
        >
          <div className="nf-card">
            <ul className="nf-rows nf-group">
              {overdrawn.map((wallet) => (
                <li key={wallet.walletId} className="nf-row">
                  <span className="min-w-0 flex-1">
                    <span className="nf-body block font-semibold text-content">
                      {wallet.ownerName ?? "Name not on file"}
                    </span>
                    <span className="nf-caption block truncate">{wallet.walletId}</span>
                  </span>
                  <span className="nf-numeric nf-body shrink-0 font-bold text-[var(--nf-state-error)]">
                    {formatMoney(wallet.balanceMinor, locale)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </ui.Section>
      )}

      <ui.Section
        title="Stuck withdrawal holds"
        hint={`A withdrawal still marked pending after ${staleMinutes} minutes. The money is neither in the owner's spendable balance nor in their bank account.`}
      >
        {staleHolds.length === 0 ? (
          <ui.QueueEmpty
            title="No withdrawal is stuck"
            body="Every pending hold is inside its window, which means it is on its way rather than frozen."
          />
        ) : (
          <div className="nf-stack nf-stack--group">
            <div className="nf-card">
              <ul className="nf-rows nf-group">
                {staleHolds.map((hold) => (
                  <li key={hold.reference} className="nf-row">
                    <span className="min-w-0 flex-1">
                      <span className="nf-body block font-semibold text-content">
                        {hold.ownerName ?? "Name not on file"}
                      </span>
                      <span className="nf-caption block truncate">
                        {hold.reference} · held since {ui.when(hold.createdAt)}
                      </span>
                    </span>
                    <span className="nf-numeric nf-body shrink-0 font-bold">
                      {formatMoney(hold.amountMinor, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <SweepHolds
              holds={staleHolds}
              defaultMinutes={staleMinutes}
              locale={locale}
              asOf={asOf}
            />
          </div>
        )}
      </ui.Section>

      {unsettled.length > 0 && (
        <ui.Section
          title="Waiting on the provider"
          hint="Payments the provider has not settled, from the last thirty days. Re-asking the provider is the reconcile job's decision to take, not this screen's."
        >
          <div className="nf-card">
            <ul className="nf-rows nf-group">
              {unsettled.map((payment) => (
                <li key={payment.id} className="nf-row">
                  <ui.StatusChip
                    label={payment.status === "FAILED" ? "Failed" : "Pending"}
                    tone={payment.status === "FAILED" ? "danger" : "warning"}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="nf-body block font-semibold text-content">
                      {payment.providerRef ?? payment.id}
                    </span>
                    <span className="nf-caption block truncate">
                      {payment.provider ?? "Unknown provider"} · {ui.when(payment.createdAt)}
                    </span>
                  </span>
                  <span className="nf-numeric nf-body shrink-0 font-bold">
                    {formatMoney(payment.amountMinor, locale)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </ui.Section>
      )}
    </div>
  );
}
