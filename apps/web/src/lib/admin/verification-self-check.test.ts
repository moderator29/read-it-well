import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Nobody records a check on their own verification ladder. The application,
 * every document and every listing already refuse their own reviewer; the four
 * rungs were the one decision a member of staff who is also an agent could
 * take about themselves, and each one moves the tier guests read.
 */

type Call = { table: string; op: string; payload?: unknown };

const seam = vi.hoisted(() => ({
  calls: [] as Call[],
  agent: null as Record<string, unknown> | null,
  audit: vi.fn(),
}));

function client() {
  return {
    from(table: string) {
      const call: Call = { table, op: "select" };
      const chain: Record<string, unknown> = {};
      const settle = () => {
        seam.calls.push(call);
        if (table === "agents") return Promise.resolve({ data: seam.agent, error: null });
        return Promise.resolve({ data: null, error: null });
      };
      for (const op of ["update", "upsert", "insert"] as const) {
        chain[op] = (payload?: unknown) => {
          call.op = op;
          call.payload = payload;
          return chain;
        };
      }
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.maybeSingle = settle;
      chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
        settle().then(resolve, reject);
      return chain;
    },
  };
}

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("./guard", () => ({
  adminRefusal: () => "forbidden",
  requireAdmin: async () => ({ state: "admin", user: { id: "staff-1" }, supabase: client() }),
}));
vi.mock("../supabase/admin", () => ({ createAdminClient: () => client() }));
vi.mock("./audit", () => ({ writeAudit: seam.audit }));

const { recordVerificationCheck } = await import("./verification-actions");

const AGENT_ID = "5f2504e0-4f89-41d3-9a0c-0305e82c3301";
const checks = () => seam.calls.filter((c) => c.table === "agent_verification_checks");

beforeEach(() => {
  seam.calls = [];
  seam.audit.mockReset();
  seam.agent = { id: AGENT_ID, user_id: "957b3bd2-cce3-425d-bba9-5cd876ca3d62", display_name: "Ada", verification_tier: 0 };
});

describe("recordVerificationCheck", () => {
  it("refuses a reviewer recording a rung on their own ladder and writes nothing", async () => {
    seam.agent = { ...seam.agent, user_id: "staff-1" };
    const result = await recordVerificationCheck({ agentId: AGENT_ID, kind: "in_person", status: "passed" });
    expect(result.ok).toBe(false);
    expect(checks()).toHaveLength(0);
    expect(seam.audit).not.toHaveBeenCalled();
  });

  it("records a rung on somebody else's ladder", async () => {
    const result = await recordVerificationCheck({ agentId: AGENT_ID, kind: "in_person", status: "passed" });
    expect(result.ok).toBe(true);
    expect(checks()[0]?.payload).toMatchObject({ agent_id: AGENT_ID, kind: "in_person", status: "passed", decided_by: "staff-1" });
  });
});
