import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parentOf } from "@/lib/nav/resolve";
import { ADMIN_NAV } from "./nav";

/** R14: the console draws the shared back control, and back goes up the declared hierarchy. */
describe("the console's back control", () => {
  it("resolves a desk to its declared parent, the overview", () => {
    expect(parentOf("/admin/money")).toMatchObject({ kind: "parent", href: "/admin" });
  });
  it("resolves a record to its desk", () => {
    expect(parentOf("/admin/listings/9f1c")).toMatchObject({ kind: "parent", href: "/admin/listings" });
  });
  it("finds a declared parent for every desk the rail links to", () => {
    for (const item of ADMIN_NAV) {
      const path = item.href.split("?")[0]!;
      expect(parentOf(path).kind, path).toBe("parent");
    }
  });
  it("is mounted once, in the console layout, for every admin route", () => {
    const layout = readFileSync(new URL("../layout.tsx", import.meta.url), "utf8");
    expect(layout).toMatch(/import \{ BackButton \} from "@\/components\/site\/BackButton"/);
    expect(layout).toMatch(/back=\{<BackButton /);
    const frame = readFileSync(new URL("./AdminFrame.tsx", import.meta.url), "utf8");
    expect(frame).toContain('<span className="nf-admin-bar__back">{back}</span>');
  });
});
