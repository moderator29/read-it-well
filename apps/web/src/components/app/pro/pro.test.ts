import { describe, expect, it } from "vitest";
import {
  isCurrentEntitlement,
  presentEntitlement,
  resolveProEntitlement,
  type ProEntitlement,
} from "./pro-entitlement";
import { isProViewOn, proViewCookieString } from "./pro-view";

/**
 * THE PRESENCE RULE, PROVED ABSENT (D12, handoff acceptance 15: "Pro mode is
 * absent for unentitled members").
 *
 * The switch must render NOTHING, not a disabled switch, for every way of not
 * holding a plan: no entitlement, a read that throws, another workspace's
 * plan, a period that has ended. `presentEntitlement` is the whole of `ProSwitch`'s
 * decision, made before it reads a cookie or a dictionary, which is what lets
 * this run with no request at all; the positive case needs a request and is Session 4's to
 * prove on a device once W7-R4 lands.
 */

const NOW = Date.parse("2026-10-06T12:00:00Z");
const current: ProEntitlement = { scope: "host", planId: "p", currentUntil: "2026-11-06T00:00:00Z" };

describe("Pro switch presence", () => {
  it("is null for everybody until Session 2's check exists (W7-R4)", async () => {
    expect(await resolveProEntitlement("host")).toBeNull();
    expect(await resolveProEntitlement("agent")).toBeNull();
    expect(await presentEntitlement("host")).toBeNull();
  });

  it("renders nothing when the member holds nothing", async () => {
    expect(await presentEntitlement("host", async () => null, NOW)).toBeNull();
  });

  it("fails closed when the check throws", async () => {
    const resolve = async (): Promise<ProEntitlement | null> => {
      throw new Error("down");
    };
    expect(await presentEntitlement("host", resolve, NOW)).toBeNull();
  });

  it("renders nothing for another workspace's plan or an ended period", async () => {
    expect(await presentEntitlement("agent", async () => current, NOW)).toBeNull();
    const ended = { ...current, currentUntil: "2026-10-01T00:00:00Z" };
    expect(await presentEntitlement("host", async () => ended, NOW)).toBeNull();
    const garbled = { ...current, currentUntil: "soon" };
    expect(await presentEntitlement("host", async () => garbled, NOW)).toBeNull();
  });

  it("trusts only a current entitlement for the same scope", () => {
    expect(isCurrentEntitlement(current, "host", NOW)).toBe(true);
    expect(isCurrentEntitlement(current, "agent", NOW)).toBe(false);
    expect(isCurrentEntitlement(null, "host", NOW)).toBe(false);
  });
});

describe("the Pro view preference", () => {
  it("is on only for the exact word, so a stray value reads as off", () => {
    expect(isProViewOn("on")).toBe(true);
    expect(isProViewOn("true")).toBe(false);
    expect(isProViewOn(undefined)).toBe(false);
    expect(proViewCookieString(true, false)).toBe("vallo_pro_view=on; Path=/; Max-Age=34560000; SameSite=Lax");
  });
});
