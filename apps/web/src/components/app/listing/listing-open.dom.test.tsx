/**
 * A LISTING OPENS, MOUNTED FOR REAL (round 5). The real card, the real hero
 * gallery and lightbox, the real motion modules (photo-morph, nav-origin,
 * nav-direction's `animateBack`) and the product's compiled cascade, in
 * Chromium, with the browser's own View Transitions API. The App Router is the
 * one thing stood in for: a click on the card starts the view transition and
 * swaps the screen inside it, as React does for a navigation, and the in-app
 * back goes through `animateBack` exactly as `performBack` calls it.
 *
 * What is read is what the browser was told to animate: every animation on a
 * `::view-transition-*` pseudo-element, recorded at `ready` (its keyframes'
 * properties, duration, delay and curve), never the clock.
 *
 *   press      the card sinks on pointerdown, before any click
 *   open       the photograph flies on ONE transform (no width or height) on
 *              the route's duration and `land` curve; the lead card settles
 *              60ms behind it; the hero is never in the arrival stagger
 *   back       the photograph folds back into the card's own photo box
 *   reduced    no transform anywhere; an opacity crossfade in which the card
 *              leaves last going in, and returns first coming back
 *   gallery    closing the lightbox on another photo moves the hero to it and
 *              folds into it, rather than vanishing
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Page } from "playwright-core";
import { BROWSER_TEST_TIMEOUT, closeBrowser, hasBrowser, mountInBrowser } from "@/lib/testing/mount-in-browser";
import { appCss } from "@/lib/testing/locale-fit";
import { warmBrowser } from "@/lib/testing/mount-in-browser";
import { SHELF } from "@/app/(dev)/preview/f3/fixtures";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT * 2 });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const L = SHELF[0]!;
const PATH = `/listing/${L.id}`;

const entryFor = (wait: boolean) => `
  import { useEffect, useState } from "react";
  import { flushSync } from "react-dom";
  import { getDictionary } from "@vallo/i18n";
  import { mount } from "@/lib/testing/browser-root";
  import { ListingCard } from "@/components/app/ListingCard";
  import { ListingGallery } from "@/components/app/listing/ListingGallery";
  import { PhotoViewerProvider } from "@/components/app/listing/PhotoViewer";
  import { SHELF } from "@/app/(dev)/preview/f3/fixtures";
  import { applyOrigin, captureOrigin } from "@/lib/motion/nav-origin";
  import { animateBack, markNav } from "@/lib/motion/nav-direction";
  import { ListingHandoffGate } from "@/components/app/listing/ListingHandoffShell";
  const WAIT = ${wait};

  const t = getDictionary("en");
  const L = SHELF[0];
  const PHOTOS = ["/p/one.jpg", "/p/two.jpg"];
  const onListing = () => window.location.pathname.startsWith("/listing/");
  let go = () => {};

  function App() {
    const [screen, setScreen] = useState(onListing() ? "detail" : "list");
    go = (next) => flushSync(() => setScreen(next));
    useEffect(() => {
      const onPop = () => go(onListing() ? "detail" : "list");
      window.addEventListener("popstate", onPop);
      return () => window.removeEventListener("popstate", onPop);
    }, []);
    return (
      <main className="nf-page-stage">
        {screen === "detail" && WAIT ? (
          <ListingHandoffGate verifiedLabel="Verified" fallback={<div>rows</div>} />
        ) : screen === "list" ? (
          <div>
            <div style={{ padding: "280px 16px 0", width: 220 }}>
              <ListingCard listing={L} locale="en" t={t} index={0} />
            </div>
          </div>
        ) : (
          <PhotoViewerProvider title={L.title} photos={PHOTOS} hue={L.hue} kind={L.kind}>
            <div className="nf-cat-surface mx-auto max-w-5xl">
              <ListingGallery listingId={L.id} title={L.title} hue={L.hue} kind={L.kind} photos={PHOTOS} floatingBack={false} />
              <div className="relative z-10 -mt-xl">
                <section className="nf-panel nf-panel--card nf-rise nf-detail-lead" style={{ padding: 16 }}>
                  <h1 className="nf-h2">{L.title}</h1>
                  <p className="nf-detail-price">N1</p>
                </section>
              </div>
              <div style={{ height: 1200 }} />
            </div>
          </PhotoViewerProvider>
        )}
      </main>
    );
  }

  /* RouteTransition's two listeners, in its order: the origin in the capture
     phase, before the card's own click handler; the navigation after it. */
  document.addEventListener("click", (event) => {
    const a = event.target.closest && event.target.closest("a.nf-pcard__link");
    if (!a) return;
    markNav("forward");
    captureOrigin(a, new URL(a.href));
  }, true);
  window.addEventListener("click", (event) => {
    const a = event.target.closest && event.target.closest("a.nf-pcard__link");
    if (!a) return;
    event.preventDefault();
    const path = new URL(a.href).pathname;
    document.startViewTransition(() => {
      window.history.pushState({}, "", path);
      go("detail");
      applyOrigin(path, "forward");
    });
  });
  window.__back = () => animateBack(() => window.history.back());
  mount(<App />);
`;
const entry = entryFor(false);

/* Every view transition, and what the browser was told to animate in it. */
const RECORD = `
  window.__vts = [];
  const start = Document.prototype.startViewTransition;
  Document.prototype.startViewTransition = function (arg) {
    const vt = start.call(this, arg);
    const rec = { anims: null };
    window.__vts.push(rec);
    vt.ready.then(() => {
      const root = document.documentElement;
      rec.morph = root.getAttribute("data-nav-morph");
      rec.origin = root.getAttribute("data-nav-origin");
      rec.s = Number(root.style.getPropertyValue("--nf-morph-s"));
      rec.anims = document.getAnimations().filter((a) => a.effect && a.effect.pseudoElement).map((a) => {
        const kf = a.effect.getKeyframes();
        const props = [...new Set(kf.flatMap((k) => Object.keys(k).filter((p) => !["offset", "computedOffset", "easing", "composite"].includes(p))))];
        const t = a.effect.getTiming();
        return { pseudo: a.effect.pseudoElement, name: a.animationName, props, duration: t.duration, delay: t.delay, easing: kf[0] ? kf[0].easing : "" };
      });
    }, () => { rec.anims = []; });
    return vt;
  };
  window.__animated = [];
  const animate = Element.prototype.animate;
  Element.prototype.animate = function (keyframes, options) {
    window.__animated.push({ cls: String(this.className || ""), index: this.parentElement ? [...this.parentElement.children].indexOf(this) : -1, transform: Array.isArray(keyframes) ? keyframes.map((k) => k.transform || null) : [] });
    return animate.call(this, keyframes, options);
  };
`;

type Anim = { pseudo: string; name: string; props: string[]; duration: number; delay: number; easing: string };
type Vt = { anims: Anim[] | null; morph: string | null; origin: string | null; s: number };

const settle = (page: Page, ms: number) => page.waitForTimeout(ms);
const lastVt = async (page: Page, count: number): Promise<Vt> => {
  await page.waitForFunction(
    (n) => {
      const all = (window as unknown as { __vts: Vt[] }).__vts;
      return all.length >= n && all[n - 1]!.anims !== null;
    },
    count,
    { timeout: 15_000 },
  );
  return page.evaluate((n) => (window as unknown as { __vts: Vt[] }).__vts[n - 1]!, count);
};
const MOVES = ["transform", "translate", "scale", "width", "height", "rotate"];

async function openFromCard(page: Page) {
  /* Past the card's own entrance (nf-list-in, 520ms) before the tap. */
  await settle(page, 900);
  await page.locator("a.nf-pcard__link").click({ position: { x: 60, y: 40 } });
  return lastVt(page, 1);
}

describe.skipIf(!hasBrowser && !process.env.CI)("a listing opens, and folds back into its card", () => {
  it("the card sinks on pointerdown, before any click; a held thumb deepens into the hold; lift lets go", async () => {
    const { page, close } = await mountInBrowser({ entry, css: await appCss(), init: RECORD });
    try {
      await settle(page, 900);
      const at = await page.evaluate(async () => {
        const link = document.querySelector("a.nf-pcard__link")!;
        const card = link.closest("[data-testid=listing-card]") as HTMLElement;
        const sink = () =>
          card
            .getAnimations()
            .filter((a) => (a as CSSTransition).transitionProperty === "scale")
            .map((a) => String((a.effect as KeyframeEffect).getKeyframes().at(-1)?.scale));
        link.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, isPrimary: true, button: 0, pointerType: "touch" }));
        /* The same frame as the finger: no wait for a click. */
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        const down = { pressed: card.hasAttribute("data-pressed"), sink: sink() };
        await new Promise((r) => setTimeout(r, 260));
        const held = { holding: card.getAttribute("data-long-press"), scale: getComputedStyle(card).scale };
        link.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, isPrimary: true, button: 0, pointerType: "touch" }));
        await new Promise((r) => setTimeout(r, 500));
        return { down, held, up: { pressed: card.hasAttribute("data-pressed"), scale: getComputedStyle(card).scale } };
      });
      expect(at.down).toEqual({ pressed: true, sink: ["0.985"] });
      expect(at.held.holding).toBe("holding");
      expect(Number(at.held.scale)).toBeLessThan(0.985);
      expect(at.up.pressed).toBe(false);
      expect(at.up.scale, JSON.stringify(at)).toMatch(/^(none|1)$/);
    } finally {
      await close();
    }
  });

  it("opens: the photograph flies on one transform, the lead settles 60ms behind it", async () => {
    const { page, close } = await mountInBrowser({ entry, css: await appCss(), init: RECORD });
    try {
      const vt = await openFromCard(page);
      const name = `::view-transition-group(listing-photo-${L.id})`;
      const fly = vt.anims!.find((a) => a.pseudo === name);
      expect(vt.morph).toBe("open");
      expect(fly).toMatchObject({ name: "nf-morph-fly", props: ["transform"], duration: 380, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
      /* From the card's box: a card 188px wide into a hero 390px wide. */
      expect(vt.s).toBeGreaterThan(0.3);
      expect(vt.s).toBeLessThan(0.7);
      expect(vt.anims!.find((a) => a.pseudo === "::view-transition-new(nf-detail-lead)")).toMatchObject({
        name: "nf-lead-settle",
        delay: 60,
        duration: 380,
      });
      /* Nothing but the browser's own no-op root group animates a size. */
      const sized = vt.anims!.filter((a) => a.pseudo !== "::view-transition-group(root)" && (a.props.includes("width") || a.props.includes("height")));
      expect(sized).toEqual([]);
      /* The listing fades up in place; it does not also grow from the card. */
      expect(vt.anims!.filter((a) => a.pseudo === "::view-transition-new(root)").map((a) => a.name)).toEqual(["nf-route-fade-in"]);
    } finally {
      await close();
    }
  });

  it("back: the photograph folds into the card's own photo box", async () => {
    const { page, close } = await mountInBrowser({ entry, css: await appCss(), init: RECORD });
    try {
      await openFromCard(page);
      await settle(page, 1200);
      await page.evaluate(() => (window as unknown as { __back: () => void }).__back());
      const vt = await lastVt(page, 2);
      const fly = vt.anims!.find((a) => a.pseudo === `::view-transition-group(listing-photo-${L.id})`);
      expect(vt.morph).toBe("return");
      expect(vt.origin).toBe("return");
      expect(fly).toMatchObject({ name: "nf-morph-fly", props: ["transform"], duration: 380 });
      /* From the hero (390 wide) down into the card. */
      expect(vt.s).toBeGreaterThan(1.4);
      await settle(page, 900);
      /* Every lent name is given back. */
      expect(
        await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>("body [style*='view-transition-name']")].map((el) => `${el.className} ${el.style.viewTransitionName}`),
        ),
      ).toEqual([]);
    } finally {
      await close();
    }
  });

  it("reduced motion: nothing travels, and the card is the last to leave and the first back", async () => {
    const { page, close } = await mountInBrowser({ entry, css: await appCss(), init: RECORD, reducedMotion: true });
    try {
      const open = await openFromCard(page);
      expect(open.origin).toBe("quiet");
      expect(open.anims!.filter((a) => a.props.some((p) => MOVES.includes(p)))).toEqual([]);
      expect(open.anims!.find((a) => a.pseudo === "::view-transition-old(nf-origin)")).toMatchObject({
        name: "nf-route-fade-out",
        duration: 160,
        delay: 80,
      });
      expect(open.anims!.find((a) => a.pseudo === "::view-transition-new(root)")).toMatchObject({ name: "nf-route-fade-in", duration: 160 });

      await settle(page, 900);
      await page.evaluate(() => (window as unknown as { __back: () => void }).__back());
      const back = await lastVt(page, 2);
      expect(back.origin).toBe("quiet-return");
      expect(back.anims!.filter((a) => a.props.some((p) => MOVES.includes(p)))).toEqual([]);
      expect(back.anims!.find((a) => a.pseudo === "::view-transition-new(nf-origin)")).toMatchObject({ name: "nf-route-fade-in", duration: 160, delay: 0 });
      expect(back.anims!.find((a) => a.pseudo === "::view-transition-new(root)")).toMatchObject({ name: "nf-route-fade-in", delay: 80 });
    } finally {
      await close();
    }
  });

  it("the group's own wait, the frame a prefetched tap commits first, is the listing's shell, and the photo flies into it", async () => {
    const { page, close } = await mountInBrowser({ entry: entryFor(true), css: await appCss(), init: RECORD });
    try {
      const vt = await openFromCard(page);
      expect(vt.morph).toBe("open");
      expect(vt.anims!.find((a) => a.pseudo === `::view-transition-group(listing-photo-${L.id})`)).toMatchObject({ name: "nf-morph-fly", props: ["transform"] });
      expect(vt.anims!.find((a) => a.pseudo === "::view-transition-new(nf-detail-lead)")).toMatchObject({ name: "nf-lead-settle", delay: 60 });
      expect(await page.locator("[data-testid=listing-handoff] h1").textContent()).toBe(L.title);
    } finally {
      await close();
    }
  });

  it("a cold open: the hero is on screen from the first frame, never held for the stagger", async () => {
    const { page, close } = await mountInBrowser({ entry, css: await appCss(), url: `http://vallo.test${PATH}` });
    try {
      const hero = await page.evaluate(() => {
        const el = document.querySelector("[data-testid=listing-gallery]")!;
        return { name: getComputedStyle(el).animationName, opacity: getComputedStyle(el).opacity };
      });
      expect(hero).toEqual({ name: "none", opacity: "1" });
    } finally {
      await close();
    }
  });

  it("the lightbox closes onto the photo the reader ended on: the hero follows and the photo folds into it", async () => {
    const { page, close } = await mountInBrowser({ entry, css: await appCss(), init: RECORD, url: `http://vallo.test${PATH}` });
    try {
      await settle(page, 600);
      await page.locator("[data-testid=gallery-open]").first().click();
      await page.locator("[data-testid=listing-lightbox]").waitFor();
      await settle(page, 700);
      await page.evaluate(() => {
        const track = document.querySelector(".nf-photo-viewer__track") as HTMLElement;
        track.scrollTo({ left: track.clientWidth, behavior: "instant" });
      });
      await settle(page, 300);
      await page.evaluate(() => ((window as unknown as { __animated: unknown[] }).__animated.length = 0));
      await page.locator("[data-testid=lightbox-close]").click();
      await settle(page, 600);
      const after = await page.evaluate(() => {
        const hero = document.querySelector("[data-testid=listing-gallery] [role=group]") as HTMLElement;
        const folds = (window as unknown as { __animated: { index: number; transform: (string | null)[] }[] }).__animated.filter(
          (a) => a.transform.length === 2 && a.transform[0] === "none" && /scale/.test(a.transform[1] ?? ""),
        );
        return { heroAt: Math.round(hero.scrollLeft / hero.clientWidth), folds: folds.map((f) => f.index), open: !!document.querySelector("[data-testid=listing-lightbox]") };
      });
      expect(after).toEqual({ heroAt: 1, folds: [1], open: false });
    } finally {
      await close();
    }
  });
});
