import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { HOST_DASHBOARD, HOST_NAV, hostNavActive } from "./host-nav-model";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "app");

describe("the host workspace navigation", () => {
  it("points only at host screens that exist", () => {
    for (const item of HOST_NAV) {
      expect(item.href.startsWith("/host")).toBe(true);
      expect(existsSync(join(APP, `${item.href}/page.tsx`.replace(/^\//, "")))).toBe(true);
    }
  });

  it("leads with the overview, which is where the mark goes", () => {
    expect(HOST_NAV[0]?.href).toBe(HOST_DASHBOARD);
    expect(HOST_DASHBOARD).toBe("/host");
  });

  it("leaves the application and the kind chooser out: they are flows", () => {
    const hrefs = HOST_NAV.map((item) => item.href);
    expect(hrefs).not.toContain("/host/apply");
    expect(hrefs).not.toContain("/host/start");
  });

  it("lights the overview only on /host itself, not on every host path", () => {
    expect(hostNavActive("/host")).toBe("/host");
    expect(hostNavActive("/host/")).toBe("/host");
    expect(hostNavActive("/host/rooms")).toBe("/host/rooms");
    expect(hostNavActive("/host/photos")).toBe("/host/photos");
    expect(hostNavActive("/host/apply")).toBeNull();
    expect(hostNavActive("/hosting")).toBeNull();
    expect(hostNavActive(null)).toBeNull();
  });
});
