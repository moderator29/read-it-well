/**
 * OPS-03: a critical alert pages a human and reaches Sentry; anything less
 * stays a row. Before this, `recordAlert` wrote `risk_alerts` and nothing
 * else, so an outage was noticed by whoever happened to open /admin/alerts.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const pageHuman = vi.fn(async (_input: unknown) => ({ paged: true, via: ["webhook"] }));
const reportError = vi.fn(async (_input: unknown) => ({ sent: false, reason: "not_configured" }));
vi.mock("../ops/page", () => ({ pageHuman: (i: unknown) => pageHuman(i) }));
vi.mock("../observability/report", () => ({ reportError: (i: unknown) => reportError(i) }));
vi.mock("../supabase/env", () => ({ isSupabaseConfigured: () => true }));

let recentCount = 0;
let insertError: { code: string; message: string } | null = null;

vi.mock("../supabase/admin", () => ({
  createAdminClient: () => {
    const q: Record<string, unknown> = {};
    for (const m of ["select", "eq", "is", "gte", "order", "limit", "neq"]) q[m] = () => q;
    q.maybeSingle = async () => ({ data: null, error: null });
    q.then = (resolve: (v: unknown) => void) => resolve({ count: recentCount, error: null });
    q.insert = () => ({
      select: () => ({
        single: async () => (insertError ? { data: null, error: insertError } : { data: { id: "alert-1" }, error: null }),
      }),
    });
    return { from: () => q };
  },
}));

const { recordAlert } = await import("./record");

beforeEach(() => {
  pageHuman.mockClear();
  reportError.mockClear();
  recentCount = 0;
  insertError = null;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("critical alerts leave the building", () => {
  it("a new critical alert pages a human with the scrubbed text, and reports to Sentry", async () => {
    await recordAlert({
      kind: "catalogue.read_failed",
      severity: "critical",
      detail: { surface: "search", code: "42501", email: "ada@example.com" },
    });
    expect(pageHuman).toHaveBeenCalledTimes(1);
    const page = pageHuman.mock.calls[0]?.[0] as { kind: string; title: string; body: string };
    expect(page.kind).toBe("catalogue.read_failed");
    expect(page.title).toBe("Catalogue: read failed");
    expect(page.body).toContain("42501");
    expect(page.body).not.toContain("ada@example.com");
    expect(reportError).toHaveBeenCalledTimes(1);
  });

  it("does not page twice within the hour for the same alert", async () => {
    recentCount = 1;
    await recordAlert({ kind: "catalogue.read_failed", severity: "critical", detail: {} });
    expect(pageHuman).not.toHaveBeenCalled();
  });

  it("still pages when the alert row itself could not be written", async () => {
    insertError = { code: "42501", message: "denied" };
    await recordAlert({ kind: "catalogue.read_failed", severity: "critical", detail: {} });
    expect(pageHuman).toHaveBeenCalledTimes(1);
  });

  it("warnings and info stay rows: nobody is woken for them", async () => {
    await recordAlert({ kind: "cron.drift", severity: "warning", detail: {} });
    await recordAlert({ kind: "cron.drift", severity: "info", detail: {} });
    expect(pageHuman).not.toHaveBeenCalled();
    expect(reportError).not.toHaveBeenCalled();
  });
});
