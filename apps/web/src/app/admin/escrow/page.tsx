import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getDisputeEvidence, getEscrowDesk, getEscrowFloatHistory } from "@/lib/admin/reads/escrow";
import { getBadgeTiers } from "@/lib/admin/reads/badges";
import { getReconciliationHealth } from "@/lib/admin/reads/money";
import { readPage } from "@/lib/admin/reads/money-derive";
import { adminUi } from "../_components/ui";
import { readQueueQuery } from "../_components/QueueFilters";
import { flatParams } from "../money/_desk/Desk";
import { EscrowDesk, EscrowHead } from "./EscrowDesk";
import "../money/_desk/desk.css";

/** Table rows per page. The render draws five. */
const ESCROW_PAGE_SIZE = 10;

export const metadata: Metadata = {
  title: "Escrow",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The escrow desk, as panel 1 of 8E9602E2 draws it: the state pipeline, the
 * live escrows table with days held and the auto release countdown, the float
 * total and the reconciliation check, escrow by purpose and recent activity.
 *
 * THE DISPUTE QUEUE IS STILL THE POINT OF THIS PAGE, so every dispute on the
 * platform is drawn first, never paged, with the evidence and Session A's
 * ruling control (`resolveEscrow`) in the same frame.
 *
 * WHERE EVERY FIGURE COMES FROM: `getEscrowDesk` (`lib/admin/reads/escrow.ts`)
 * reads every escrow once and computes the pipeline, the purpose split, the
 * newest transitions, the float and the numbered table page from that one
 * set, checked against an exact count. Reconciliation is
 * `getReconciliationHealth`, shared with the money desk. The evidence on each
 * dispute: `getDisputeEvidence`. The float booked daily and its invariant:
 * `getEscrowFloatHistory`.
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
  const [desk, runs, float] = await Promise.all([
    getEscrowDesk({
      ...(query.q ? { q: query.q } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.from ? { from: query.from } : {}),
      ...(query.to ? { to: query.to } : {}),
      page: readPage(params.page),
      pageSize: ESCROW_PAGE_SIZE,
    }),
    getReconciliationHealth(),
    getEscrowFloatHistory(),
  ]);

  if (desk.state !== "ok") {
    return (
      <div className="nf-console nf-md">
        <EscrowHead locale={locale} />
        <ui.QueueUnavailable />
      </div>
    );
  }

  /* Everything filed on every dispute, read after the desk so it asks only
     for the escrows actually waiting on a ruling. */
  const evidence = await getDisputeEvidence(desk.data.disputes.map((d) => d.id));
  const tiers = await getBadgeTiers([
    ...[...desk.data.disputes, ...desk.data.table.rows].flatMap((r) => [r.payerId, r.payeeId]),
    ...(evidence.state === "ok" ? Object.values(evidence.data).flat().map((e) => e.authorId) : []),
  ]);

  return (
    <EscrowDesk
      locale={locale}
      ui={ui}
      common={common}
      query={query}
      params={flatParams(params)}
      desk={desk.data}
      health={runs.state === "ok" ? runs.data : null}
      evidence={evidence.state === "ok" ? evidence.data : null}
      float={float.state === "ok" ? float.data : null}
      tiers={tiers}
      now={new Date().getTime()}
    />
  );
}
