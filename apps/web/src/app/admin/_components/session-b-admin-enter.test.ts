import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ENTRY_COOKIE, enterHref, enterTarget, entryRedirect } from "./entry";

const requireAdmin = vi.fn();
vi.mock("@/lib/admin/guard", () => ({ requireAdmin: () => requireAdmin() }));

const ADMIN = { state: "admin", user: { id: "0b7e3c1a-1111-4222-8333-444455556666" }, isAdmin: true, isSuperAdmin: false };

describe("the server-side entry's allow-list", () => {
  it("answers only the overview, bare or carrying a desk", () => {
    expect(enterTarget("/admin")).toBe("/admin");
    expect(enterTarget("/admin/")).toBe("/admin");
    expect(enterTarget("/admin?next=%2Fadmin%2Fmoney")).toBe("/admin?next=%2Fadmin%2Fmoney");
  });
  it("never answers a desk itself: a bare desk becomes the overview carrying it (R-E)", () => {
    expect(enterTarget("/admin/money")).toBe("/admin?next=%2Fadmin%2Fmoney");
    expect(enterTarget("/admin/escrow?status=DISPUTED")).toBe("/admin?next=%2Fadmin%2Fescrow%3Fstatus%3DDISPUTED");
    for (const next of ["/admin/money", "/admin/listings/abc", "/admin/escrow?status=DISPUTED", "/admin?next=%2Fadmin%2Fkyc"]) {
      const out = enterTarget(next);
      expect(out === "/admin" || out.startsWith("/admin?next=")).toBe(true);
    }
  });
  it("sends everything else to the overview", () => {
    expect(enterTarget(null)).toBe("/admin");
    expect(enterTarget("")).toBe("/admin");
    expect(enterTarget("https://evil.example/admin/money")).toBe("/admin");
    expect(enterTarget("//evil.example/admin/money")).toBe("/admin");
    expect(enterTarget("/home")).toBe("/admin");
    expect(enterTarget("/administrator")).toBe("/admin");
    expect(enterTarget("/admin/../wallet")).toBe("/admin");
    expect(enterTarget("/admin/enter")).toBe("/admin");
    expect(enterTarget("/admin/enter?next=%2Fadmin%2Fmoney")).toBe("/admin");
    expect(enterTarget("/admin?next=https%3A%2F%2Fevil.example")).toBe("/admin");
    expect(enterTarget("/admin?next=%2Fwallet")).toBe("/admin");
  });
  it("round-trips the gate's own link: desk -> overview carrying the desk", () => {
    const gate = entryRedirect("/admin/escrow", "status=DISPUTED", false)!;
    const link = new URL(`https://vallo.test${enterHref(gate)}`);
    expect(link.pathname).toBe("/admin/enter");
    expect(enterTarget(link.searchParams.get("next"))).toBe(gate);
  });
});

describe("GET /admin/enter", () => {
  beforeEach(() => requireAdmin.mockReset());
  const call = async (next: string | null) => {
    const { GET } = await import("../enter/route");
    const url = new URL("https://vallo.test/admin/enter");
    if (next !== null) url.searchParams.set("next", next);
    return GET(new NextRequest(url));
  };

  it("sets the entry cookie as the browser would and answers 303 to the overview carrying the desk, never the desk", async () => {
    requireAdmin.mockResolvedValue(ADMIN);
    const res = await call("/admin/money");
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://vallo.test/admin?next=%2Fadmin%2Fmoney");
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${ENTRY_COOKIE}=${ADMIN.user.id}`);
    expect(cookie).toMatch(/Path=\/admin(;|$)/);
    expect(cookie.toLowerCase()).toContain("samesite=lax");
    expect(cookie.toLowerCase()).not.toContain("httponly");
    expect(cookie.toLowerCase()).not.toMatch(/max-age|expires/);
  });

  it("lands on the overview carrying the desk when asked to", async () => {
    requireAdmin.mockResolvedValue(ADMIN);
    const res = await call("/admin?next=%2Fadmin%2Fmoney");
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://vallo.test/admin?next=%2Fadmin%2Fmoney");
  });

  it("refuses a target off the allow-list by landing on the overview", async () => {
    requireAdmin.mockResolvedValue(ADMIN);
    const res = await call("https://evil.example/");
    expect(res.headers.get("location")).toBe("https://vallo.test/admin");
  });

  it("gives a non-admin no cookie and sends them to /admin, which explains", async () => {
    for (const state of ["signed-out", "not-admin", "unconfigured"]) {
      requireAdmin.mockResolvedValue({ state });
      const res = await call("/admin/money");
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe("https://vallo.test/admin");
      expect(res.headers.get("set-cookie")).toBeNull();
    }
  });
});
