import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * TAKING SOMEBODY OFF SUPPORT (team console, Support panel).
 *
 * Least privilege both ways: removing support never takes another desk and
 * never adds one, and the person is never told "You have Vallo staff access"
 * as the only word on a removal.
 */

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock("../supabase/service", () => ({ findUserByEmail: async () => null }));

type Call = { fn: string; args: Record<string, unknown> };
const calls: Call[] = [];
const inserts: { table: string; row: Record<string, unknown> }[] = [];
const audits: Record<string, unknown>[] = [];
let grant: { scopes: string[]; position: string | null; note: string | null; revoked_at: string | null } | null;
let removeInstalled = true;
let removeStatus = "ok";

vi.mock("../actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "not configured",
  SIGNED_OUT_MESSAGE: "signed out",
  resolveSession: async () => ({
    state: "signed-in",
    user: { id: "00000000-0000-4000-8000-00000000000f" },
    supabase: {
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: grant, error: null }) }) }) }),
      rpc: async (fn: string, args: Record<string, unknown>) => {
        calls.push({ fn, args });
        if (fn === "admin_remove_support") {
          return removeInstalled
            ? { data: { status: removeStatus }, error: null }
            : { data: null, error: { code: "PGRST202", message: "not found" } };
        }
        return { data: { status: "ok", scopes: args.p_scopes ?? [] }, error: null };
      },
    },
  }),
}));

vi.mock("../supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      insert: async (row: Record<string, unknown>) => {
        inserts.push({ table, row });
        return { error: null };
      },
    }),
  }),
}));
vi.mock("./audit", () => ({ writeAudit: async (_db: unknown, entry: Record<string, unknown>) => void audits.push(entry) }));

const USER = "10000000-0000-4000-8000-000000000001";

beforeEach(() => {
  calls.length = 0;
  inserts.length = 0;
  audits.length = 0;
  removeInstalled = true;
  removeStatus = "ok";
  grant = { scopes: ["finance", "support"], position: "finance_officer", note: null, revoked_at: null };
});

describe("taking somebody off support", () => {
  it("uses the one-step door when installed: support only, nothing granted", async () => {
    const { removeFromSupport } = await import("./staff-actions");
    const r = await removeFromSupport({ userId: USER, reason: "Moved to the money desk full time" });
    expect(r).toEqual({ ok: true, data: { ended: false } });
    expect(calls.map((c) => c.fn)).toEqual(["admin_remove_support"]);
    expect(inserts).toEqual([]);
  });

  it("falls back to the grant with exactly what is left, and says what really happened", async () => {
    removeInstalled = false;
    grant = { scopes: ["support", "moderation"], position: "support_agent", note: "n", revoked_at: null };
    const { removeFromSupport } = await import("./staff-actions");
    const r = await removeFromSupport({ userId: USER, reason: "Only moderation from now on" });
    expect(r.ok).toBe(true);
    const g = calls.find((c) => c.fn === "admin_grant_staff")!;
    expect(g.args.p_scopes).toEqual(["moderation"]);
    /* The Support Agent position's whole bundle is support: it goes, so no bundle can bring support back. */
    expect(g.args.p_position).toBeNull();
    expect(audits.map((a) => a.action)).toEqual(["staff.support_removed"]);
    const notice = inserts.find((i) => i.table === "notifications")!.row;
    expect(notice.title).toBe("Support is no longer one of your desks");
    expect(String(notice.body)).toContain("Reports and moderation");
    expect(String(notice.body)).not.toMatch(/Access given/);
  });

  it("ends the access when support was all they had", async () => {
    grant = { scopes: ["support"], position: "support_agent", note: null, revoked_at: null };
    const { removeFromSupport } = await import("./staff-actions");
    const r = await removeFromSupport({ userId: USER, reason: "Left the company" });
    expect(r).toEqual({ ok: true, data: { ended: true } });
    expect(calls.map((c) => c.fn)).toEqual(["admin_revoke_staff"]);
  });

  it("passes the database's refusal on, and changes nothing else", async () => {
    removeStatus = "forbidden";
    const { removeFromSupport } = await import("./staff-actions");
    const r = await removeFromSupport({ userId: USER, reason: "Not my call to make" });
    expect(r.ok).toBe(false);
    expect(calls.map((c) => c.fn)).toEqual(["admin_remove_support"]);
    expect(inserts).toEqual([]);
  });
});
