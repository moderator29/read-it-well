// Session B admin-shell fixture harness (R-G), behind the preview gate. Real OperationsView on fixture props.
import { OperationsView, type OpsTab } from "@/app/admin/operations/OperationsView";
import type { AuditRowView } from "@/lib/admin/audit-queries";
import { Frame } from "../frame";
import { JOBS, NOW, REAL_ALERTS } from "../fixtures";

export const dynamic = "force-dynamic";
const at = (min: number) => new Date(NOW - min * 60_000).toISOString();
const AUDIT: AuditRowView[] = [
  { id: "u1", createdAt: at(4), actorId: null, actorName: null, action: "cron.pg-cron-watch.ok", entityType: "cron_job", entityId: "pg-cron-watch", metadata: {} },
  { id: "u2", createdAt: at(14), actorId: null, actorName: null, action: "wallet.reconciliation.run", entityType: "wallet_entry", entityId: null, metadata: {} },
  { id: "u3", createdAt: at(19), actorId: null, actorName: null, action: "cron.hold-sweep.ok", entityType: "cron_job", entityId: "hold-sweep", metadata: {} },
  { id: "u4", createdAt: at(79), actorId: "x", actorName: "Tunde A.", action: "agent_application.review", entityType: "agent_application", entityId: "5b1c0e2a-77aa", metadata: {} },
  { id: "u5", createdAt: at(120), actorId: null, actorName: null, action: "cron.pg-cron-watch.attention", entityType: "cron_job", entityId: "pg-cron-watch", metadata: {} },
];
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const tab = ((await searchParams).tab ?? "jobs") as OpsTab;
  const days = Array.from({ length: 14 }, (_, i) => ({ day: `2026-09-${String(9 + i).padStart(2, "0")}`, runs: [20, 22, 24, 21, 25, 24, 26, 18, 24, 25, 24, 12, 30, 33][i]!, failed: [0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 1, 6, 4, 0][i]! }));
  return (
    <Frame>
      <OperationsView
        locale="en"
        now={NOW}
        tab={tab}
        jobs={JOBS}
        database={{ checkedAt: at(4), failures: 1, recovered: 1, neverRan: 4, stale: 0 }}
        runDays={days}
        trend={{ openNow: 0, openWeekAgo: 0, daily: days.map((d) => ({ day: d.day, opened: d.failed * 3 })) }}
        alerts={REAL_ALERTS}
        audit={AUDIT}
        activity={{ perDay: Array.from({ length: 30 }, (_, i) => ({ day: new Date(Date.parse("2026-08-24T12:00:00Z") + i * 86_400_000).toISOString().slice(0, 10), count: [3, 5, 2, 0, 4, 6, 8, 3, 2, 1, 0, 0, 5, 9, 12, 7, 4, 3, 6, 8, 10, 9, 14, 12, 18, 16, 20, 24, 40, 60][i]! })), byKind: [{ label: "wallet_entry", count: 483 }, { label: "cron_job", count: 4 }, { label: "agent_application", count: 1 }], byActor: [], windowDays: 30, total: 488, capped: false }}
        notifications={null}
        inspections={{ byState: { REQUESTED: 0, PROPOSED: 0, CONFIRMED: 0, COMPLETED: 0, DECLINED: 0, WITHDRAWN: 0 }, total: 0, recent: [] }}
      />
    </Frame>
  );
}
