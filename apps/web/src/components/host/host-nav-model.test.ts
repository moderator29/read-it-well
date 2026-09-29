import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getDictionary, LOCALES } from "@vallo/i18n";
import {
  buildHostNav,
  HOST_DASHBOARD,
  HOST_NAV,
  hostNavActive,
  hostNavItems,
  hostNavLabels,
  hostTitleFor,
} from "./host-nav-model";

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

  it("reads every word from the dictionary, in every locale (M-2)", () => {
    for (const locale of LOCALES) {
      const labels = hostNavLabels(getDictionary(locale));
      for (const [key, value] of Object.entries(labels)) {
        expect(typeof value, `${locale} ${key}`).toBe("string");
        expect(value.trim().length, `${locale} ${key}`).toBeGreaterThan(0);
      }
      for (const item of hostNavItems(labels)) expect(item.label.length).toBeGreaterThan(0);
    }
  });

  it("draws the English it used to hard-code, now from en.ts", () => {
    const labels = hostNavLabels(getDictionary("en"));
    expect(hostNavItems(labels).map((item) => item.label)).toEqual([
      "Overview",
      "Reservations",
      "Rooms and nights",
      "Photographs",
      "Charges at the door",
      "Hand over",
      "Earnings",
      "Assistant",
      "Settings",
    ]);
    const [, account] = buildHostNav(labels);
    expect(account?.heading).toBe("Account");
    expect(account?.items.map((item) => item.label)).toEqual([
      "Assistant",
      "Settings",
      "Account settings",
      "Help and support",
    ]);
    expect(hostTitleFor(labels, "/host/rooms")).toBe("Rooms and nights");
    expect(hostTitleFor(labels, "/host/apply/step")).toBe("Application");
    expect(hostTitleFor(labels, "/host/notifications")).toBe("Notifications");
    expect(hostTitleFor(labels, "/host/start")).toBe("Host");
  });

  it("follows the locale where the locale says it differently", () => {
    const labels = hostNavLabels(getDictionary("yo"));
    const t = getDictionary("yo");
    expect(labels.settings).toBe(t.nav.settings);
    expect(labels.account).toBe(t.nav.accountLabel);
    expect(labels.workspace).toBe(t.nav.hostMode);
    expect(buildHostNav(labels)[1]?.heading).toBe(t.nav.accountLabel);
  });

  it("the shell and the client parts carry no English literal of their own", () => {
    for (const file of ["HostShell.tsx", "HostNav.tsx", "HostDrawer.tsx", "host-nav-model.ts"]) {
      const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), file), "utf8");
      for (const phrase of ['"Host workspace"', '"Notifications"', '"Overview"', '"Account settings"', "{count} unread"]) {
        expect(source, `${file} ${phrase}`).not.toContain(phrase);
      }
    }
  });
});
