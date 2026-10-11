/**
 * A REAL REDUCED-MOTION ALTERNATIVE IS NOT SWALLOWED BY THE FLOOR, IN CHROMIUM
 * (W2, round 5; MOTION_SYSTEM principle 8, the founder's "a real alternative,
 * not nothing").
 *
 * `animation.css` collapses every animation and transition to 0.01ms under
 * `prefers-reduced-motion` with an unlayered `!important` floor, which no
 * ordinary declaration can beat. So a component's own 160ms fade, written in
 * its own reduced-motion block, was instant in practice; the component tests
 * that asserted 160ms never loaded the floor, so they could not see it. Here
 * the floor is loaded with the product sheets, and the opt-in it now reads
 * (`--nf-reduced-duration`, `--nf-reduced-delay`, `--nf-reduced-transition`)
 * is held: an opted-in element keeps its fade, an element that did not opt in
 * is still collapsed, the opt-in is not inherited, and a loop still runs once.
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

const CSS = productCss("app/css/animation.css", "app/s/door.css", "app/css/document.css");

/* Fixtures beside the product rules: the opt-in on its own, its child, a
   transition, a loop and an element that never opted in. */
const FIXTURES = `
  @keyframes t-fade { from { opacity: 0; } }
  .t-opt { animation: t-fade 160ms both; --nf-reduced-duration: 160ms; --nf-reduced-delay: 80ms; }
  .t-opt > .t-kid { animation: t-fade 500ms both; }
  .t-plain { animation: t-fade 160ms both; }
  .t-loop { animation: t-fade 1s infinite; --nf-reduced-duration: 160ms; }
  .t-trans { transition: opacity 160ms; --nf-reduced-transition: 160ms; }
  .t-trans-plain { transition: opacity 160ms; }
`;

const ENTRY = `
  import { mount } from "@/lib/testing/browser-root";
  const sheet = document.createElement("style");
  sheet.textContent = ${JSON.stringify(FIXTURES)};
  document.head.appendChild(sheet);
  mount(<div>
    <div id="opt" className="t-opt"><div id="kid" className="t-kid" /></div>
    <div id="plain" className="t-plain" />
    <div id="loop" className="t-loop" />
    <div id="trans" className="t-trans" />
    <div id="transplain" className="t-trans-plain" />
    <div id="door" className="nf-door__card" />
    <div id="doc" className="nf-doc" />
  </div>);
`;

type Read = { name: string; duration: string; delay: string; count: string; transition: string };
const read = (page: Page, sel: string) =>
  page.evaluate((s) => {
    const cs = getComputedStyle(document.querySelector(s)!);
    return {
      name: cs.animationName,
      duration: cs.animationDuration,
      delay: cs.animationDelay,
      count: cs.animationIterationCount,
      transition: cs.transitionDuration,
    };
  }, sel) as Promise<Read>;

describe.skipIf(!hasBrowser && !process.env.CI)("the reduced-motion floor and its opt-in", () => {
  it("keeps an opted-in fade at its own length, and collapses everything that did not opt in", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS, reducedMotion: true });
    try {
      expect(await read(page, "#opt")).toMatchObject({ name: "t-fade", duration: "0.16s", delay: "0.08s", count: "1" });
      expect((await read(page, "#plain")).duration).toBe("1e-05s");
      /* Registered, not inherited: the child's own animation stays collapsed. */
      expect(await read(page, "#kid")).toMatchObject({ duration: "1e-05s", delay: "0s" });
      /* An opted-in loop still runs exactly once. */
      expect(await read(page, "#loop")).toMatchObject({ duration: "0.16s", count: "1" });
      expect((await read(page, "#trans")).transition).toBe("0.16s");
      expect((await read(page, "#transplain")).transition).toBe("1e-05s");
    } finally {
      await close();
    }
  });

  it("gives the product's own quiet fades their 160ms: the share door, the document sheet (the join door left on 7 October 2026: an invite link is a route into the one onboarding)", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS, reducedMotion: true });
    try {
      expect(await read(page, "#door")).toMatchObject({ name: "nf-door-fade", duration: "0.16s", count: "1" });
      expect(await read(page, "#doc")).toMatchObject({ name: "nf-doc-fade", duration: "0.16s", count: "1" });
    } finally {
      await close();
    }
  });

  it("changes nothing when motion is not reduced: the fixtures run at their own lengths", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      expect(await read(page, "#kid")).toMatchObject({ duration: "0.5s", delay: "0s" });
      expect(await read(page, "#loop")).toMatchObject({ duration: "1s", count: "infinite" });
      expect((await read(page, "#opt")).delay).toBe("0s");
    } finally {
      await close();
    }
  });
});
