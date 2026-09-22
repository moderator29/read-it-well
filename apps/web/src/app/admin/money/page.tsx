import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getEscrowConsole, getMoneyConsole, getRefundConsole } from "@/lib/admin/money-queries";
import { getAuditLog } from "@/lib/admin/audit-queries";
import { adminUi } from "../_components/ui";
import { readQueueQuery } from "../_components/QueueFilters";
import { flatParams } from "./_desk/Desk";
import { readReconciliation } from "./_desk/Reconciliation";
import { readPage } from "./_desk/derive";
import { MoneyDesk, MoneyHead } from "./MoneyDesk";
import "./_desk/desk.css";

export const metadata: Metadata = {
  title: "Money",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The money desk, as panel 3 of C1D98B3C draws it: four KPI cards, money in
 * against money out, reconciliation health beside a transaction summary, and
 * the ledger with a running balance and a numbered pager.
 *
 * WHERE EVERY FIGURE COMES FROM, because on this screen that is the design.
 *
 * - Wallet float, settled this week, the flow chart, the summary and the
 *   ledger's running balance are derived from `getMoneyConsole()` ONLY when
 *   its answer is provably every entry and every wallet (`moneyReadIsWhole`).
 *   Past its caps the same panels draw the not-wired state and wait for the
 *   uncapped reads asked for in `docs/SESSION_B_SCOPE.md` (requests 2 to 5).
 * - In escrow is `getEscrowConsole().totals.heldMinor`, that function's own
 *   total over every escrow (a floor above 2,000 rows, stated in the handbook).
 * - Failed charges needs FAILED `transactions`, which no existing read
 *   returns, so it waits for request 2 rather than showing half an answer.
 * - Reconciliation is read from the job's own audit rows via `getAuditLog`.
 *
 * WHAT IS KEPT FROM THE DESK THIS REPLACES, every piece of it: stuck debits
 * first, the one-subject filter, the wallets list with its narrowed totals,
 * the refund console, and the disputed holds with the ruling control.
 */
export default async function AdminMoneyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const common = t.admin.common;
  const ui = adminUi(t, locale);

  /* ONE SUBJECT, ONE CONTROL, EVERY PANEL APPLIES IT. See `MoneyFilter` in
     `lib/admin/money-queries.ts`. `status` and `offset` are dropped rather
     than read: neither means anything here. `page` is this desk's own. */
  const params = await searchParams;
  const flat = flatParams(params);
  const asked = readQueueQuery(params);
  const query = {
    ...(asked.q ? { q: asked.q } : {}),
    ...(asked.from ? { from: asked.from } : {}),
    ...(asked.to ? { to: asked.to } : {}),
  };
  const narrowed = Boolean(query.q || query.from || query.to);
  const page = readPage(params.page);

  const [read, refunds, disputes, escrowTotals, runs] = await Promise.all([
    getMoneyConsole(query),
    getRefundConsole(query),
    /* Disputes only. The escrow desk has its own page; this is the one
       decision from it that is a refund question, made reachable here. */
    getEscrowConsole({ status: "DISPUTED" }),
    /* Unfiltered, for its platform-wide totals, which never re-scope. */
    getEscrowConsole(),
    getAuditLog({ q: "wallet.reconciliation.run", status: "wallet_entry" }),
  ]);


  if (read.state !== "ok") {
    return (
      <div className="nf-console nf-md">
        <MoneyHead />
        <ui.QueueUnavailable />
      </div>
    );
  }

  const now = new Date().getTime();
  return (
    <MoneyDesk
      locale={locale}
      ui={ui}
      common={common}
      query={query}
      params={flat}
      narrowed={narrowed}
      page={page}
      read={read.data}
      refunds={refunds}
      disputes={disputes}
      heldInEscrow={escrowTotals.state === "ok" ? escrowTotals.data.totals.heldMinor : null}
      health={readReconciliation(runs)}
      now={now}
    />
  );
}
