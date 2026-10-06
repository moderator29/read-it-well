/**
 * NOTHING ON A FREQUENT PATH ANIMATES LAYOUT (round 5, W1; the source guard is
 * `no-layout-motion.test.ts`). Read off a real Chromium: what each element
 * transitions, and where its box is on the first frame of the change.
 *
 *   the dock     the chosen word's box is its full size on the first frame
 *                (it used to grow `max-width` and `margin` per frame) and the
 *                glyph starts where it stood, carried by the body's translate;
 *   the bowl     on a touch screen, a focused field snaps the bowl's box once
 *                and the form is DRAWN where the bowl is, on a registered
 *                length that only transforms read;
 *   the bloom    the pointer bloom moves on `translate`, not `left`/`top`;
 *   progress     the fill moves on transform and is the track's width.
 *
 * Each with its reduced-motion answer: the settled state at once.
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

const DOCK_CSS = productCss("app/css/chrome.css", "app/css/shell-m.css", "app/css/nav-island.css");

const dock = `
  import { mount } from "@/lib/testing/browser-root";
  const Tab = ({ id, on, word }: { id: string; on?: boolean; word: string }) => (
    <li className="nf-tab">
      <a className="nf-tab__link" id={id} aria-current={on ? "page" : undefined}>
        <span className="nf-tab__body" id={id + "-body"}>
          <span className="nf-tab__icon" id={id + "-icon"} style={{ width: 24, height: 24 }} />
          <span className="nf-tab__label" id={id + "-label"}>{word}</span>
        </span>
      </a>
    </li>
  );
  window.__choose = () => document.getElementById("b")!.setAttribute("data-on", "");
  mount(<div className="nf-dockrow" style={{ padding: 16 }}>
    <ul className="nf-tabbar" style={{ display: "flex", width: 320, listStyle: "none", margin: 0, padding: 0 }}>
      <Tab id="a" on word="Home" />
      <Tab id="b" word="Saved" />
      <Tab id="c" word="Trips" />
    </ul>
  </div>);
`;

const box = (page: Page, id: string) =>
  page.evaluate((i) => {
    const r = document.getElementById(i)!.getBoundingClientRect();
    return { x: r.left + r.width / 2, w: r.width };
  }, id);
const css = (page: Page, id: string, prop: string) =>
  page.evaluate(([i, p]) => (getComputedStyle(document.getElementById(i!)!) as unknown as Record<string, string>)[p!] ?? "", [id, prop] as const);

/** The slot and its link carry no layout motion of the word's; the link's own centre is the reference. */
const linkCentre = (page: Page) => box(page, "b");

describe.skipIf(!hasBrowser && !process.env.CI)("no layout motion on the frequent paths", () => {
  it("the dock word takes its room at once and the glyph slides from where it stood", async () => {
    const { page, close } = await mountInBrowser({ entry: dock, css: DOCK_CSS });
    try {
      /* Nothing the word transitions over time is a layout property. */
      const props = (await css(page, "b-label", "transitionProperty")).split(", ");
      const durs = (await css(page, "b-label", "transitionDuration")).split(", ");
      const timed = props.filter((_, i) => durs[i] !== "0s");
      expect(timed).toEqual(["opacity", "transform"]);
      expect(await css(page, "b-body", "transitionProperty")).toBe("translate");

      const iconBefore = await box(page, "b-icon");
      const centreBefore = await linkCentre(page);
      expect(Math.abs(iconBefore.x - centreBefore.x)).toBeLessThan(1);

      /* The frame the change lands on, measured in the same task as the tap:
         the word's box is already its settled width. */
      const first = await page.evaluate(() => {
        (window as unknown as { __choose: () => void }).__choose();
        const at = (i: string) => {
          const r = document.getElementById(i)!.getBoundingClientRect();
          return { x: r.left + r.width / 2, w: r.width };
        };
        return { label: at("b-label"), icon: at("b-icon"), centre: at("b") };
      });
      const { label: firstLabel, icon: firstIcon, centre: firstCentre } = first;
      /* And the glyph is still on the link's centre: the body's translate holds it there. */
      expect(Math.abs(firstIcon.x - firstCentre.x), `glyph ${firstIcon.x} centre ${firstCentre.x}`).toBeLessThan(3);
      expect(await css(page, "b-label", "maxWidth")).toBe("88px");

      await page.waitForTimeout(600);
      const settledLabel = await box(page, "b-label");
      expect(firstLabel.w).toBeGreaterThan(20);
      expect(Math.abs(firstLabel.w - settledLabel.w)).toBeLessThan(0.5);
      /* Settled: the glyph has moved left of centre, beside its word, and the body rests untranslated. */
      expect(await css(page, "b-body", "translate")).toBe("none");
      const settledIcon = await box(page, "b-icon");
      expect(settledIcon.x).toBeLessThan((await linkCentre(page)).x - 10);
    } finally {
      await close();
    }
  });

  it("under reduced motion the dock word and its glyph are settled at once", async () => {
    const { page, close } = await mountInBrowser({ entry: dock, css: DOCK_CSS, reducedMotion: true });
    try {
      expect(await css(page, "b-label", "transitionDuration")).toBe("0s");
      expect(await css(page, "b-body", "transitionDuration")).toBe("0s");
      await page.evaluate(() => (window as unknown as { __choose: () => void }).__choose());
      expect(await css(page, "b-body", "translate")).toBe("none");
      expect(await css(page, "b-label", "opacity")).toBe("1");
    } finally {
      await close();
    }
  });

  const AUTH_CSS = productCss("app/css/auth.css");
  const auth = `
    import { mount } from "@/lib/testing/browser-root";
    mount(<main className="nf-auth nf-slate" id="auth">
      <header className="nf-auth-cap" id="cap"><div className="nf-auth-cap__ground" id="ground" /></header>
      <div className="nf-auth__body" id="body">
        <div className="nf-auth__stage"><section className="nf-auth__island">
          <h1 className="nf-auth__title" id="title">Sign in</h1>
          <input id="email" />
        </section></div>
      </div>
    </main>);
  `;

  it("the bowl closes on a registered length that only transforms read", async () => {
    const { page, close } = await mountInBrowser({ entry: auth, css: AUTH_CSS });
    try {
      /* A touch screen: `pointer: coarse`, where the short bowl lives. */
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
      await cdp.send("Emulation.setEmitTouchEventsForMouse", { enabled: true });
      expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true);

      expect(await css(page, "cap", "transitionProperty")).not.toMatch(/height/);
      expect(await css(page, "title", "transitionProperty")).toBe("scale");
      expect(await css(page, "auth", "transitionProperty")).toBe("--nf-cap-now");
      const restH = (await page.evaluate(() => document.getElementById("cap")!.getBoundingClientRect().height));
      const restBody = (await page.evaluate(() => document.getElementById("body")!.getBoundingClientRect().top));

      await page.focus("#email");
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));
      /* The box snapped once, to 8.5rem... */
      const capH = await page.evaluate(() => document.getElementById("cap")!.getBoundingClientRect().height);
      expect(capH).toBeCloseTo(136, 0);
      /* ...and the form is still drawn near where it stood, carried by its translate. */
      const drawnBody = await page.evaluate(() => document.getElementById("body")!.getBoundingClientRect().top);
      expect(drawnBody).toBeGreaterThan(restBody - (restH - 136) * 0.5);
      expect(await css(page, "title", "fontSize")).toBe("30px");

      await page.waitForTimeout(700);
      const settledBody = await page.evaluate(() => document.getElementById("body")!.getBoundingClientRect().top);
      expect(Math.abs(settledBody - (restBody - (restH - 136)))).toBeLessThan(1);
      expect(await css(page, "title", "scale")).toBe("0.8667");
    } finally {
      await close();
    }
  });

  it("the pointer bloom and the progress fill move on transform", async () => {
    const entry = `
      import { mount } from "@/lib/testing/browser-root";
      import { Progress } from "@/components/ui/Progress";
      mount(<div>
        <div className="nf-ambient"><span /><span /><span /><span id="bloom" /></div>
        <div style={{ width: 300 }}><Progress value={40} label="Upload" /></div>
      </div>);
    `;
    /* Tailwind's `block h-full` stood in for, since the harness compiles no utilities. */
    const css2 = productCss("app/css/ambient.css") + '[role="progressbar"] { height: 6px; overflow: hidden } [role="progressbar"] > span { display: block; height: 100% }';
    const { page, close } = await mountInBrowser({ entry, css: css2 });
    try {
      expect(await css(page, "bloom", "transitionProperty")).toBe("translate");
      /* The fill is the track's width, set on a transform (its transition
         class is Tailwind's `transition-transform`, held by the source guard). */
      const fill = await page.evaluate(() => {
        const bar = document.querySelector('[role="progressbar"]')!;
        const span = bar.firstElementChild as HTMLElement;
        return { inline: span.style.width, transform: span.style.transform, cls: span.className, w: span.getBoundingClientRect().width, track: bar.getBoundingClientRect().width };
      });
      expect(fill.inline).toBe("");
      expect(fill.transform).toBe("translateX(-60%)");
      expect(fill.cls).toMatch(/\btransition-transform\b/);
      expect(fill.w).toBeCloseTo(fill.track, 0);
      /* 40 per cent of the track is lit: the fill's right edge, after the slide. */
      await page.waitForTimeout(600);
      const right = await page.evaluate(() => {
        const bar = document.querySelector('[role="progressbar"]')!;
        return (bar.firstElementChild as HTMLElement).getBoundingClientRect().right - bar.getBoundingClientRect().left;
      });
      expect(right).toBeCloseTo(120, 0);
    } finally {
      await close();
    }
  });
});
