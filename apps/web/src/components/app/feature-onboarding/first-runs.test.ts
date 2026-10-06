import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { TIERED_OBJECTS } from "@/design-system/icons/object-assets";
import {
  FIRST_RUN_HOME,
  MOUNTED_FIRST_RUNS,
  canMount,
  firstRunContent,
  isMountedFirstRun,
} from "./first-runs";
import {
  FEATURE_RUNS_COOKIE,
  featureRunsCookieString,
  firstRunHref,
  firstRunNext,
  parseFeatureRuns,
  shouldShowFirstRun,
  withFeatureRun,
  withFeatureRunPassed,
} from "./first-run-device";

/**
 * THE FIRST-RUN GRAMMAR, HELD BY A TEST (north star 14.1).
 *
 * One system, so the rules are checked once over every first run rather than
 * remembered per screen: one to three panels, each teaching something (a
 * title and a body), an object from the accepted set, a last action that is
 * not "Done", a home the member is handed to, and the forbidden places
 * nowhere. Then the device record and the gate's three-way rule, which is
 * where "at most once and never blocks" either holds or does not.
 */

const t = getDictionary("en");

describe("every mounted first run keeps the grammar", () => {
  it.each(MOUNTED_FIRST_RUNS)("%s: one to three panels, each with a title, a body and an accepted object", (feature) => {
    const content = firstRunContent(feature, t);
    expect(content.panels.length).toBeGreaterThanOrEqual(1);
    expect(content.panels.length).toBeLessThanOrEqual(3);
    for (const panel of content.panels) {
      expect(panel.title.trim()).not.toBe("");
      expect((panel.body ?? "").trim()).not.toBe("");
      expect(Object.keys(TIERED_OBJECTS)).toContain(panel.object);
    }
    expect(canMount(content)).toBe(true);
  });

  it.each(MOUNTED_FIRST_RUNS)("%s: the last action is the feature itself, never Done", (feature) => {
    const { action } = firstRunContent(feature, t);
    expect(action.trim()).not.toBe("");
    expect(action).not.toMatch(/^(done|finish|got it|ok)\b/i);
    expect(FIRST_RUN_HOME[feature]).toMatch(/^\//);
  });

  it("never lands on a surface 14.1 forbids: sign-in, search, the feed", () => {
    for (const home of Object.values(FIRST_RUN_HOME)) {
      expect(home).not.toMatch(/^\/(sign-in|sign-up|search|around|home)(\/|$)/);
    }
  });

  it("panel titles are distinct within a first run, so the pager's keys are stable", () => {
    for (const feature of MOUNTED_FIRST_RUNS) {
      const titles = firstRunContent(feature, t).panels.map((p) => p.title);
      expect(new Set(titles).size).toBe(titles.length);
    }
  });
});

describe("a first run exists only for a screen that exists", () => {
  /* D48: wallet, escrow and withdrawal were deleted, not parked. The guard
     that keeps them out is `lib/copy/custody-words.test.ts`. */
  it.each(["wallet", "escrow", "withdrawal"])("%s is not a first run", (feature) => {
    expect(isMountedFirstRun(feature)).toBe(false);
  });
});

describe("the device record", () => {
  it("reads only feature keys it knows, and records in a stable order", () => {
    expect([...parseFeatureRuns("host.passport.nonsense")]).toEqual(["host", "passport"]);
    expect([...parseFeatureRuns(null)]).toEqual([]);
    expect(withFeatureRun("passport", "host")).toBe("host.passport");
    expect(withFeatureRun("host", "host")).toBe("host");
  });

  it("writes a first-party cookie that lasts the 400 days browsers allow", () => {
    expect(featureRunsCookieString("host", true)).toBe(
      `${FEATURE_RUNS_COOKIE}=host; Path=/; Max-Age=34560000; SameSite=Lax; Secure`,
    );
  });

  it("hands the member on only to a safe same-origin path, and never into another first run", () => {
    expect(firstRunNext("/host?business=1", "/host")).toBe("/host?business=1");
    expect(firstRunNext("https://evil.example/", "/host")).toBe("/host");
    expect(firstRunNext("//evil.example", "/host")).toBe("/host");
    expect(firstRunNext("/first-run/passport", "/host")).toBe("/host");
    expect(firstRunNext(null, "/settings/passport")).toBe("/settings/passport");
  });

  it("adds the passed flag without losing a query or a hash", () => {
    expect(withFeatureRunPassed("/host")).toBe("/host?shown=1");
    expect(withFeatureRunPassed("/host?a=1#x")).toBe("/host?a=1&shown=1#x");
  });

  it("builds the first run's address with where the member was going", () => {
    expect(firstRunHref("host", "/host?x=1")).toBe("/first-run/host?next=%2Fhost%3Fx%3D1");
  });
});

describe("the gate shows a first run at most once and never traps anybody", () => {
  it("shows it when nothing has recorded it", () => {
    expect(shouldShowFirstRun({ server: "unknown", deviceSeen: false, passed: false })).toBe(true);
  });

  it("does not show it again once this device has", () => {
    expect(shouldShowFirstRun({ server: "unknown", deviceSeen: true, passed: false })).toBe(false);
  });

  it("lets a server answer win once Session 2 provides one (W7-R1)", () => {
    expect(shouldShowFirstRun({ server: "seen", deviceSeen: false, passed: false })).toBe(false);
    expect(shouldShowFirstRun({ server: "unseen", deviceSeen: false, passed: false })).toBe(true);
  });

  it("always lets the member through when they carry the passed flag", () => {
    expect(shouldShowFirstRun({ server: "unseen", deviceSeen: false, passed: true })).toBe(false);
  });
});
