import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { alertBadge, alertSubline, niceTicks, periodDelta, sinceLabel } from "./metrics";
import {
  ADMIN_NAV,
  ADMIN_PRIMARY,
  ADMIN_SETTINGS,
  currentDestination,
  isActiveHref,
  isSectionActive,
} from "./nav";
import { VERCEL_JOBS, durationLabel, jobRow, jobStatus, outcomeOf } from "@/lib/admin/reads/jobs";

describe("periodDelta", () => {
  it("refuses a delta when either period is missing", () => {
    expect(periodDelta(5, null)).toBeNull();
    expect(periodDelta(null, 5)).toBeNull();
    expect(periodDelta(undefined, 5)).toBeNull();
  });
  it("prints a percentage against a non-zero previous period", () => {
    expect(periodDelta(112, 100)).toEqual({ direction: "up", good: true, text: "+12%" });
    expect(periodDelta(95, 100)).toEqual({ direction: "down", good: false, text: "-5%" });
    expect(periodDelta(100, 100)).toEqual({ direction: "flat", good: true, text: "0%" });
  });
  it("prints a count, never an invented percentage, from zero", () => {
    expect(periodDelta(3, 0)).toEqual({ direction: "up", good: true, text: "+3" });
    expect(periodDelta(0, 0)).toEqual({ direction: "flat", good: true, text: "0" });
  });
  it("respects a figure where lower is better", () => {
    expect(periodDelta(9, 10, { higherIsGood: false })?.good).toBe(true);
  });
});

describe("niceTicks", () => {
  it("starts at zero and covers the maximum on a round step", () => {
    const ticks = niceTicks(52_780_000);
    expect(ticks[0]).toBe(0);
    expect(ticks.at(-1)!).toBeGreaterThanOrEqual(52_780_000);
    expect(ticks).toEqual([0, 20_000_000, 40_000_000, 60_000_000, 80_000_000]);
  });
  it("gives a zero series a readable axis rather than a collapsed one", () => {
    expect(niceTicks(0)).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });
});

describe("sinceLabel", () => {
  const now = Date.parse("2026-09-22T12:00:00Z");
  const fmt = () => "date";
  it("reads recent stamps as minutes, hours and days", () => {
    expect(sinceLabel("2026-09-22T11:48:00Z", now, fmt)).toBe("12m ago");
    expect(sinceLabel("2026-09-22T09:00:00Z", now, fmt)).toBe("3h ago");
    expect(sinceLabel("2026-09-20T12:00:00Z", now, fmt)).toBe("2d ago");
    expect(sinceLabel("2026-08-01T12:00:00Z", now, fmt)).toBe("date");
    expect(sinceLabel(null, now, fmt)).toBe("Not recorded");
  });
});

describe("alert vocabulary", () => {
  it("draws resolved as emerald whatever the severity", () => {
    expect(alertBadge("high", "resolved")).toEqual({ tone: "success", word: "Resolved" });
    expect(alertBadge("high", "open")).toEqual({ tone: "error", word: "High" });
    expect(alertBadge("medium", "open")).toEqual({ tone: "pending", word: "Medium" });
    expect(alertBadge("low", "open")).toEqual({ tone: "info", word: "Info" });
  });
  it("never prints a machine kind or JSON as the sub-line", () => {
    expect(alertSubline('cron.pg_cron.job_failed\n{"failure_count":1}', "cron_job")).toBe("Cron job");
    expect(alertSubline("The scheduled reconciliation replied 401.", "cron_job")).toBe(
      "The scheduled reconciliation replied 401.",
    );
    expect(alertSubline(null, null)).toBe("Platform");
  });
});

describe("the console map", () => {
  it("carries the twelve rows the renders draw, in their order", () => {
    expect([...ADMIN_PRIMARY, ADMIN_SETTINGS].map((d) => d.label)).toEqual([
      "Overview",
      "Listings",
      "Supply",
      "Verification",
      "Money",
      "Escrow",
      "Bookings",
      "Moderation",
      "Support",
      "Operations",
      "Analytics",
      "Settings",
    ]);
  });
  it("orphans no working desk: every route folder under app/admin is on the map", () => {
    const hrefs = new Set(ADMIN_NAV.map((d) => d.href));
    const desks = [
      "agents", "alerts", "audit", "bookings", "businesses", "escrow", "examples", "fees", "flags",
      "kyc", "listings", "moderation", "money", "payments", "queue", "reference", "reports",
      "social", "standing", "stops", "support", "switches", "operations", "analytics", "settings", "supply",
    ];
    for (const desk of desks) expect(hrefs.has(`/admin/${desk}`)).toBe(true);
    expect(hrefs.has("/admin")).toBe(true);
  });
  it("lights a parent while one of its desks is open", () => {
    const moderation = ADMIN_PRIMARY.find((d) => d.key === "moderation")!;
    expect(isSectionActive("/admin/flags", moderation)).toBe(true);
    expect(isActiveHref("/admin", "/admin")).toBe(true);
    expect(isActiveHref("/admin/listings/abc", "/admin")).toBe(false);
    expect(currentDestination("/admin/audit")?.label).toBe("Audit log");
    expect(currentDestination("/admin/bookings/reservations")?.label).toBe("Bookings");
  });
});

function row(action: string, createdAt: string, metadata: Record<string, unknown> = {}) {
  return { action, createdAt, metadata };
}

describe("scheduled jobs", () => {
  const now = Date.parse("2026-09-22T12:00:00Z");
  const hourly = VERCEL_JOBS.find((j) => j.name === "hold-sweep")!;

  it("matches the scheduler's own list in vercel.json", () => {
    const config = JSON.parse(readFileSync(new URL("../../../../vercel.json", import.meta.url), "utf8")) as {
      crons: { path: string; schedule: string }[];
    };
    const scheduled = config.crons.map((c) => `${c.path.split("/").pop()} ${c.schedule}`).sort();
    const ours = VERCEL_JOBS.map((j) => `${j.name === "paystack-reconcile" ? "reconcile" : j.name} ${j.cron}`).sort();
    expect(ours).toEqual(scheduled);
  });
  it("reads the outcome from either writer", () => {
    expect(outcomeOf(row("cron.hold-sweep.ok", ""))).toBe("ok");
    expect(outcomeOf(row("cron.hold-sweep.failed", ""))).toBe("failed");
    expect(outcomeOf(row("wallet.reconciliation.run", "", { outcome: "clean" }))).toBe("ok");
    expect(outcomeOf(row("wallet.reconciliation.run", "", { outcome: "gaps" }))).toBe("attention");
  });
  it("marks a job overdue past its allowance and pending before its first run", () => {
    expect(jobStatus(jobRow(hourly, row("cron.hold-sweep.ok", "2026-09-22T11:05:00Z", { duration_ms: 474 }), now))).toEqual({ tone: "success", word: "Healthy" });
    expect(jobStatus(jobRow(hourly, row("cron.hold-sweep.ok", "2026-09-22T06:05:00Z"), now))).toEqual({ tone: "error", word: "Overdue" });
    expect(jobStatus(jobRow(hourly, null, now))).toEqual({ tone: "pending", word: "No run yet" });
    expect(jobRow(hourly, row("cron.hold-sweep.ok", "2026-09-22T11:05:00Z", { duration_ms: 474 }), now).lastDurationMs).toBe(474);
  });
  it("prints durations the way the render does", () => {
    expect(durationLabel(474)).toBe("474ms");
    expect(durationLabel(8_239)).toBe("8s");
    expect(durationLabel(134_000)).toBe("2m 14s");
    expect(durationLabel(null)).toBe("Not recorded");
  });
});
