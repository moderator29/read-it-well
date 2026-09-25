import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * TRACK K: THE DOOR REFUSES BY DEFAULT.
 *
 * A staff member holds no admin role. They pass `requireAdmin(scope)` only for
 * a scope the database says they hold, and only after acknowledging the
 * current handbook. Without a scope the door is exactly the old one, so every
 * desk that does not name a scope stays closed to staff.
 */

vi.mock("server-only", () => ({}));

let roles: string[] = [];
let staff: Record<string, unknown> | null = null;
const service = { service: true };

vi.mock("../actions/session", () => ({
  resolveSession: async () => ({
    state: "signed-in",
    user: { id: "u-1", email: "staff@example.com" },
    supabase: {
      from: () => ({
        select: () => ({ eq: async () => ({ data: roles.map((role) => ({ role })), error: null }) }),
      }),
      rpc: async () => ({ data: staff, error: null }),
    },
  }),
}));
vi.mock("../supabase/admin", () => ({ createAdminClient: () => service }));

const { requireAdmin, requireConsole } = await import("./guard");

beforeEach(() => {
  roles = [];
  staff = null;
});

const acked = (scopes: string[], acknowledged = true) => ({
  is_admin: false,
  is_super_admin: false,
  scopes,
  handbook_version: "2026-09-25",
  handbook_acknowledged: acknowledged,
});

describe("requireAdmin with a staff scope", () => {
  it("admits an admin on any scope, with their own client", async () => {
    roles = ["admin"];
    const a = await requireAdmin("guarantee");
    expect(a.state).toBe("admin");
    if (a.state === "admin") expect(a.isStaff).toBe(false);
  });

  it("refuses a staff member at a desk that names no scope", async () => {
    staff = acked(["support"]);
    expect((await requireAdmin()).state).toBe("not-admin");
  });

  it("refuses a staff member a scope they were not given", async () => {
    staff = acked(["support"]);
    expect((await requireAdmin("kyc_review")).state).toBe("not-admin");
  });

  it("refuses a staff member who has not acknowledged the handbook", async () => {
    staff = acked(["support"], false);
    expect((await requireAdmin("support")).state).toBe("not-admin");
  });

  it("admits a staff member on their own scope, marked as staff", async () => {
    staff = acked(["support"]);
    const a = await requireAdmin("support");
    expect(a.state).toBe("admin");
    if (a.state === "admin") {
      expect(a.isStaff).toBe(true);
      expect(a.isSuperAdmin).toBe(false);
      expect(a.supabase).toBe(service);
    }
  });

  it("ignores a scope name the product does not know", async () => {
    staff = acked(["everything"]);
    expect((await requireConsole()).state).toBe("not-admin");
  });

  it("keeps an ordinary member out of the console", async () => {
    staff = acked([]);
    expect((await requireConsole()).state).toBe("not-admin");
  });
});
