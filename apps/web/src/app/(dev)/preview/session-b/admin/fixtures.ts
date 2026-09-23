// Session B admin-shell fixture harness (lead ruling R-G): fixture props for
// the real console components, behind the preview gate, so the proof shots and
// the shape sweep can be re-run by anyone. Figures here are fixtures, never data.
import type { AlertView } from "@/lib/admin/queries";
import type {
  CollectedSeries,
  ConsolePulse,
  JobHealth,
  ListingsByRole,
  SupplyByType,
} from "@/app/admin/_components/console-shapes";
import type { AdminIdentity } from "@/app/admin/_components/AdminNav";

export const NOW = Date.parse("2026-09-22T09:24:00Z");
export const IDENTITY: AdminIdentity = { name: "Admin", role: "Platform Operator", initial: "A", avatarUrl: null };
export const COUNTS = { listings: 73, applications: 4, reports: 3, tickets: 2, flags: 5, moderation: 2, alerts: 3 };

const days = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(NOW - (13 - i) * 86_400_000).toISOString().slice(0, 10);
  const wave = [3, 5, 4, 6, 5, 8, 7, 9, 8, 11, 10, 12, 11, 14][i]!;
  return { day: d, signups: 180 + wave * 12, collectedMinor: (9_000_000 + wave * 700_000) * 100, submitted: 20 + wave * 2, liveAtClose: 1100 + wave * 11 };
});

export const PULSE: ConsolePulse = {
  listingsLive: 1248,
  listingsLiveWeekAgo: 1114,
  signupsToday: 342,
  signupsYesterday: 290,
  collectedTodayMinor: 18_450_000_00,
  collectedYesterdayMinor: 14_880_000_00,
  collectedWeekMinor: 18_450_000_00,
  collectedPrevWeekMinor: 14_880_000_00,
  newSupplyWeek: 286,
  newSupplyPrevWeek: 242,
  daily: days,
};

const monthly = [11, 17, 22, 30, 25, 27, 34, 30, 37, 44, 45, 53, 44, 38, 40, 46];
export const COLLECTED: CollectedSeries = {
  range: "12m",
  buckets: ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"].map((m, i) => ({
    start: m,
    amountMinor: monthly[i]! * 1_000_000_00,
    count: 40 + i * 9,
  })),
};

export const SUPPLY: SupplyByType = {
  total: 2046,
  rows: [
    { kind: "rent", count: 892 },
    { kind: "buy", count: 624 },
    { kind: "land", count: 218 },
    { kind: "hotels", count: 142 },
    { kind: "shortlets", count: 98 },
    { kind: "restaurants", count: 72 },
  ],
};

const roleRows = [
  [64, 52, 38], [82, 58, 48], [76, 60, 48], [82, 65, 54], [88, 70, 56], [103, 81, 62], [100, 74, 60], [111, 81, 66], [137, 97, 79], [119, 84, 68], [115, 87, 72], [108, 84, 77],
];
export const BY_ROLE: ListingsByRole = {
  months: ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"].map((m, i) => ({
    month: m,
    owner: roleRows[i]![0]!,
    agent: roleRows[i]![1]!,
    firm: roleRows[i]![2]!,
  })),
};

const at = (min: number) => new Date(NOW - min * 60_000).toISOString();
export const ALERTS: AlertView[] = [
  { id: "a1", severity: "low", status: "open", title: "New listing approved", description: "3 bedroom flat, Lekki", entityType: "listing", entityId: null, createdAt: at(12), resolvedAt: null, resolvedByName: null },
  { id: "a2", severity: "low", status: "open", title: "Verification completed", description: "Aisha B. - Agent", entityType: "agent", entityId: null, createdAt: at(28), resolvedAt: null, resolvedByName: null },
  { id: "a3", severity: "high", status: "open", title: "Listing under review", description: "2 bedroom flat, Ikoyi", entityType: "listing", entityId: null, createdAt: at(62), resolvedAt: null, resolvedByName: null },
  { id: "a4", severity: "low", status: "open", title: "Payment received", description: "N2,500,000 - Booking", entityType: "booking", entityId: null, createdAt: at(125), resolvedAt: null, resolvedByName: null },
  { id: "a5", severity: "low", status: "resolved", title: "System job completed", description: "Reconciliation run", entityType: "cron_job", entityId: null, createdAt: at(185), resolvedAt: null, resolvedByName: null },
];

export const JOBS: JobHealth = {
  checkedAt: new Date(NOW).toISOString(),
  jobs: [
    { name: "email-outbox", scheduler: "vercel", cron: "*/15 * * * *", schedule: "Every 15 minutes", lastRunAt: at(9), lastDurationMs: 740, lastOutcome: "ok", stale: false, active: true },
    { name: "hold-sweep", scheduler: "vercel", cron: "5 * * * *", schedule: "Hourly at :05", lastRunAt: at(19), lastDurationMs: 8239, lastOutcome: "ok", stale: false, active: true },
    { name: "paystack-reconcile", scheduler: "vercel", cron: "10 * * * *", schedule: "Hourly at :10", lastRunAt: at(14), lastDurationMs: null, lastOutcome: "ok", stale: false, active: true },
    { name: "pg-cron-watch", scheduler: "vercel", cron: "20 * * * *", schedule: "Hourly at :20", lastRunAt: at(4), lastDurationMs: 1507, lastOutcome: "ok", stale: false, active: true },
    { name: "complete-stays", scheduler: "vercel", cron: "30 2 * * *", schedule: "Daily at 03:30", lastRunAt: at(360), lastDurationMs: 2210, lastOutcome: "ok", stale: false, active: true },
    { name: "inventory-drift", scheduler: "vercel", cron: "45 2 * * *", schedule: "Daily at 03:45", lastRunAt: at(345), lastDurationMs: 4120, lastOutcome: "attention", stale: false, active: true },
    { name: "account-purge", scheduler: "vercel", cron: "15 3 * * *", schedule: "Daily at 04:15", lastRunAt: at(315), lastDurationMs: 612, lastOutcome: "ok", stale: false, active: true },
    { name: "saved-search-alerts", scheduler: "vercel", cron: "40 7 * * *", schedule: "Daily at 08:40", lastRunAt: at(3000), lastDurationMs: 902, lastOutcome: "failed", stale: true, active: true },
  ],
};

// The production database on 22 September, as measured by SQL: no real supply,
// no money, one sign-up today, alerts all resolved. The designed empty state.
export const EMPTY_PULSE: ConsolePulse = {
  ...PULSE,
  listingsLive: 0, listingsLiveWeekAgo: 0, signupsToday: 1, signupsYesterday: 0, peopleTotal: 7,
  collectedTodayMinor: 0, collectedYesterdayMinor: 0, collectedWeekMinor: 0, collectedPrevWeekMinor: 0,
  newSupplyWeek: 0, newSupplyPrevWeek: 0,
  daily: PULSE.daily.map((d, i) => ({ ...d, signups: i === 13 ? 1 : 0, collectedMinor: 0, submitted: 0, liveAtClose: 0 })),
};
export const EMPTY_COLLECTED: CollectedSeries = { ...COLLECTED, buckets: COLLECTED.buckets.map((b) => ({ ...b, amountMinor: 0, count: 0 })) };
export const EMPTY_SUPPLY: SupplyByType = { total: 0, rows: SUPPLY.rows.map((r) => ({ ...r, count: 0 })) };
export const EMPTY_BY_ROLE: ListingsByRole = { months: BY_ROLE.months.map((m) => ({ ...m, owner: 0, agent: 0, firm: 0 })) };
export const REAL_ALERTS: AlertView[] = [
  { id: "r1", severity: "high", status: "resolved", title: "Cron: pg cron, job failed", description: 'cron.pg_cron.job_failed\n{"failure_count":1}', entityType: "cron_job", entityId: "pg-cron-watch", createdAt: at(64), resolvedAt: null, resolvedByName: null },
  { id: "r2", severity: "high", status: "resolved", title: "Money reconciliation: the last call did not succeed", description: "The scheduled reconciliation called the platform and the reply was 401.", entityType: "cron_job", entityId: null, createdAt: at(107), resolvedAt: null, resolvedByName: null },
  { id: "r3", severity: "high", status: "resolved", title: "Cron: pg cron watch, locked out", description: "cron.pg_cron_watch.locked_out\n{}", entityType: "cron_job", entityId: null, createdAt: at(124), resolvedAt: null, resolvedByName: null },
  { id: "r4", severity: "high", status: "resolved", title: "Cron: paystack reconcile, locked out", description: "cron.paystack_reconcile.locked_out\n{}", entityType: "cron_job", entityId: null, createdAt: at(134), resolvedAt: null, resolvedByName: null },
  { id: "r5", severity: "medium", status: "resolved", title: "Cron: paystack reconcile, unauthorised", description: "cron.paystack_reconcile.unauthorised\n{}", entityType: "cron_job", entityId: null, createdAt: at(157), resolvedAt: null, resolvedByName: null },
];
export const LIVE_COUNTS = { listings: 0, applications: 0, reports: 0, tickets: 6, flags: 3, moderation: 0, alerts: 0 };
