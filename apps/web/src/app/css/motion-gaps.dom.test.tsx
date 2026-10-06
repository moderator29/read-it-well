/**
 * THE FIVE GAPS, IN CHROMIUM (the product's tokens and the real stylesheets;
 * Session 3, C1). What the browser computes is the point: iteration counts,
 * durations, and whether the field's shake actually runs and replays.
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

const CSS = productCss("app/css/edge-m.css", "app/css/flow-m.css", "app/css/controls.css", "app/css/details.css", "app/css/shell-m.css");

const entry = `
  import { useState } from "react";
  import { mount } from "@/lib/testing/browser-root";
  import { watchRefusals } from "@/lib/ui/refusal";
  watchRefusals(document);
  function Form() {
    const [bad, setBad] = useState(false);
    window.__setBad = setBad;
    return <input id="f" className="nf-field" aria-invalid={bad || undefined} />;
  }
  mount(<div>
    <div id="hero" className="nf-hero-band" style={{ width: 300, height: 120 }} />
    <div id="summary" className="nf-summary" style={{ width: 300, height: 120 }} />
    <div id="bars"><span className="nf-steprow__bar" data-on="" id="bar" style={{ display: "block", width: 100, height: 6, position: "relative" }} /></div>
    <div className="nf-lw-head__object" id="obj" />
    <nav className="nf-tabbar"><a className="nf-tab"><span className="nf-tab__link" id="link" aria-current="page"><span className="nf-tab__label" id="label">Home</span></span></a></nav>
    <Form />
    <input id="born" className="nf-field" aria-invalid="true" defaultValue="" />
    <div className="nf-auth"><input id="authf" className="nf-field" aria-invalid="true" /></div>
    <div className="nf-ptr" data-refreshing="" id="ptr"><svg className="nf-ptr__ring" id="ring" viewBox="0 0 24 24" style={{ "--nf-ptr-a": "200deg", transform: "rotate(200deg)" }}><circle className="nf-ptr__track" cx="12" cy="12" r="9" /><circle id="arc" cx="12" cy="12" r="9" /></svg></div>
  </div>);
`;

const style = (page: Page, sel: string, prop: string, pseudo?: string) =>
  page.evaluate(([s, p, ps]) => (getComputedStyle(document.querySelector(s!)!, ps || null) as unknown as Record<string, string>)[p!], [sel, prop, pseudo ?? ""] as const);

describe.skipIf(!hasBrowser && !process.env.CI)("the five motion gaps", () => {
  it("the edge light's runners and ring take two laps and the flows' sheen and float stop after two passes", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS });
    try {
      expect(await style(page, "#hero", "animationIterationCount", "::before")).toBe("2");
      expect(await style(page, "#hero", "animationIterationCount", "::after")).toBe("2");
      expect(await style(page, "#summary", "animationIterationCount", "::before")).toBe("2");
      expect(await style(page, "#hero", "animationFillMode", "::before")).toBe("both");
      expect(await style(page, "#bar", "animationIterationCount", "::after")).toBe("2");
      /* The head object runs its pop once and its float twice. */
      expect(await style(page, "#obj", "animationIterationCount")).toBe("1, 2");
    } finally {
      await close();
    }
  });

  it("the dock's slot, word and pill all travel on drift at 240ms", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS });
    try {
      expect(await style(page, "#link", "transitionDuration", "::before")).toBe("0.24s, 0.24s");
      /* Four travel on drift; the fifth is white-space, a discrete flip held
         until the growth ends (c76109f9a), so it carries no duration. */
      expect(await style(page, "#label", "transitionDuration")).toBe("0.24s, 0.24s, 0.24s, 0.24s, 0s");
      expect(await style(page, "#label", "transitionBehavior")).toMatch(/allow-discrete$/);
      expect(await style(page, ".nf-tabbar .nf-tab", "transitionDuration")).toBe("0.24s");
    } finally {
      await close();
    }
  });

  const setBad = (page: Page, value: boolean) =>
    page.evaluate((v) => (window as unknown as { __setBad: (v: boolean) => void }).__setBad(v), value);
  const shaking = (page: Page) => page.evaluate(() => document.getElementById("f")!.getAnimations().length);

  it("a field that mounts already invalid does not shake (a form returned with its errors)", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS });
    try {
      await page.waitForTimeout(250);
      expect(await style(page, "#born", "animationName")).toBe("none");
      expect(await page.evaluate(() => document.getElementById("born")!.hasAttribute("data-refused"))).toBe(false);
      expect(await page.evaluate(() => document.getElementById("born")!.getAnimations().length)).toBe(0);
    } finally {
      await close();
    }
  });

  it("a field that becomes invalid shakes 4px once on whip 160ms, and replays when it is refused again", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS });
    try {
      expect(await style(page, "#f", "animationName")).toBe("none");
      await setBad(page, true);
      await expect.poll(() => style(page, "#f", "animationName")).toBe("nf-field-refuse");
      expect(await style(page, "#f", "animationDuration")).toBe("0.16s");
      expect(await style(page, "#f", "animationIterationCount")).toBe("1");
      expect(await style(page, "#f", "animationTimingFunction")).toBe("cubic-bezier(0.7, 0, 0.2, 1)");
      const frames = await page.evaluate(() =>
        (document.getElementById("f")!.getAnimations()[0]!.effect as KeyframeEffect).getKeyframes().map((k) => k.transform),
      );
      expect(frames).toContain("translate3d(-4px, 0px, 0px)");
      expect(frames).toContain("translate3d(4px, 0px, 0px)");
      /* Once: it ends and clears its own marker, and does not run again while the field stays invalid. */
      await expect.poll(() => page.evaluate(() => document.getElementById("f")!.hasAttribute("data-refused"))).toBe(false);
      expect(await shaking(page)).toBe(0);
      expect(await style(page, "#f", "animationName")).toBe("none");
      /* Cleared and refused again: it is a new animation, so it shakes again. */
      await setBad(page, false);
      await setBad(page, true);
      await expect.poll(() => shaking(page)).toBe(1);
      /* The auth screens keep their own shake: the shared one is not stacked on it. */
      expect(await style(page, "#authf", "animationName")).not.toBe("nf-field-refuse");
    } finally {
      await close();
    }
  });

  it("the field does not shake under reduced motion, Calm or Off", async () => {
    const quiet: { name: string; opts: Record<string, unknown> }[] = [
      { name: "reduced", opts: { reducedMotion: true } },
      { name: "calm", opts: { motion: "calm" } },
      { name: "off", opts: { motion: "off" } },
    ];
    for (const { name, opts } of quiet) {
      const { page, close } = await mountInBrowser({ entry, css: CSS, ...opts });
      try {
        await setBad(page, true);
        await page.waitForTimeout(60);
        expect(await page.evaluate(() => document.getElementById("f")!.hasAttribute("data-refused")), name).toBe(false);
        expect(await style(page, "#f", "animationName"), name).toBe("none");
        expect(await shaking(page), name).toBe(0);
        expect(await style(page, "#ptr .nf-ptr__ring", "animationName"), name).toBe("none");
      } finally {
        await close();
      }
    }
  });

  it("the pull-to-refresh mark spins one turn on glide over 620ms from where the drag left it", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS });
    try {
      expect(await style(page, "#ring", "animationName")).toBe("nf-ptr-spin");
      expect(await style(page, "#ring", "animationDuration")).toBe("0.62s");
      expect(await style(page, "#ring", "animationIterationCount")).toBe("1");
      /* Its end keyframe is the drag angle plus 360: 560deg, never a snap back to 0. */
      const end = await page.evaluate(() => {
        const a = document.getElementById("ring")!.getAnimations().find((x) => (x as CSSAnimation).animationName === "nf-ptr-spin")!;
        const frames = (a.effect as KeyframeEffect).getKeyframes();
        return frames[frames.length - 1]!.transform;
      });
      expect(end).toMatch(/rotate\(560deg\)|matrix/);
    } finally {
      await close();
    }
  });
});
