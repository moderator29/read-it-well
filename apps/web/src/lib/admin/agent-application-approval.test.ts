import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * SUP-14. Approval is the status change plus the agents row plus the role
 * grant. These prove a failed agents row or role grant puts the application
 * back as it was read, removes an agents row the approval itself created,
 * announces nothing, and reports the failure, while a clean approval still
 * announces.
 */

type Call = { table: string; op: string; payload?: unknown; filters: [string, unknown][] };

const seam = vi.hoisted(() => ({
  calls: [] as Call[],
  results: {} as Record<string, { data?: unknown; error: unknown }>,
  announce: vi.fn(),
}));

function client() {
  return {
    from(table: string) {
      const call: Call = { table, op: "select", filters: [] };
      const chain: Record<string, unknown> = {};
      const settle = () => {
        seam.calls.push(call);
        return Promise.resolve(seam.results[`${table}.${call.op}`] ?? { data: null, error: null });
      };
      for (const op of ["update", "upsert", "delete", "insert"] as const) {
        chain[op] = (payload?: unknown) => {
          call.op = op;
          call.payload = payload;
          return chain;
        };
      }
      chain.select = () => chain;
      chain.eq = (column: string, value: unknown) => {
        call.filters.push([column, value]);
        return chain;
      };
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
vi.mock("../notify/junction", () => ({ announce: seam.announce }));
vi.mock("./audit", () => ({ writeAudit: vi.fn() }));

const { reviewAgentApplication } = await import("./actions");

const APPLICATION = {
  id: "5f2504e0-4f89-41d3-9a0c-0305e82c3301",
  user_id: "957b3bd2-cce3-425d-bba9-5cd876ca3d62",
  status: "UNDER_REVIEW",
  reference: "VL-AGT-00001",
  full_name: "Ada",
  type: "individual",
  supply_role: "owner",
  reviewer_id: "earlier-reviewer",
  reviewed_at: "2026-09-20T10:00:00.000Z",
  review_notes: "earlier note",
};

const approve = () => reviewAgentApplication({ applicationId: APPLICATION.id, decision: "approve" });
const updates = () => seam.calls.filter((c) => c.table === "agent_applications" && c.op === "update");

beforeEach(() => {
  seam.calls = [];
  seam.announce.mockReset();
  seam.results = {
    "agent_applications.select": { data: APPLICATION, error: null },
    "agent_applications.update": { data: [{ id: APPLICATION.id }], error: null },
  };
});

describe("reviewAgentApplication refusals", () => {
  it("refuses a reviewer deciding their own application and writes nothing", async () => {
    seam.results["agent_applications.select"] = { data: { ...APPLICATION, user_id: "staff-1" }, error: null };
    const result = await approve();
    expect(result.ok).toBe(false);
    expect(updates()).toHaveLength(0);
    expect(seam.announce).not.toHaveBeenCalled();
  });

  it("writes only onto the status it read, and says so when another reviewer won", async () => {
    seam.results["agent_applications.update"] = { data: [], error: null };
    const result = await approve();
    expect(result.ok).toBe(false);
    expect(updates()[0]?.filters).toContainEqual(["status", APPLICATION.status]);
    expect(seam.announce).not.toHaveBeenCalled();
  });
});

describe("reviewAgentApplication approval side effects (SUP-14)", () => {
  it("announces a clean approval and leaves the status APPROVED", async () => {
    const result = await approve();
    expect(result.ok).toBe(true);
    expect(updates()).toHaveLength(1);
    expect(seam.announce).toHaveBeenCalledTimes(1);
  });

  it("rolls the application back and announces nothing when the agents row fails", async () => {
    seam.results["agents.upsert"] = { error: { message: "insert refused" } };
    const result = await approve();
    expect(result.ok).toBe(false);
    expect(seam.announce).not.toHaveBeenCalled();
    const [, rollback] = updates();
    expect(rollback?.payload).toEqual({
      status: "UNDER_REVIEW",
      reviewer_id: "earlier-reviewer",
      reviewed_at: "2026-09-20T10:00:00.000Z",
      review_notes: "earlier note",
    });
    expect(seam.calls.some((c) => c.table === "user_roles")).toBe(false);
  });

  it("takes back the agents row it created when the role grant fails", async () => {
    seam.results["user_roles.upsert"] = { error: { message: "grant refused" } };
    const result = await approve();
    expect(result.ok).toBe(false);
    expect(seam.announce).not.toHaveBeenCalled();
    expect(updates()).toHaveLength(2);
    const removed = seam.calls.find((c) => c.table === "agents" && c.op === "delete");
    expect(removed?.filters).toEqual([
      ["user_id", APPLICATION.user_id],
      ["application_id", APPLICATION.id],
    ]);
  });

  it("leaves an agents row that existed before the approval alone", async () => {
    seam.results["agents.select"] = { data: { id: "agent-1" }, error: null };
    seam.results["user_roles.upsert"] = { error: { message: "grant refused" } };
    const result = await approve();
    expect(result.ok).toBe(false);
    expect(seam.calls.some((c) => c.table === "agents" && c.op === "delete")).toBe(false);
  });
});
