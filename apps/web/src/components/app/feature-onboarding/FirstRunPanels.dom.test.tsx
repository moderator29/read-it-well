/**
 * A feature's first run, mounted for real in Chromium on the product's own
 * stylesheet: the pager, that Skip is on every panel and lands on the working
 * feature, that the last action IS the feature (never "Done"), that both exits
 * REPLACE this entry rather than push another, the swipe, and what a reader who
 * asked for less motion is shown.
 *
 * The fixtures are the real first run for the host workspace, resolved against
 * the English dictionary exactly as the route does (`firstRunContent`), so no
 * panel title, body or label here is written by this test.
 *
 * HOW AN EXIT IS OBSERVED. Both exits (Skip and the last action) are a hard
 * `window.location.replace(...)` (A3-B1: the router cache may still hold the
 * gated page). `location` cannot be redefined in Chromium, so the test lets the
 * navigation happen on the stage (which answers every address with an empty
 * page) and reads where the tab ended up and whether the history grew: a
 * REPLACE leaves `history.length` where it was, a push would add one.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
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

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const CSS = productCss("components/app/feature-onboarding/feature-onboarding.css");

/* A browser that silently refuses the cookie: the write goes nowhere. */
const COOKIES_REFUSED = `Object.defineProperty(document, "cookie", { get() { return ""; }, set() {}, configurable: true });`;

function entry(opts: { panels?: number } = {}): string {
  return `
    import { getDictionary } from "@vallo/i18n";
    import { FirstRunPanels } from "@/components/app/feature-onboarding/FirstRunPanels";
    import { FIRST_RUN_HOME, firstRunContent } from "@/components/app/feature-onboarding/first-runs";
    import { mount } from "@/lib/testing/browser-root";
    const t = getDictionary("en");
    const content = firstRunContent("host", t);
    const c = t.experienceFeatures.firstRun;
    const panels = content.panels.slice(0, ${opts.panels ?? 99});
    window.__facts = {
      titles: panels.map((p) => p.title),
      action: content.action,
      name: content.name,
      home: FIRST_RUN_HOME.host,
      next: c.next,
      skip: c.skip,
    };
    mount(
      <FirstRunPanels
        feature="host"
        name={content.name}
        panels={panels}
        action={content.action}
        next={FIRST_RUN_HOME.host}
        copy={{ skip: c.skip, next: c.next, page: c.page, pager: c.pager, region: c.region }}
      />,
    );
  `;
}

type Facts = { titles: string[]; action: string; name: string; home: string; next: string; skip: string };
const facts = (page: Page) => page.evaluate(() => (window as unknown as { __facts: Facts }).__facts);
/* Run a click that leaves the page; say where it went and whether it replaced this entry. */
async function leaving(page: Page, click: () => Promise<void>) {
  const before = await page.evaluate(() => history.length);
  await Promise.all([page.waitForURL((url) => url.pathname !== "/"), click()]);
  const url = new URL(page.url());
  return { to: `${url.pathname}${url.search}`, grew: (await page.evaluate(() => history.length)) - before };
}

/* Which panel is the active one, by its position. */
const activeIndex = (page: Page) =>
  page.locator("section.nf-frun__panel").evaluateAll((els) => els.findIndex((el) => el.getAttribute("data-state") === "active"));

/* A touch swipe across the stage: the component ignores the mouse by design. */
async function swipe(page: Page, dx: number) {
  await page.locator(".nf-frun__stage").evaluate((stage, distance) => {
    const box = stage.getBoundingClientRect();
    const x0 = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const fire = (type: string, x: number) =>
      stage.dispatchEvent(
        new PointerEvent(type, { bubbles: true, pointerId: 7, pointerType: "touch", clientX: x, clientY: y, isPrimary: true }),
      );
    fire("pointerdown", x0);
    fire("pointermove", x0 + distance / 2);
    fire("pointermove", x0 + distance);
    fire("pointerup", x0 + distance);
  }, dx);
}

describe.skipIf(!hasBrowser && !process.env.CI)("a feature's first run", () => {
  it("opens on its first panel as one named page, with Skip, the pager and one Next", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: CSS });
    try {
      const f = await facts(page);
      const main = page.getByRole("main", { name: `Getting started with ${f.name}` });
      expect(await main.count()).toBe(1);
      expect(f.titles.length).toBeGreaterThanOrEqual(2);
      expect(await activeIndex(page)).toBe(0);
      /* Only the active panel is reachable; the others are inert and hidden. */
      const panels = page.locator("section.nf-frun__panel");
      expect(await panels.evaluateAll((els) => els.map((el) => el.hasAttribute("inert")))).toEqual(
        f.titles.map((_, i) => i !== 0),
      );
      expect(await panels.evaluateAll((els) => els.map((el) => el.getAttribute("aria-hidden")))).toEqual(
        f.titles.map((_, i) => (i === 0 ? "false" : "true")),
      );
      expect(await page.getByRole("heading", { level: 2, name: f.titles[0]! }).count()).toBe(1);
      /* The pager: one dot per panel, the first current, every one a 44px target. */
      const dots = page.getByRole("group", { name: "Pages" }).getByRole("button");
      expect(await dots.count()).toBe(f.titles.length);
      expect(await dots.evaluateAll((els) => els.map((el) => el.getAttribute("aria-current")))).toEqual(
        f.titles.map((_, i) => (i === 0 ? "step" : null)),
      );
      for (const box of await dots.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()))) {
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
      /* One primary: Next, and no link to the feature yet. */
      expect(await page.getByRole("button", { name: f.next, exact: true }).count()).toBe(1);
      expect(await page.getByRole("link", { name: f.action }).count()).toBe(0);
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("walks forward on Next, and the last action is the feature itself, never Done", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: CSS });
    try {
      const f = await facts(page);
      for (let i = 1; i < f.titles.length; i += 1) {
        await page.getByRole("button", { name: f.next, exact: true }).click();
        expect(await activeIndex(page)).toBe(i);
        expect(await page.getByRole("heading", { level: 2, name: f.titles[i]! }).count()).toBe(1);
      }
      /* On the last panel Next is gone and the feature's own action stands in its place. */
      expect(await page.getByRole("button", { name: f.next, exact: true }).count()).toBe(0);
      const action = page.getByRole("link", { name: f.action });
      expect(await action.count()).toBe(1);
      expect(await action.getAttribute("href")).toBe(f.home);
      expect(f.action.toLowerCase()).not.toContain("done");
      /* Still one primary on the page, and it passes axe on this panel too once
         the arrival has settled (axe reads colour, and a panel mid-fade is not
         the colour a person is left looking at). */
      expect(await page.locator(".nf-frun__action .nf-btn--primary").count()).toBe(1);
      await page.waitForTimeout(700);
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("keeps Skip on every panel, in the same place and in view, landing on the feature by replace", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: CSS });
    try {
      const f = await facts(page);
      const skip = page.getByRole("button", { name: f.skip, exact: true });
      const first = (await skip.boundingBox())!;
      /* The arrow keys are heard from inside the page, so start from Skip. */
      await skip.focus();
      for (let i = 0; i < f.titles.length; i += 1) {
        if (i > 0) await page.keyboard.press("ArrowRight");
        expect(await activeIndex(page)).toBe(i);
        const box = (await skip.boundingBox())!;
        expect(box).toEqual(first);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.y + box.height).toBeLessThanOrEqual(844);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
      /* From the LAST panel, so Skip is proven reachable at the end too. */
      const out = await leaving(page, () => skip.click());
      /* A replace, never a push: Back from the feature does not return here. */
      expect(out).toEqual({ to: f.home, grew: 0 });
    } finally {
      await close();
    }
  });

  it("moves with the arrow keys, stops at either end, and the dots jump to a panel", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: CSS });
    try {
      const f = await facts(page);
      const last = f.titles.length - 1;
      await page.getByRole("button", { name: f.skip, exact: true }).focus();
      await page.keyboard.press("ArrowLeft");
      expect(await activeIndex(page)).toBe(0);
      await page.keyboard.press("ArrowRight");
      expect(await activeIndex(page)).toBe(1);
      await page.keyboard.press("ArrowLeft");
      expect(await activeIndex(page)).toBe(0);
      for (let i = 0; i < f.titles.length + 2; i += 1) await page.keyboard.press("ArrowRight");
      expect(await activeIndex(page)).toBe(last);
      /* A dot goes straight back to its page and reports it as current. */
      const dots = page.getByRole("group", { name: "Pages" }).getByRole("button");
      await dots.nth(0).click();
      expect(await activeIndex(page)).toBe(0);
      expect(await dots.nth(0).getAttribute("aria-current")).toBe("step");
      expect(await dots.nth(last).getAttribute("aria-current")).toBeNull();
    } finally {
      await close();
    }
  });

  it("follows a swipe: past 56px it turns the page, short of it nothing changes, and the ends only lean", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: CSS });
    try {
      await swipe(page, -30);
      expect(await activeIndex(page)).toBe(0);
      await swipe(page, 90);
      expect(await activeIndex(page)).toBe(0);
      await swipe(page, -90);
      expect(await activeIndex(page)).toBe(1);
      await swipe(page, 90);
      expect(await activeIndex(page)).toBe(0);
      /* The drag offset is let go of: nothing is left displaced. */
      expect(await page.locator(".nf-frun__stage").evaluate((el) => el.style.getPropertyValue("--nf-frun-drag"))).toBe("0px");
      expect(await page.locator(".nf-frun__stage").getAttribute("data-dragging")).toBeNull();
      /* Turning pages is in-page: the tab never left. */
      expect(new URL(page.url()).pathname).toBe("/");
    } finally {
      await close();
    }
  });

  it("records the first run on this device and carries no flag on the exit when that sticks", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: CSS });
    try {
      const f = await facts(page);
      expect(await page.evaluate(() => document.cookie)).toContain("vallo_feature_runs=host");
      const out = await leaving(page, () => page.getByRole("button", { name: f.skip, exact: true }).click());
      expect(out).toEqual({ to: f.home, grew: 0 });
    } finally {
      await close();
    }
  });

  it("the last action leaves by replace too, to the feature, with no flag when the record stuck", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: CSS });
    try {
      const f = await facts(page);
      for (let i = 1; i < f.titles.length; i += 1) await page.getByRole("button", { name: f.next, exact: true }).click();
      const out = await leaving(page, () => page.getByRole("link", { name: f.action }).click());
      expect(out).toEqual({ to: f.home, grew: 0 });
    } finally {
      await close();
    }
  });

  it("when the browser refuses the record, both exits REPLACE with the passed flag and never push", async () => {
    const skipRun = await mountInBrowser({ entry: entry(), css: CSS, init: COOKIES_REFUSED });
    try {
      const f = await facts(skipRun.page);
      const out = await leaving(skipRun.page, () => skipRun.page.getByRole("button", { name: f.skip, exact: true }).click());
      expect(out).toEqual({ to: `${f.home}?shown=1`, grew: 0 });
    } finally {
      await skipRun.close();
    }

    const lastRun = await mountInBrowser({ entry: entry(), css: CSS, init: COOKIES_REFUSED });
    try {
      const f = await facts(lastRun.page);
      for (let i = 1; i < f.titles.length; i += 1) await lastRun.page.getByRole("button", { name: f.next, exact: true }).click();
      const out = await leaving(lastRun.page, () => lastRun.page.getByRole("link", { name: f.action }).click());
      expect(out).toEqual({ to: `${f.home}?shown=1`, grew: 0 });
    } finally {
      await lastRun.close();
    }
  });

  it("a one-panel run draws no pager, and its only button is the feature", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ panels: 1 }), css: CSS });
    try {
      const f = await facts(page);
      expect(f.titles).toHaveLength(1);
      expect(await page.getByRole("group", { name: "Pages" }).count()).toBe(0);
      expect(await page.getByRole("button", { name: f.next, exact: true }).count()).toBe(0);
      expect(await page.getByRole("link", { name: f.action }).count()).toBe(1);
      /* No second panel to go to: the arrow keys and a swipe do nothing. */
      await page.keyboard.press("ArrowRight");
      await swipe(page, -120);
      expect(await activeIndex(page)).toBe(0);
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("travels 32px from the side it was asked from when motion is allowed", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: CSS });
    try {
      const f = await facts(page);
      const x = (index: number) =>
        page
          .locator("section.nf-frun__panel")
          .nth(index)
          .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
      /* At rest: the panel to come waits 32px on its side. */
      expect(await x(1)).toBeCloseTo(32, 0);
      await page.getByRole("button", { name: f.next, exact: true }).click();
      await page.waitForTimeout(700);
      /* The one that left sits 32px to the other side; the arrival has landed. */
      expect(await x(0)).toBeCloseTo(-32, 0);
      expect(await x(1)).toBeCloseTo(0, 0);
    } finally {
      await close();
    }
  });

  it("under reduced motion turns the page with a 160ms fade and no travel", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: CSS, reducedMotion: true });
    try {
      const f = await facts(page);
      expect(await page.locator("main.nf-frun").getAttribute("data-quiet")).toBe("");
      const panel = (index: number) => page.locator("section.nf-frun__panel").nth(index);
      /* No panel is displaced, waiting or leaving. */
      for (let i = 0; i < f.titles.length; i += 1) {
        expect(await panel(i).evaluate((el) => getComputedStyle(el).transform)).toBe("none");
      }
      await page.getByRole("button", { name: f.next, exact: true }).click();
      expect(await activeIndex(page)).toBe(1);
      const style = await panel(1).evaluate((el) => {
        const s = getComputedStyle(el);
        return { property: s.transitionProperty, duration: s.transitionDuration, transform: s.transform };
      });
      expect(style).toEqual({ property: "opacity", duration: "0.16s", transform: "none" });
      /* The parts of the arriving panel do not stagger either. */
      expect(
        await panel(1).evaluate((el) => [...el.children].map((child) => getComputedStyle(child).transitionDelay)),
      ).toEqual(["0s", "0s", "0s"]);
      await page.waitForTimeout(300);
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });
});
