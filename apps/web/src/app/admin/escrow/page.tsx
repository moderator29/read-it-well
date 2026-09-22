import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getEscrowConsole } from "@/lib/admin/money-queries";
import { getAuditLog } from "@/lib/admin/audit-queries";
import { adminUi } from "../_components/ui";
import { readQueueQuery } from "../_components/QueueFilters";
import { readReconciliation } from "../money/_desk/Reconciliation";
import { EscrowDesk, EscrowHead, STAGES } from "./EscrowDesk";
import "../money/_desk/desk.css";

export const metadata: Metadata = {
  title: "Escrow",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The escrow desk, as panel 1 of 8E9602E2 draws it: the state pipeline, the
 * live escrows table with days held and the auto release countdown, the float
 * total and the reconciliation check beside it, escrow by purpose and recent
 * activity underneath.
 *
 * THE DISPUTE QUEUE IS STILL THE POINT OF THIS PAGE. Two people who disagree
 * about money the platform holds is the most acute state the product can put
 * anybody in, so disputes on the current page are drawn first, above the
 * table, with the ruling control and the evidence in the same frame.
 *
 * WHERE EVERY FIGURE COMES FROM: the table, the disputes and the tiles'
 * float are `getEscrowConsole`. The pipeline counts, the purpose donut and
 * recent activity are derived from an UNFILTERED `getEscrowConsole()` page
 * only when that page came back short of full, which proves it holds every
 * escrow on the platform. Past one page the pipeline reads each state's own
 * page and says "40 or more" where the page was full; the donut and activity
 * wait for scope request 6.
 */
export default async function AdminEscrowPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const common = t.admin.common;
  const ui = adminUi(t, locale);

  const params = await searchParams;
  const query = readQueueQuery(params);
  const [read, everything, runs] = await Promise.all([
    getEscrowConsole({
      ...(query.q ? { q: query.q } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.from ? { from: query.from } : {}),
      ...(query.to ? { to: query.to } : {}),
      ...(query.offset ? { offset: query.offset } : {}),
    }),
    getEscrowConsole(),
    getAuditLog({ q: "wallet.reconciliation.run", status: "wallet_entry" }),
  ]);

  if (read.state !== "ok") {
    return (
      <div className="nf-console nf-md">
        <EscrowHead />
        <ui.QueueUnavailable />
      </div>
    );
  }

  const now = new Date().getTime();
  const whole = everything.state === "ok" && !everything.data.full;
  return (
    <EscrowDesk
      locale={locale}
      ui={ui}
      common={common}
      query={query}
      read={read.data}
      everything={everything}
      pagedStageCounts={whole ? null : await stageCountsByPage()}
      health={readReconciliation(runs)}
      now={now}
    />
  );
}

/**
 * Counts per stage from each state's own first page. Exact where the page was
 * not full; "40 or more" where it was, because the page is all this read can
 * see. Only used when the unfiltered page could not prove it held everything.
 */
async function stageCountsByPage(): Promise<Record<string, string>> {
  const reads = await Promise.all(STAGES.map((s) => getEscrowConsole({ status: s.state })));
  const out: Record<string, string> = {};
  STAGES.forEach((stage, i) => {
    const r = reads[i];
    if (!r || r.state !== "ok") {
      out[stage.state] = "?";
      return;
    }
    const n = r.data.disputes.length + r.data.open.length + r.data.settled.length;
    out[stage.state] = r.data.full ? `${n}+` : String(n);
  });
  return out;
}

