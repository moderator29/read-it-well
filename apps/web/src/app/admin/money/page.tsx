import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getEscrowConsole, getMoneyConsole, getRefundConsole } from "@/lib/admin/money-queries";
import { getMoneyDesk, getReconciliationHealth, getRentCharges } from "@/lib/admin/reads/money";
import { getDisputeEvidence } from "@/lib/admin/reads/escrow";
import { getBadgeTiers } from "@/lib/admin/reads/badges";
import { adminUi } from "../_components/ui";
import { readQueueQuery } from "../_components/QueueFilters";
import { flatParams } from "./_desk/Desk";
import { readPage } from "@/lib/admin/reads/money-derive";
import { LEDGER_PAGE_SIZE, MoneyDesk, MoneyHead } from "./MoneyDesk";
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
 * - The four cards, the flow chart, the transaction summary and the ledger
 *   with its running balance: `getMoneyDesk` in `lib/admin/reads/money.ts`,
 *   one pass over EVERY wallet entry, escrow and failed transaction, checked
 *   against an exact count. Never a total over a capped list.
 * - Reconciliation: `getReconciliationHealth`, every
 *   `wallet.reconciliation.run` audit row in the last seven days.
 * - Tenancy charges: `getRentCharges`, every `rent_payments` row with its
 *   carrying booking's status and settled payment, checked against an exact count.
 * - Stuck debits and the wallets list: `getMoneyConsole`, as before.
 * - Refunds: `getRefundConsole`. Disputes: `getEscrowConsole`, with the
 *   ruling control calling Session A's `resolveEscrow` unchanged.
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

  const [read, desk, refunds, disputes, runs, rent] = await Promise.all([
    getMoneyConsole(query),
    getMoneyDesk({ ...query, page, pageSize: LEDGER_PAGE_SIZE }),
    getRefundConsole(query),
    /* Disputes only. The escrow desk has its own page; this is the one
       decision from it that is a refund question, made reachable here. */
    getEscrowConsole({ status: "DISPUTED" }),
    getReconciliationHealth(),
    getRentCharges(),
  ]);


  if (read.state !== "ok") {
    return (
      <div className="nf-console nf-md">
        <MoneyHead locale={locale} />
        <ui.QueueUnavailable />
      </div>
    );
  }

  /* What each side filed, shown on the ruling so nobody rules without it. */
  const evidence = await getDisputeEvidence(disputes.state === "ok" ? disputes.data.disputes.map((d) => d.id) : []);

  /* Badge tiers for every person this page names, read from person_badge. */
  const tiers = await getBadgeTiers([
    ...read.data.wallets.map((w) => w.userId),
    ...(desk.state === "ok" ? desk.data.ledger.rows.map((r) => r.ownerId) : []),
    ...(rent.state === "ok" ? rent.data.latest.map((r) => r.tenantId) : []),
    ...(evidence.state === "ok" ? Object.values(evidence.data).flat().map((e) => e.authorId) : []),
  ]);

  const now = new Date().getTime();
  return (
    <MoneyDesk
      locale={locale}
      ui={ui}
      common={common}
      query={query}
      params={flat}
      narrowed={narrowed}
      read={read.data}
      desk={desk.state === "ok" ? desk.data : null}
      refunds={refunds}
      disputes={disputes}
      health={runs.state === "ok" ? runs.data : null}
      rent={rent.state === "ok" ? rent.data : null}
      evidence={evidence.state === "ok" ? evidence.data : null}
      tiers={tiers}
      now={now}
    />
  );
}
