/**
 * The Pro switch, the toggle it draws and the unlock moment, in two halves.
 *
 * PRESENCE (D12, north star 14.2) is decided on the server by `ProSwitch`, an
 * async server component, so it is called here as the function it is, with the
 * request's cookies and locale stubbed. Whatever it returns for an entitled
 * member is then mounted in real Chromium with exactly the props it produced,
 * so the DOM half proves what a member is left looking at. The rule: no
 * entitlement means NOTHING (not a greyed switch, not a padlock, no element),
 * and that fails closed for every way of not holding a plan.
 *
 * THE TOGGLE is a labelled switch carrying the word Pro and nothing else; no
 * locked, disabled or teaser state exists, so none can be drawn.
 *
 * THE UNLOCK plays only when Pro view turns on while somebody is looking:
 * never on a page already in Pro view, never for a re-render, never for a
 * reader who asked for less motion.
 *
 * Fixtures are structural: scopes, a plan id slot and dates relative to a fixed
 * clock. No plan name, price or tier is written here.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Page } from "playwright-core";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";
import { axeViolations } from "@/components/ui/ported-test-css";
import { productCss } from "@/lib/testing/product-css";

/* The request the server component reads: a cookie jar and a locale. */
const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === "vallo_pro_view" && jar.value !== undefined ? { value: jar.value } : undefined) }),
  headers: async () => new Headers(),
}));
vi.mock("@/lib/locale", () => ({ getLocale: async () => "en" }));

import { ProSwitch } from "./ProSwitch";
import { ProToggle } from "./ProToggle";
import type { ProEntitlement } from "./pro-entitlement";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);
beforeEach(() => {
  jar.value = undefined;
});

const CSS = productCss("components/app/pro/pro.css");
const NOW = Date.parse("2026-10-06T12:00:00Z");
const current: ProEntitlement = { scope: "host", planId: "plan-slot", currentUntil: "2026-11-06T00:00:00Z" };

/* The vibration motor, recorded: what the hand was told. */
const VIBRATE = `Object.defineProperty(navigator, "vibrate", { value: (p) => { (window.__vibes = window.__vibes || []).push(p); return true; }, configurable: true });`;
const vibes = (page: Page) => page.evaluate(() => (window as unknown as { __vibes?: unknown[] }).__vibes ?? []);
const routerCalls = (page: Page) =>
  page.evaluate(() => (window as unknown as { __router: { calls: unknown[][] } }).__router?.calls ?? []);

describe("the Pro switch's presence rule (server half)", () => {
  it("renders nothing for everybody until the entitlement check exists", async () => {
    expect(await ProSwitch({ scope: "host" })).toBeNull();
    expect(await ProSwitch({ scope: "agent" })).toBeNull();
  });

  it("renders nothing when the member holds nothing, the check throws, or the plan is for another workspace", async () => {
    expect(await ProSwitch({ scope: "host", resolve: async () => null, now: NOW })).toBeNull();
    expect(
      await ProSwitch({
        scope: "host",
        resolve: async () => {
          throw new Error("down");
        },
        now: NOW,
      }),
    ).toBeNull();
    expect(await ProSwitch({ scope: "agent", resolve: async () => current, now: NOW })).toBeNull();
  });

  it("renders nothing for a period that has ended or a date nobody can read", async () => {
    expect(
      await ProSwitch({ scope: "host", resolve: async () => ({ ...current, currentUntil: "2026-10-01T00:00:00Z" }), now: NOW }),
    ).toBeNull();
    expect(await ProSwitch({ scope: "host", resolve: async () => ({ ...current, currentUntil: "soon" }), now: NOW })).toBeNull();
  });

  it("never reads the device's Pro view cookie as evidence of a plan", async () => {
    jar.value = "on";
    expect(await ProSwitch({ scope: "host", resolve: async () => null, now: NOW })).toBeNull();
  });

  it("draws the toggle, with the word Pro, for a current entitlement on the same workspace", async () => {
    const out = await ProSwitch({ scope: "host", resolve: async () => current, now: NOW });
    expect(out).not.toBeNull();
    expect(out!.type).toBe(ProToggle);
    expect(out!.props).toEqual({ initialOn: false, label: "Pro", switchLabel: "Pro view" });
  });

  it("starts on only when the device's cookie says exactly on", async () => {
    jar.value = "on";
    const on = await ProSwitch({ scope: "host", resolve: async () => current, now: NOW });
    expect(on!.props.initialOn).toBe(true);
    jar.value = "true";
    const stray = await ProSwitch({ scope: "host", resolve: async () => current, now: NOW });
    expect(stray!.props.initialOn).toBe(false);
  });
});

/* The toggle exactly as the server component produced it. */
async function toggleEntry(cookie?: string): Promise<string> {
  jar.value = cookie;
  const out = await ProSwitch({ scope: "host", resolve: async () => current, now: NOW });
  return `
    import { ProToggle } from "@/components/app/pro/ProToggle";
    import { mount } from "@/lib/testing/browser-root";
    mount(<div style={{ padding: 16 }}><ProToggle {...${JSON.stringify(out!.props)}} /></div>);
  `;
}

describe.skipIf(!hasBrowser && !process.env.CI)("the Pro toggle (browser half)", () => {
  it("is a switch named Pro view, carrying the word Pro and nothing else, a 44px pill", async () => {
    const { page, close } = await mountInBrowser({ entry: await toggleEntry(), css: CSS });
    try {
      const sw = page.getByRole("switch", { name: "Pro view" });
      expect(await sw.count()).toBe(1);
      expect(await sw.getAttribute("aria-checked")).toBe("false");
      expect(await sw.locator(".nf-pro-switch__word").textContent()).toBe("Pro");
      /* Never a crown, a diamond, a padlock or a second word: no glyph at all. */
      expect(await sw.locator("svg, img, canvas").count()).toBe(0);
      expect((await sw.innerText()).trim()).toBe("Pro");
      expect(await sw.isDisabled()).toBe(false);
      const box = (await sw.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      /* 999px control: a pill says "this flips" (D2). */
      const radius = await sw.evaluate((el) => parseFloat(getComputedStyle(el).borderTopLeftRadius));
      expect(radius).toBeGreaterThanOrEqual(box.height / 2);
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("opens on when the server said so, and passes axe in that state too", async () => {
    const { page, close } = await mountInBrowser({ entry: await toggleEntry("on"), css: CSS });
    try {
      const sw = page.getByRole("switch", { name: "Pro view" });
      expect(await sw.getAttribute("aria-checked")).toBe("true");
      expect(await sw.getAttribute("data-on")).toBe("");
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("flips from the keyboard, writes the device preference, and asks the server to draw again", async () => {
    const { page, close } = await mountInBrowser({ entry: await toggleEntry(), css: CSS, init: VIBRATE });
    try {
      const sw = page.getByRole("switch", { name: "Pro view" });
      await page.keyboard.press("Tab");
      expect(await sw.evaluate((el) => el === document.activeElement)).toBe(true);
      await page.keyboard.press("Space");
      expect(await sw.getAttribute("aria-checked")).toBe("true");
      expect(await page.evaluate(() => document.cookie)).toContain("vallo_pro_view=on");
      expect(await routerCalls(page)).toEqual([["refresh"]]);
      await page.keyboard.press("Enter");
      expect(await sw.getAttribute("aria-checked")).toBe("false");
      expect(await page.evaluate(() => document.cookie)).toContain("vallo_pro_view=off");
      expect(await routerCalls(page)).toEqual([["refresh"], ["refresh"]]);
      /* One light "select" buzz per flip, the toggle grammar. */
      expect(await vibes(page)).toEqual([6, 6]);
    } finally {
      await close();
    }
  });

  it("moves its thumb on the track when motion is allowed, and settles it without a transition when not", async () => {
    const live = await mountInBrowser({ entry: await toggleEntry(), css: CSS });
    try {
      const thumb = live.page.locator(".nf-pro-switch__thumb");
      expect(await thumb.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0.24s");
      await live.page.getByRole("switch").click();
      await live.page.waitForTimeout(600);
      expect(await thumb.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41)).toBeCloseTo(14, 0);
    } finally {
      await live.close();
    }

    const quiet = await mountInBrowser({ entry: await toggleEntry(), css: CSS, reducedMotion: true, init: VIBRATE });
    try {
      const thumb = quiet.page.locator(".nf-pro-switch__thumb");
      expect(await thumb.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0s");
      await quiet.page.getByRole("switch").click();
      /* No frame between: the thumb is already where it ends. */
      expect(await thumb.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41)).toBeCloseTo(14, 0);
      /* And the tap's buzz is turned down with the motion. */
      expect(await vibes(quiet.page)).toEqual([]);
    } finally {
      await quiet.close();
    }
  });
});

/* A harness that turns Pro view on and off the way the page does after the server draws again. */
function unlockEntry(initial: boolean): string {
  return `
    import { useState } from "react";
    import { ProUnlock } from "@/components/app/pro/ProUnlock";
    import { mount } from "@/lib/testing/browser-root";
    function Harness() {
      const [on, setOn] = useState(${initial});
      const [renders, setRenders] = useState(0);
      return (
        <div style={{ padding: 16 }}>
          <button id="flip" type="button" onClick={() => setOn((v) => !v)}>flip</button>
          <button id="again" type="button" onClick={() => setRenders((n) => n + 1)}>render again {renders}</button>
          <ProUnlock on={on}><p id="surface">The Pro surface, slot</p></ProUnlock>
        </div>
      );
    }
    mount(<Harness />);
  `;
}

const playing = (page: Page) => page.locator(".nf-pro-unlock").getAttribute("data-play");
const surface = (page: Page) => page.locator("#surface").count();

describe.skipIf(!hasBrowser && !process.env.CI)("the Pro unlock moment", () => {
  it("draws nothing at all while Pro view is off, and never an invitation", async () => {
    const { page, close } = await mountInBrowser({ entry: unlockEntry(false), css: CSS, init: VIBRATE });
    try {
      expect(await surface(page)).toBe(0);
      expect(await page.locator(".nf-pro-unlock").count()).toBe(0);
      await page.waitForTimeout(500);
      expect(await vibes(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("plays nothing on a page that is already in Pro view, however long it stays, or when it re-renders", async () => {
    const { page, close } = await mountInBrowser({ entry: unlockEntry(true), css: CSS, init: VIBRATE });
    try {
      expect(await surface(page)).toBe(1);
      expect(await playing(page)).toBeNull();
      await page.locator("#again").click();
      await page.locator("#again").click();
      await page.waitForTimeout(700);
      expect(await playing(page)).toBeNull();
      expect(await page.locator(".nf-pro-unlock").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
      expect(await vibes(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("plays once on off to on: the lift and the veil, then one success buzz, and not on on to off", async () => {
    const { page, close } = await mountInBrowser({ entry: unlockEntry(false), css: CSS, init: VIBRATE });
    try {
      await page.locator("#flip").click();
      expect(await surface(page)).toBe(1);
      expect(await playing(page)).toBe("");
      const names = await page.locator(".nf-pro-unlock").evaluate((el) => ({
        lift: getComputedStyle(el).animationName,
        veil: getComputedStyle(el, "::after").animationName,
        pop: getComputedStyle(el.querySelector(".nf-pro-unlock__pop")!).animationName,
      }));
      expect(names).toEqual({ lift: "nf-pro-lift", veil: "nf-pro-veil", pop: "nf-pro-pop" });
      /* The buzz lands with the pop, after the lift, and only once. */
      expect(await vibes(page)).toEqual([]);
      await page.waitForTimeout(900);
      expect(await vibes(page)).toEqual([[14, 70, 28]]);
      /* Off removes the surface and plays nothing. */
      await page.locator("#flip").click();
      expect(await surface(page)).toBe(0);
      await page.waitForTimeout(600);
      expect(await vibes(page)).toEqual([[14, 70, 28]]);
      /* And it is a real change each time: on again plays again. */
      await page.locator("#flip").click();
      expect(await playing(page)).toBe("");
      await page.waitForTimeout(900);
      expect(await vibes(page)).toEqual([[14, 70, 28], [14, 70, 28]]);
    } finally {
      await close();
    }
  });

  it("leaves the surface readable when it has settled, and passes axe", async () => {
    const { page, close } = await mountInBrowser({ entry: unlockEntry(false), css: CSS });
    try {
      await page.locator("#flip").click();
      await page.waitForTimeout(900);
      expect(await page.locator("#surface").isVisible()).toBe(true);
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("for a reader who asked for less motion, shows the surface at once: no lift, no veil, no pop, no buzz", async () => {
    for (const mode of [{ reducedMotion: true }, { motion: "calm" as const }, { motion: "off" as const }]) {
      const { page, close } = await mountInBrowser({ entry: unlockEntry(false), css: CSS, init: VIBRATE, ...mode });
      try {
        await page.locator("#flip").click();
        expect(await surface(page)).toBe(1);
        expect(await playing(page)).toBeNull();
        expect(await page.locator("#surface").isVisible()).toBe(true);
        await page.waitForTimeout(700);
        expect(await vibes(page)).toEqual([]);
        expect(await page.locator(".nf-pro-unlock").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
      } finally {
        await close();
      }
    }
  });
});
