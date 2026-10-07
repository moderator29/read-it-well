/**
 * THE VERIFICATION-PASSED MOMENT, IN CHROMIUM (round 5, "something is
 * verified"; MOTION_SYSTEM "Verification passed: shield assembles, tick
 * embosses, pop"). The real approved plate (`KycStatus`) on the product's
 * tokens and the payoff's own stylesheet. Everything is read from the
 * computed animations, paused and seeked, never from the clock.
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

/* The few layout utilities the plate is built from (the harness has no
   Tailwind), so the geometry compared below is the real one. */
const UTILITIES =
  ".flex{display:flex}.flex-wrap{flex-wrap:wrap}.items-start{align-items:flex-start}.items-center{align-items:center}" +
  ".grid{display:grid}.place-items-center{place-items:center}.size-14{width:3.5rem;height:3.5rem}.shrink-0{flex-shrink:0}" +
  ".min-w-0{min-width:0}.flex-1{flex:1 1 0%}.gap-md{gap:1rem}.gap-xs{gap:.5rem}.p-lg{padding:1.5rem}.mt-lg{margin-top:1.5rem}.mt-xs{margin-top:.5rem}";
/* animation.css carries the reduced-motion floor the quiet answer must survive. */
const CSS = productCss("app/css/animation.css", "app/css/status-track.css", "components/verification/verified-payoff.css") + UTILITIES;
/* The plate's cookie is scoped to the route, so the page stands where the route does. */
const URL = "http://vallo.test/verification";

type Opts = { payoff?: boolean; seen?: "passed" | "approved"; pause?: boolean; saver?: boolean };
const entryWith = (opts: Opts = {}) => `
  import { createRoot } from "react-dom/client";
  import { mount } from "@/lib/testing/browser-root";
  import { KycStatus } from "@/components/verification/KycStatus";
  localStorage.clear();
  ${opts.seen ? `localStorage.setItem("nf-seen:verification-${opts.seen}:tier-1", "1");` : ""}
  ${opts.saver ? `document.documentElement.setAttribute("data-save-data", "on");` : ""}
  /* The hand: every vibration the one feedback grammar asks for. */
  window.__buzz = [];
  Object.defineProperty(navigator, "vibrate", { configurable: true, value: (p) => { window.__buzz.push(p); return true; } });
  const status = ${opts.payoff === false ? `{ state: "approved" }` : `{ state: "approved", payoff: { tier: 1 } }`};
  mount(<div style={{ width: 358 }}><KycStatus status={status} locale="en" /></div>);
  /* Paused on the first frame the plate is up (React commits after the first animation frame). */
  ${opts.pause ? `const hold = () => { const all = document.getAnimations(); if (all.length) all.forEach((a) => a.pause()); else requestAnimationFrame(hold); }; requestAnimationFrame(hold);` : ""}
  /* A second visit on this device: the same plate, the server still saying "news". */
  window.__again = () => {
    const host = document.createElement("div");
    host.id = "again";
    document.body.append(host);
    createRoot(host).render(<div style={{ width: 358 }}><KycStatus status={status} locale="en" /></div>);
  };
`;

type Anim = { name: string; delay: number; duration: number; props: string[]; frames: Record<string, string>[] };
const animsOf = (page: Page, selector: string): Promise<Anim[]> =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return [];
    return el.getAnimations().map((a) => {
      const t = a.effect!.getComputedTiming();
      const frames = (a.effect as KeyframeEffect).getKeyframes() as unknown as Record<string, string>[];
      const props = [...new Set(frames.flatMap((f) => Object.keys(f)))].filter(
        (k) => !["offset", "easing", "composite", "computedOffset"].includes(k),
      );
      return { name: (a as CSSAnimation).animationName, delay: Math.round(Number(t.delay)), duration: Math.round(Number(t.duration)), props, frames };
    });
  }, selector);
const allAnims = (page: Page) => page.evaluate(() => document.getAnimations().map((a) => (a as CSSAnimation).animationName));
const buzz = (page: Page) => page.evaluate(() => (window as unknown as { __buzz: unknown[] }).__buzz);
const settle = (page: Page) => page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)).then(() => undefined));
/** Seek every animation (they are paused) to one moment and read what is seen. */
const at = (page: Page, ms: number) =>
  page.evaluate((t) => {
    for (const a of document.getAnimations()) a.currentTime = t;
    const o = (sel: string) => Number(getComputedStyle(document.querySelector(sel)!).opacity);
    return {
      was: o(".nf-vpass__was"),
      shield: o(".nf-vpass__shield"),
      disc: o(".nf-vpass__badge"),
      title: o(".nf-vpass__words > :first-child"),
      track: o(".nf-vpass__track"),
      pop: getComputedStyle(document.querySelector(".nf-vpass")!).transform,
    };
  }, ms);

describe.skipIf(!hasBrowser && !process.env.CI)("the verification-passed moment", () => {
  it("the pending plate becomes the verified plate in place: the waiting object leaves as the shield assembles, the tick embosses, one pop, then the words", async () => {
    const { page, close } = await mountInBrowser({ entry: entryWith({ pause: true }), css: CSS, url: URL });
    try {
      const [was] = await animsOf(page, ".nf-vpass__was");
      const [shield] = await animsOf(page, ".nf-vpass__shield");
      const [disc] = await animsOf(page, ".nf-vpass__badge");
      const [tick] = await animsOf(page, ".nf-vpass__tick");
      const [pop] = await animsOf(page, ".nf-vpass");
      const [title] = await animsOf(page, ".nf-vpass__words > :first-child");
      const [body] = await animsOf(page, ".nf-vpass__words > :nth-child(2)");
      const [track] = await animsOf(page, ".nf-vpass__track");
      expect([was, shield, disc, tick, pop, title, body, track].map((a) => a?.name)).toEqual([
        "nf-vpass-leave",
        "nf-vpass-assemble",
        "nf-vpass-emboss",
        "nf-vpass-draw",
        "nf-vpass-pop",
        "nf-vpass-rise",
        "nf-vpass-rise",
        "nf-vpass-rise",
      ]);
      /* The storyboard, from the duration tokens: hold 160, the object turns
         (240 out, 380 in), the tick at 400, the pop at 640 for 180ms, then the
         words 60ms apart. */
      expect([was!.delay, was!.duration]).toEqual([160, 240]);
      expect([shield!.delay, shield!.duration]).toEqual([160, 380]);
      expect([disc!.delay, disc!.duration, tick!.delay]).toEqual([400, 580, 400]);
      expect([pop!.delay, pop!.duration]).toEqual([640, 180]);
      expect(pop!.frames.map((f) => f.transform ?? "")).toContain("scale(1.04)");
      expect([title!.delay, body!.delay, track!.delay]).toEqual([640, 700, 760]);
      /* Transform and opacity only (the tick's own stroke draw aside). */
      for (const a of [was, shield, disc, pop, title, body, track]) {
        for (const p of a!.props) expect(["opacity", "transform"]).toContain(p);
      }
      expect(tick!.props).toEqual(["strokeDashoffset"]);

      /* Frame 0 is the waiting plate's object, alone; the verified words are not yet said. */
      expect(await at(page, 0)).toMatchObject({ was: 1, shield: 0, disc: 0, title: 0, track: 0, pop: "none" });
      /* Just before the pop: nothing has been felt yet. */
      await at(page, 600);
      await page.waitForTimeout(80);
      expect(await buzz(page)).toEqual([]);
      /* Mid-pop: the shield is whole, the tick is on it, the mark is lifted, and the hand felt it once. */
      const mid = await at(page, 730);
      expect(mid).toMatchObject({ was: 0, shield: 1, disc: 1 });
      expect(mid.pop).not.toBe("none");
      await page.waitForTimeout(80);
      expect(await buzz(page)).toEqual([[14, 70, 28]]);
      /* At rest: the plain verified plate. The waiting object and the disc are gone, and nothing more is felt. */
      expect(await at(page, 2000)).toMatchObject({ was: 0, shield: 1, disc: 0, title: 1, track: 1, pop: "none" });
      await page.waitForTimeout(80);
      expect(await buzz(page)).toHaveLength(1);
    } finally {
      await close();
    }
  });

  it("is remembered at once: both doors' keys and the route cookie, so a reload or a second visit never plays it", async () => {
    const { page, close } = await mountInBrowser({ entry: entryWith(), css: CSS, url: URL });
    try {
      expect(await page.evaluate(() => [localStorage.getItem("nf-seen:verification-passed:tier-1"), localStorage.getItem("nf-seen:verification-approved:tier-1")])).toEqual(["1", "1"]);
      expect(await page.evaluate(() => document.cookie)).toContain("nf_vpass=1");
      await settle(page);
      await page.evaluate(() => (window as unknown as { __again: () => void }).__again());
      await page.waitForTimeout(120);
      expect(await page.locator("#again .nf-vpass-plate").getAttribute("data-vpass-seen")).toBe("");
      expect(await page.evaluate(() => document.querySelector("#again")!.getAnimations({ subtree: true }).length)).toBe(0);
      expect(await buzz(page), "felt once, not twice").toHaveLength(1);
    } finally {
      await close();
    }
  });

  it("cannot play without the server's passed state, nor where this device already saw it through either door", async () => {
    const cases: [string, Opts][] = [
      ["not news (no payoff from the server)", { payoff: false }],
      ["seen here", { seen: "passed" }],
      ["seen through /agent/verification", { seen: "approved" }],
    ];
    for (const [name, opts] of cases) {
      const { page, close } = await mountInBrowser({ entry: entryWith(opts), css: CSS, url: URL });
      try {
        await page.waitForTimeout(120);
        expect(await allAnims(page), name).toEqual([]);
        expect(await buzz(page), name).toEqual([]);
        if (opts.payoff === false) expect(await page.locator(".nf-vpass-plate, .nf-vpass__was").count(), name).toBe(0);
        else expect(await page.locator(".nf-vpass__was").evaluate((el) => getComputedStyle(el).opacity), name).toBe("0");
      } finally {
        await close();
      }
    }
  });

  it("quiet readers get the same story as one crossfade (opacity only, 160ms, no pop), Off gets the settled plate, and every one of them feels it once", async () => {
    const modes: [string, { reducedMotion?: boolean; motion?: "calm" | "off" }, Opts][] = [
      ["reduced motion", { reducedMotion: true }, {}],
      ["calm", { motion: "calm" }, {}],
      ["data saving", {}, { saver: true }],
    ];
    for (const [name, mode, opts] of modes) {
      const { page, close } = await mountInBrowser({ entry: entryWith(opts), css: CSS, url: URL, ...mode });
      try {
        const names = await allAnims(page);
        expect(names, name).not.toContain("nf-vpass-pop");
        expect(names, name).not.toContain("nf-vpass-emboss");
        const [was] = await animsOf(page, ".nf-vpass__was");
        const [shield] = await animsOf(page, ".nf-vpass__shield");
        const [title] = await animsOf(page, ".nf-vpass__words > :first-child");
        expect([was?.name, was?.duration, shield?.name, shield?.duration], name).toEqual(["nf-vpass-fade-out", 160, "nf-vpass-fade-in", 160]);
        expect([title?.name, title?.delay], name).toEqual(["nf-vpass-fade-in", 160]);
        for (const a of [was, shield, title]) expect(a!.props, name).toEqual(["opacity"]);
        await settle(page);
        expect(await buzz(page), name).toEqual([[14, 70, 28]]);
      } finally {
        await close();
      }
    }
    const off = await mountInBrowser({ entry: entryWith(), css: CSS, url: URL, motion: "off" });
    try {
      await off.page.waitForTimeout(120);
      expect(await allAnims(off.page)).toEqual([]);
      expect(await off.page.evaluate(() => [".nf-vpass__was", ".nf-vpass__shield"].map((s) => getComputedStyle(document.querySelector(s)!).opacity))).toEqual(["0", "1"]);
      expect(await buzz(off.page)).toEqual([[14, 70, 28]]);
    } finally {
      await off.close();
    }
  });

  it("settles into exactly the plain approved plate: the shield, the words and the track are where they always are", async () => {
    const measure = async (opts: Opts) => {
      const { page, close } = await mountInBrowser({ entry: entryWith(opts), css: CSS, url: URL });
      try {
        await settle(page);
        return await page.evaluate(() => {
          const r = (el: Element | null) => {
            const b = el!.getBoundingClientRect();
            return [b.x, b.y, b.width, b.height].map(Math.round);
          };
          return {
            shield: r(document.querySelector('[data-art="shield"]')),
            title: r(document.querySelector("h2")),
            section: r(document.querySelector("section")),
          };
        });
      } finally {
        await close();
      }
    };
    expect(await measure({})).toEqual(await measure({ payoff: false }));
  });
});
