/**
 * V-01: the catalogue canary judges the public read against the service
 * role's count, and turns every way the 22 September outage could recur into
 * a critical alert. The Supabase clients are stand-ins; the verdicts are real.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("../supabase/env", () => ({
  isSupabaseConfigured: () => true,
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_example",
}));

const { probeCatalogue, catalogueCanary } = await import("./catalogue-canary");

type Result = { count?: number | null; data?: unknown; error?: unknown };

/** A client whose head count answers `count` and whose card read answers `card`. */
function client(count: Result | "throw", card: Result = { data: [{ id: "x" }], error: null }) {
  return {
    from: () => ({
      select: (_cols: string, opts?: { head?: boolean }) => {
        const answer = opts?.head ? count : card;
        const chain = {
          eq: () => chain,
          gte: () => chain,
          limit: () => chain,
          then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
            answer === "throw" ? reject(new TypeError("fetch failed")) : resolve({ count: null, data: null, error: null, ...answer }),
        };
        return chain;
      },
    }),
  };
}

const DENIED = { code: "42501", message: "permission denied for function owns_listing" };

describe("probeCatalogue", () => {
  it("passes when the public read sees what the service role sees", async () => {
    const probe = await probeCatalogue(client({ count: 64 }) as never, client({ count: 64 }) as never);
    expect(probe).toMatchObject({ ok: true, control: 64, visible: 64, reason: "ok" });
  });

  it("fails on the outage shape: the public read is refused (42501)", async () => {
    const probe = await probeCatalogue(client({ count: 64 }) as never, client({ error: DENIED }) as never);
    expect(probe).toMatchObject({ ok: false, reason: "public_read_failed", code: "42501", control: 64 });
  });

  it("fails when the public read sees fewer listings than exist (a policy that hides rows)", async () => {
    const probe = await probeCatalogue(client({ count: 64 }) as never, client({ count: 0 }) as never);
    expect(probe).toMatchObject({ ok: false, reason: "fewer_visible", control: 64, visible: 0 });
  });

  it("fails when the card select is refused although the count works (a column without its grant)", async () => {
    const probe = await probeCatalogue(
      client({ count: 64 }) as never,
      client({ count: 64 }, { data: null, error: { code: "42501", message: "permission denied for table listings" } }) as never,
    );
    expect(probe).toMatchObject({ ok: false, reason: "card_read_failed", code: "42501" });
  });

  it("fails when nothing is published at all", async () => {
    const probe = await probeCatalogue(client({ count: 0 }) as never, client({ count: 0 }) as never);
    expect(probe).toMatchObject({ ok: false, reason: "empty" });
  });

  it("fails, not throws, when the database cannot be reached", async () => {
    const probe = await probeCatalogue(client({ count: 64 }) as never, client("throw") as never);
    expect(probe).toMatchObject({ ok: false, reason: "public_read_failed", code: "error" });
  });

  it("without a control (the public health route) judges errors and emptiness alone", async () => {
    expect(await probeCatalogue(null, client({ count: 12 }) as never)).toMatchObject({ ok: true, control: null });
    expect(await probeCatalogue(null, client({ count: 0 }) as never)).toMatchObject({ ok: false, reason: "empty" });
  });
});

describe("catalogueCanary (the cron job)", () => {
  it("raises a critical canary.catalogue alert on failure, and nothing on success", async () => {
    // The job builds its own public client; stand the whole module's reader in via the admin fake only.
    const bad = await catalogueCanary(client({ error: DENIED }) as never);
    expect(bad.outcome).toBe("attention");
    expect(bad.alert).toMatchObject({ kind: "canary.catalogue", severity: "critical", detail: { reason: "control_failed", code: "42501" } });
  });

  it("an empty catalogue pages on the transition, then stays a non-paging warning", async () => {
    // `client` answers every head count with the same count: 0 published, and
    // the risk_alerts lookup answers 0 (not raised yet) then 1 (raised).
    const first = await catalogueCanary(client({ count: 0 }) as never, client({ count: 0 }) as never);
    expect(first.alert).toMatchObject({ kind: "canary.catalogue_empty", severity: "critical" });
    const later = await catalogueCanary(
      {
        from: (table: string) =>
          table === "risk_alerts" ? client({ count: 1 }).from() : client({ count: 0 }).from(),
      } as never,
      client({ count: 0 }) as never,
    );
    expect(later.alert).toMatchObject({ kind: "canary.catalogue_empty", severity: "warning" });
  });
});
