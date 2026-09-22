import { describe, expect, it } from "vitest";
import { entryRedirect, safeDesk } from "./entry";

describe("the landing rule by address (R-E)", () => {
  it("sends the first desk request of a session to the overview, carrying the desk", () => {
    expect(entryRedirect("/admin/money", "", false)).toBe("/admin?next=%2Fadmin%2Fmoney");
    expect(entryRedirect("/admin/escrow", "status=DISPUTED", false)).toBe(
      "/admin?next=%2Fadmin%2Fescrow%3Fstatus%3DDISPUTED",
    );
    expect(entryRedirect("/admin/listings/abc", "?tab=x", false)).toBe(
      "/admin?next=%2Fadmin%2Flistings%2Fabc%3Ftab%3Dx",
    );
  });
  it("lets the overview itself and an entered session through", () => {
    expect(entryRedirect("/admin", "next=%2Fadmin%2Fmoney", false)).toBeNull();
    expect(entryRedirect("/admin/money", "", true)).toBeNull();
    expect(entryRedirect("/home", "", false)).toBeNull();
  });
  it("offers back only a console desk, never another site", () => {
    expect(safeDesk("%2Fadmin%2Fmoney")).toBe("/admin/money");
    expect(safeDesk("/admin/escrow?status=DISPUTED")).toBe("/admin/escrow?status=DISPUTED");
    expect(safeDesk("https://evil.example/admin/")).toBeNull();
    expect(safeDesk("//evil.example")).toBeNull();
    expect(safeDesk("/home")).toBeNull();
    expect(safeDesk("/admin")).toBeNull();
    expect(safeDesk(null)).toBeNull();
    expect(safeDesk("%E0%A4%A")).toBeNull();
  });
  it("round-trips: what the gate sends is what the overview offers", () => {
    const sent = entryRedirect("/admin/escrow", "status=DISPUTED", false)!;
    const next = new URL(`https://x${sent}`).searchParams.get("next");
    expect(safeDesk(next)).toBe("/admin/escrow?status=DISPUTED");
  });
});
