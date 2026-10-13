/**
 * The lister's payoff, the day a listing is live, mounted in Chromium with the
 * product's stylesheets and read from computed animations (round 5, a lister
 * publishing):
 *
 *   - it cannot play before the server's row says PUBLISHED: an in-review
 *     listing shows nothing, whatever else is true;
 *   - it plays once: the Live mark pops 1.0 to 1.04 to 1.0 over 180ms after
 *     the page settles (240ms), and one heavy haptic is felt as the pop starts;
 *   - it never plays again for that publication on this device, across a
 *     re-render and a remount;
 *   - when the page's arrival sheet is announcing it (?done=listing-live, M4's
 *     surface) the row does not say it again, and it is still marked seen;
 *   - reduced motion: no pop, the line fades in over 160ms, and the haptic is
 *     felt at once, the same story settled.
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
import { productCss } from "@/lib/testing/product-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const CSS = productCss("app/css/success.css", "app/css/lister-live.css");
const BUZZ = `Object.defineProperty(navigator, "vibrate", { configurable: true, value: (p) => { (window.__buzz = window.__buzz || []).push(p); return true; } });`;
const HEAVY = [14, 70, 28];

/* The f5 workspace fixture; its first row is the one that changes state. The
   publication time is two hours before the test runs, as a server would write it. */
const ENTRY = `
  import { useState } from "react";
  import { mount } from "@/lib/testing/browser-root";
  import { getDictionary } from "@vallo/i18n";
  import { ListingsWorkspace } from "@/app/agent/listings/ListingsWorkspace";
  import { AGENT_LISTINGS } from "@/app/(dev)/preview/f5/ops-fixtures";
  const t = getDictionary("en");
  const published = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
  const rows = (stage) => AGENT_LISTINGS.map((row, i) =>
    i === 0 ? { ...row, status: stage === "live" ? "PUBLISHED" : "UNDER_REVIEW", publishedAt: stage === "live" ? published : null } : row);
  function Harness() {
    const [stage, setStage] = useState(window.__stage || "review");
    const [key, setKey] = useState(0);
    window.__stageTo = setStage;
    window.__remount = () => setKey((k) => k + 1);
    return (
      <ListingsWorkspace
        key={key} t={t.agentListings} reference={t.listingReference} listings={rows(stage)} locale="en"
        liveCopy={{ title: t.success.moments.listingLive.title, body: t.success.moments.listingLive.body, open: t.experienceLister.live.open }}
        liveArrivalId={window.__arrival}
      />
    );
  }
  mount(<Harness />);
`;

type Motion = { name: string; duration: number; delay: number; frames: string[] };

function read(page: Page): Promise<{ payoffs: number; mark: Motion[]; line: Motion[]; buzz: unknown[] }> {
  return page.evaluate(() => {
    const motions = (selector: string) =>
      [...document.querySelectorAll(selector)].flatMap((el) =>
        el.getAnimations().map((a) => {
          const effect = a.effect as KeyframeEffect;
          return {
            name: (a as CSSAnimation).animationName,
            duration: Number(effect.getTiming().duration),
            delay: Number(effect.getTiming().delay),
            frames: effect.getKeyframes().map((f) => String(f.transform ?? "")),
          };
        }),
      );
    return {
      payoffs: document.querySelectorAll('[data-testid="live-payoff"]').length,
      mark: motions(".nf-live-payoff__mark"),
      line: motions(".nf-live-payoff__line"),
      buzz: (window as unknown as { __buzz?: unknown[] }).__buzz ?? [],
    };
  });
}

const settle = (page: Page) => page.waitForTimeout(900);
const remount = async (page: Page) => {
  await page.evaluate(() => (window as unknown as { __remount: () => void }).__remount());
  await settle(page);
};

describe.runIf(hasBrowser)("the live payoff", () => {
  it("does not play while the server says the listing is in review, then plays once when it says live", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS, init: BUZZ });
    try {
      await settle(page);
      expect(await read(page)).toMatchObject({ payoffs: 0, mark: [], buzz: [] });

      /* The server's rows now say PUBLISHED; the next visit decides. */
      await page.evaluate(() => (window as unknown as { __stageTo: (s: string) => void }).__stageTo("live"));
      await remount(page);
      const live = await read(page);
      expect(live.payoffs).toBe(1);
      expect(live.mark).toEqual([expect.objectContaining({ name: "nf-success-payoff", duration: 180, delay: 240 })]);
      expect(live.mark[0]!.frames).toEqual(["none", "scale(1.04)", "none"]);
      expect(live.line).toEqual([expect.objectContaining({ name: "nf-live-rise", duration: 380, delay: 420 })]);
      /* One heavy haptic, felt with the pop. */
      expect(live.buzz).toEqual([HEAVY]);
      expect(await page.locator('[data-testid="live-payoff"] a[href^="/listing/"]').count()).toBe(1);

      /* Never again for this publication: a re-render and a remount. */
      await page.evaluate(() => (window as unknown as { __stageTo: (s: string) => void }).__stageTo("live"));
      await remount(page);
      await remount(page);
      expect(await read(page)).toMatchObject({ payoffs: 0, mark: [], buzz: [HEAVY] });
    } finally {
      await close();
    }
  });

  it("leaves the moment to the arrival sheet when the page is announcing it, and marks it seen", async () => {
    const { page, close } = await mountInBrowser({
      entry: ENTRY,
      css: CSS,
      init: `${BUZZ} window.__stage = "live"; window.__arrival = "00000000-0000-4000-8000-00000000a101";`,
    });
    try {
      await settle(page);
      expect(await read(page)).toMatchObject({ payoffs: 0, buzz: [] });
      await page.evaluate(() => {
        (window as unknown as { __arrival?: string }).__arrival = undefined;
      });
      await remount(page);
      expect(await read(page)).toMatchObject({ payoffs: 0, buzz: [] });
    } finally {
      await close();
    }
  });

  it("under reduced motion lands settled: no pop, a 160ms fade, and the haptic at once", async () => {
    const { page, close } = await mountInBrowser({
      entry: ENTRY,
      css: CSS,
      init: `${BUZZ} window.__stage = "live";`,
      reducedMotion: true,
    });
    try {
      await page.waitForSelector('[data-testid="live-payoff"]');
      const quiet = await read(page);
      expect(quiet.mark).toEqual([]);
      expect(quiet.line).toEqual([expect.objectContaining({ name: "nf-live-fade", duration: 160, delay: 0 })]);
      expect(quiet.buzz).toEqual([HEAVY]);
    } finally {
      await close();
    }
  });
});
