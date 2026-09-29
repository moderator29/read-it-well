import type { Metadata } from "next";
import { MoneyHistoryPanel } from "../_components/MoneyHistoryPanel";
import { formatMoney, getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { requireAdmin } from "@/lib/admin/guard";
import { getRefundConsole } from "@/lib/admin/money-queries";
import { getReconciliationHealth, getRentCharges } from "@/lib/admin/reads/money";
import { readGuaranteeDesk } from "@/lib/admin/reads/agreements";
import { readRefundClockBoard } from "@/lib/after-gate/refunds";
import { adminUi } from "../_components/ui";
import { readQueueQuery } from "../_components/QueueFilters";
import { PageHead, Panel } from "../_components/panels";
import { RefundsPanel } from "./MoneyRows";
import { ReconciliationPanel } from "./_desk/Reconciliation";
import { RefundClock } from "./RefundClock";
import { GuaranteeClaims } from "./GuaranteeDesk";
import "./_desk/desk.css";
import "../agreements/agreements.css";

export const metadata: Metadata = {
  title: "Money",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * THE MONEY DESK, AFTER CUSTODY (Track A, 25 September 2026).
 *
 * Vallo never holds customer money, so there is no float, no wallet ledger,
 * no withdrawal to chase and no escrow to rule on. What is left for a person
 * to watch is:
 *
 *  - THE VALLO GUARANTEE: what the reserve holds (contributions settled with
 *    each charge, less approved claims), and the claims waiting on a decision.
 *  - REFUNDS: every refund decided, and whether Paystack has taken it back to
 *    the card.
 *  - RECONCILIATION: whether the scheduled job that compares Paystack's
 *    charges with our records is running and clean.
 *  - TENANCY CHARGES: the move-in charges and whether each was paid.
 */
export default async function AdminMoneyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const ui = adminUi(t, locale);
  const params = await searchParams;
  const asked = readQueueQuery(params);
  const query = {
    ...(asked.q ? { q: asked.q } : {}),
    ...(asked.from ? { from: asked.from } : {}),
    ...(asked.to ? { to: asked.to } : {}),
  };
  const narrowed = Boolean(query.q || query.from || query.to);

  const access = await requireAdmin("finance");
  if (access.state !== "admin") {
    return (
      <div className="nf-console">
        <PageHead title="Money" lede="Your account cannot open this desk." />
      </div>
    );
  }

  const [guarantee, refunds, runs, rent, clock] = await Promise.all([
    readGuaranteeDesk(access.supabase, access.userClient),
    getRefundConsole(query),
    getReconciliationHealth(),
    getRentCharges(),
    readRefundClockBoard(locale),
  ]);

  return (
    <div className="nf-console nf-md">
      <PageHead
        title="Money"
        lede="Vallo never holds customer money: every payment settles at the processor straight to the lister, the Guarantee reserve and Vallo in one transaction. This desk watches the Guarantee, refunds to the card, and the reconciliation job."
      />

      <Panel title="The Vallo Guarantee" id="guarantee">
        {guarantee.state !== "ok" ? (
          <p className="nf-body">The Guarantee reserve could not be read just now. Refresh to try again.</p>
        ) : (
          <>
            <ui.StatRow>
              <ui.Stat label="In the reserve" value={formatMoney(guarantee.balanceMinor, locale)} hint="Contributions less approved claims" />
              <ui.Stat label="Contributed" value={formatMoney(guarantee.contributedMinor, locale)} hint={`${guarantee.guaranteeBps / 100}% of each settled charge`} />
              <ui.Stat label="Paid out" value={formatMoney(guarantee.paidOutMinor, locale)} hint={`Claims are raised within ${guarantee.claimWindowHours} hours of move-in or check-in`} />
            </ui.StatRow>
            <h3 className="nf-admin-panel__title mt-block">Claims</h3>
            <GuaranteeClaims claims={guarantee.claims} locale={locale} />
          </>
        )}
      </Panel>

      <RefundsPanel refunds={refunds} narrowed={narrowed} locale={locale} ui={ui} />

      <ReconciliationPanel
        health={runs.state === "ok" ? runs.data : null}
        now={requestTime()}
        when={(iso) => (iso ? new Date(iso).toLocaleString("en-NG", { timeZone: "Africa/Lagos" }) : "never")}
        variant="check"
        locale={locale}
      />

      {rent.state === "ok" ? (
        <Panel title="Tenancy charges" id="rent">
          <p className="nf-body">
            {rent.data.total} move-in charges opened; the latest are listed on each tenancy. A move-in charge opens only on
            an approved agreement.
          </p>
        </Panel>
      ) : null}

      <RefundClock board={clock} copy={t.afterTheGate.admin} />

      {/* Every payment and refund that has already moved, platform-wide, read
          as the caller (the finance scope decides), with its CSV export. */}
      <MoneyHistoryPanel userClient={access.userClient} locale={locale} />
    </div>
  );
}

/** The request's clock, read once so every time on the page agrees. */
function requestTime(): number {
  return Date.now();
}
