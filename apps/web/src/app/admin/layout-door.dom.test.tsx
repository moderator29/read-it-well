import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * THE CONSOLE'S FRONT DOOR, for the support desk as for every desk: a
 * signed-in account that is not staff gets the site's ordinary 404 (nothing
 * confirms a console exists), a support agent gets the restricted staff
 * frame, and a support agent whose session has not proved the security key
 * gets the key screen and nothing else. The door itself is `requireAdmin` /
 * `requireConsole`, faked here to each answer.
 *
 * In the dom project only because the layout is TSX and the unit project's
 * react-server alias has no JSX runtime; nothing here is rendered.
 */

vi.mock("server-only", () => ({}));

type Door = "not-admin" | "signed-out" | "step-up" | "staff";
let door: Door = "not-admin";

vi.mock("@/lib/admin/guard", () => ({
  requireAdmin: async () => ({ state: door === "staff" ? "not-admin" : door }),
  requireConsole: async () =>
    door === "staff"
      ? {
          state: "console",
          user: { id: "u", email: "agent@example.com" },
          supabase: {},
          staff: { isAdmin: false, isSuperAdmin: false, scopes: ["support"], position: "support_agent", handbookVersion: "v", handbookAcknowledged: true, consoleVerified: true },
        }
      : door === "step-up"
        ? { state: "step-up", user: { id: "u" }, staff: {} }
        : { state: door },
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  },
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/locale", () => ({ getLocale: async () => "en" }));
vi.mock("@/lib/app/shell-queries", () => ({ getShellIdentity: async () => ({ userName: "Ada", avatarUrl: null, unreadNotifications: 0 }) }));
vi.mock("@/lib/admin/queries", () => ({ getQueueCounts: async () => ({ state: "unavailable" }) }));
vi.mock("@/lib/admin/reads/shared", () => ({ getPersonTiers: async () => new Map() }));
vi.mock("@/app/css/admin.css", () => ({}));
vi.mock("./_components/StaffFrame", () => ({ StaffFrame: () => "staff-frame" }));
vi.mock("./_components/AccessScreen", () => ({ AccessScreen: () => "access-screen" }));
vi.mock("./_components/ConsoleStepUp", () => ({ ConsoleStepUp: () => "step-up" }));
vi.mock("./_components/AdminFrame", () => ({ AdminFrame: () => "admin-frame" }));
vi.mock("./_components/EntryGate", () => ({ EntryGate: () => "entry-gate" }));
vi.mock("@/components/site/BackButton", () => ({ BackButton: () => "back" }));
vi.mock("@/components/passcode/PasscodeLayer", () => ({ PasscodeLayer: () => "passcode" }));

const { default: AdminLayout } = await import("./layout");

beforeEach(() => {
  door = "not-admin";
});

const typeName = (el: unknown) => {
  const t = (el as { type?: unknown } | null)?.type;
  return typeof t === "function" ? (t as () => string)() : String(t);
};

describe("the console door", () => {
  it("answers a signed-in member who is not staff with the ordinary 404", async () => {
    door = "not-admin";
    await expect(AdminLayout({ children: "desk" })).rejects.toThrow(/404/);
  });

  it("sends a staff member whose key is not proved to the key screen", async () => {
    door = "step-up";
    expect(typeName(await AdminLayout({ children: "desk" }))).toBe("step-up");
  });

  it("gives a support agent the restricted staff frame, never the operator's rail", async () => {
    door = "staff";
    expect(typeName(await AdminLayout({ children: "desk" }))).toBe("staff-frame");
  });

  it("asks a signed-out visitor to sign in", async () => {
    door = "signed-out";
    expect(typeName(await AdminLayout({ children: "desk" }))).toBe("access-screen");
  });
});
