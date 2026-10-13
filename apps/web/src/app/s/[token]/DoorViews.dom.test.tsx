/**
 * The share door's faces, mounted for real in Chromium on the door's own
 * stylesheet (`app/s/door.css`) and the container tiers. What a stranger opening
 * a link on a phone is held to:
 *
 *   - the listing is the screen's ONE Island; the honest states (an example, a
 *     gone or missing link, an unreachable read) are Cards and never a second
 *     Island;
 *   - the figure LEADS the card (display face, figure size, tabular, larger than
 *     everything under it) and NEVER COUNTS: its text is written once and never
 *     rolls into place, because the stranger is reading a price somebody quoted;
 *   - with no figure there is no figure element, only the honest ask-for-it line;
 *   - the entrance is CSS, once: a 16px rise with its rows 60ms apart when motion
 *     is allowed, a 160ms fade for reduced motion and for Calm, and nothing at all
 *     for Off; the waiting card never moves; and nothing waits on any of it
 *     (every control is in the page and tappable from the first frame);
 *   - axe passes, once settled.
 *
 * Fixtures are slots: no listing, place, price or reference is invented, and the
 * "figure" is the words "The move-in figure, slot", which the view prints as it
 * is handed it (the real wording is `lib/share/door.ts`'s, already worded).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Page } from "playwright-core";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";
import { axeViolations } from "@/components/ui/ported-test-css";
import { GLASS_CSS, productCss } from "@/lib/testing/product-css";

vi.mock("@/lib/locale", () => ({ getLocale: async () => "en" }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {}, push() {}, replace() {} }) }));
import DoorLoading from "./loading";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const CSS = productCss(GLASS_CSS, "app/css/base.css", "app/css/typography.css", "app/css/chips.css", "app/css/controls.css", "app/s/door.css");

const LISTING = { kind: "listing", listingId: "listing-slot", reference: "REF-SLOT", place: "The place, slot", bedrooms: null };

function entry(view: "listing" | "example" | "gone" | "missing" | "unreachable", opts: { headline?: string | null; second?: string | null } = {}): string {
  const headline = opts.headline === undefined ? "The move-in figure, slot" : opts.headline;
  const second = opts.second === undefined ? "The rent beneath it, slot" : opts.second;
  return `
    import { getDictionary } from "@vallo/i18n";
    import { DoorListingView, DoorExampleView, DoorStateView } from "@/app/s/[token]/DoorViews";
    import { mount } from "@/lib/testing/browser-root";
    const copy = getDictionary("en").frontDoor.door;
    window.__copy = copy;
    const lines = { title: "The listing's title, slot", headline: ${JSON.stringify(headline)}, second: ${JSON.stringify(second)}, bedrooms: "The bedrooms, slot" };
    const view = ${JSON.stringify(view)};
    mount(
      <div className="nf-door">
        <div className="nf-door__stage">
          {view === "listing" ? <DoorListingView card={${JSON.stringify(LISTING)}} lines={lines} photo={null} copy={copy} /> : null}
          {view === "example" ? <DoorExampleView card={{ kind: "example", listingId: "listing-slot", reference: "REF-SLOT" }} copy={copy} /> : null}
          {view === "gone" || view === "missing" || view === "unreachable" ? <DoorStateView state={view} copy={copy} /> : null}
        </div>
      </div>,
    );
  `;
}

type Copy = Record<string, string>;
const copyOf = (page: Page) => page.evaluate(() => (window as unknown as { __copy: Copy }).__copy);
const islands = (page: Page) => page.locator(".nf-island").count();

/* What the arrival is made of, read in one go. */
const arrival = (page: Page) =>
  page.evaluate(() => {
    const card = document.querySelector(".nf-door__card") as HTMLElement;
    const read = (el: Element) => {
      const s = getComputedStyle(el);
      return { name: s.animationName, duration: s.animationDuration, delay: s.animationDelay, count: s.animationIterationCount };
    };
    return { card: read(card), kids: [...card.children].map(read) };
  });

describe.skipIf(!hasBrowser && !process.env.CI)("the share door's listing card", () => {
  it("is the screen's one Island, in the Island tier, with its one primary action", async () => {
    const { page, close } = await mountInBrowser({ entry: entry("listing"), css: CSS });
    try {
      expect(await islands(page)).toBe(1);
      expect(await page.locator(".nf-panel").count()).toBe(0);
      const card = page.getByTestId("door-card");
      expect(await card.evaluate((el) => el.tagName)).toBe("ARTICLE");
      expect(await card.evaluate((el) => el.classList.contains("nf-island"))).toBe(true);
      const radius = await card.evaluate((el) => parseFloat(getComputedStyle(el).borderTopLeftRadius));
      expect(radius).toBeGreaterThanOrEqual(26);
      expect(radius).toBeLessThanOrEqual(32);
      expect(await page.locator(".nf-btn--primary").count()).toBe(1);
      const sign = page.getByTestId("door-sign-in");
      expect(await sign.getAttribute("href")).toBe("/sign-in?next=%2Flisting%2Flisting-slot");
      expect((await sign.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    } finally {
      await close();
    }
  });

  it("leads with the figure: after the title, before the code and the button, in the display face and the largest type on the card", async () => {
    const { page, close } = await mountInBrowser({ entry: entry("listing"), css: CSS });
    try {
      const order = await page.getByTestId("door-card").evaluate((card) =>
        [...card.children].map((el) => el.className.split(" ")[0] || el.tagName.toLowerCase()),
      );
      expect(order).toEqual(["nf-door__eyebrow", "nf-door__lead", "nf-door__figure", "nf-door__code", "nf-btn", "nf-door__note"]);
      const type = await page.evaluate(() => {
        const px = (sel: string) => parseFloat(getComputedStyle(document.querySelector(sel)!).fontSize);
        const headline = document.querySelector("[data-testid=door-move-in]") as HTMLElement;
        const probe = document.createElement("i");
        probe.style.fontSize = "var(--nf-text-h1)";
        document.body.append(probe);
        const h1 = parseFloat(getComputedStyle(probe).fontSize);
        probe.remove();
        const s = getComputedStyle(headline);
        return {
          headline: px("[data-testid=door-move-in]"),
          h1,
          title: px(".nf-door__title"),
          second: px(".nf-door__second"),
          code: px(".nf-door__code-value"),
          tabular: s.fontVariantNumeric,
          display: s.fontFamily,
        };
      });
      expect(type.headline).toBe(type.h1);
      expect(type.headline).toBeGreaterThan(type.title);
      expect(type.headline).toBeGreaterThan(type.second);
      expect(type.headline).toBeGreaterThan(type.code);
      expect(type.tabular).toContain("tabular-nums");
      expect(await page.evaluate(() => getComputedStyle(document.querySelector(".nf-door__second")!).fontVariantNumeric)).toContain("tabular-nums");
      /* The figure's words are exactly what the view was handed. */
      expect(await page.getByTestId("door-move-in").textContent()).toBe("The move-in figure, slot");
      expect(await page.locator(".nf-door__second").textContent()).toBe("The rent beneath it, slot");
    } finally {
      await close();
    }
  });

  it("never counts: the figure's text is written once and no digit rolls into place, however long it is watched", async () => {
    const { page, close } = await mountInBrowser({ entry: entry("listing"), css: CSS });
    try {
      /* Mutations are counted on the figure and its line from now; the entrance
         (an opacity and transform rise) is not a text change. */
      await page.evaluate(() => {
        const target = document.querySelector(".nf-door__figure")!;
        (window as unknown as { __mutations: number }).__mutations = 0;
        new MutationObserver((list) => {
          (window as unknown as { __mutations: number }).__mutations += list.filter((m) => m.type !== "attributes" || m.attributeName !== "style").length;
        }).observe(target, { subtree: true, childList: true, characterData: true, attributes: true });
      });
      const samples: (string | null)[] = [];
      for (let i = 0; i < 6; i += 1) {
        samples.push(await page.getByTestId("door-move-in").textContent());
        await page.waitForTimeout(250);
      }
      expect(new Set(samples).size).toBe(1);
      expect(await page.evaluate(() => (window as unknown as { __mutations: number }).__mutations)).toBe(0);
      /* No counter or odometer is part of the figure, and the figure runs no animation of its own. */
      expect(await page.locator(".nf-door__figure [data-odometer], .nf-door__figure .nf-odometer, .nf-door__figure [aria-live]").count()).toBe(0);
      expect(await page.getByTestId("door-move-in").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
    } finally {
      await close();
    }
  });

  it("draws no figure at all when nothing was stated, only the honest line asking for it", async () => {
    const { page, close } = await mountInBrowser({ entry: entry("listing", { headline: null, second: null }), css: CSS });
    try {
      const copy = await copyOf(page);
      expect(await page.locator(".nf-door__figure, [data-testid=door-move-in]").count()).toBe(0);
      expect(await page.locator(".nf-door__second").textContent()).toBe(copy.askForPrice);
      expect(await page.locator(".nf-door__card").textContent()).not.toMatch(/₦|\d/);
      await page.waitForTimeout(900);
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("arrives with a rise and a stagger when motion is allowed: the card 16px up over the entrance duration, its rows 60ms apart", async () => {
    const { page, close } = await mountInBrowser({ entry: entry("listing"), css: CSS });
    try {
      const a = await arrival(page);
      expect(a.card).toEqual({ name: "nf-door-rise", duration: "0.52s", delay: "0s", count: "1" });
      expect(a.kids.map((k) => k.name)).toEqual(Array(a.kids.length).fill("nf-door-rise-child"));
      const delays = a.kids.map((k) => parseFloat(k.delay));
      /* Six rows: eyebrow, lead, figure, code, button, note. Each follows the last by 60ms, the later ones capped. */
      expect(delays.slice(0, 5)).toEqual([0.08, 0.14, 0.2, 0.26, 0.32]);
      expect(a.kids.every((k) => k.count === "1")).toBe(true);
      /* Everything is in the page and tappable on the first frame: nothing is display none, nothing blocks the pointer. */
      const live = await page.getByTestId("door-sign-in").evaluate((el) => {
        const s = getComputedStyle(el);
        const box = el.getBoundingClientRect();
        return { display: s.display, pointer: s.pointerEvents, visible: box.width > 0 && box.height > 0 };
      });
      expect(live.display).not.toBe("none");
      expect(live.pointer).not.toBe("none");
      expect(live.visible).toBe(true);
      await page.waitForTimeout(1100);
      /* Settled: it is where it ends, in full. */
      expect(await page.getByTestId("door-card").evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("fades for 160ms with no travel and no stagger under reduced motion, and under Calm", async () => {
    for (const mode of [{ reducedMotion: true }, { motion: "calm" as const }]) {
      const { page, close } = await mountInBrowser({ entry: entry("listing"), css: CSS, ...mode });
      try {
        const a = await arrival(page);
        expect(a.card).toEqual({ name: "nf-door-fade", duration: "0.16s", delay: "0s", count: "1" });
        /* The rows do not stagger: none of them has an animation of its own. */
        expect(a.kids.every((k) => k.name === "none")).toBe(true);
        await page.waitForTimeout(400);
        expect(await page.getByTestId("door-card").evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
        expect(await axeViolations(page)).toEqual([]);
      } finally {
        await close();
      }
    }
  });

  it("shows the door as it is when Off is chosen: no animation on the card or any row", async () => {
    const { page, close } = await mountInBrowser({ entry: entry("listing"), css: CSS, motion: "off" });
    try {
      const a = await arrival(page);
      expect(a.card.name).toBe("none");
      expect(a.kids.every((k) => k.name === "none")).toBe(true);
      expect(await page.getByTestId("door-card").evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
      expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    } finally {
      await close();
    }
  });

  it("holds the waiting card still, so the arriving card is the only motion", async () => {
    const html = renderToStaticMarkup(await DoorLoading());
    const entryHtml = `
      import { mount } from "@/lib/testing/browser-root";
      mount(<div className="nf-door"><div className="nf-door__stage" dangerouslySetInnerHTML={{ __html: ${JSON.stringify(html)} }} /></div>);
    `;
    const { page, close } = await mountInBrowser({ entry: entryHtml, css: CSS });
    try {
      const wait = page.getByTestId("door-loading");
      expect(await wait.getAttribute("aria-busy")).toBe("true");
      const a = await arrival(page);
      /* No entrance on the card or its rows (a skeleton's own shimmer is the platform's, not the door's). */
      expect(a.card.name).toBe("none");
      expect(a.kids.every((k) => !k.name.startsWith("nf-door-"))).toBe(true);
      /* It holds the Island's own outline. */
      expect(await wait.evaluate((el) => el.classList.contains("nf-island"))).toBe(true);
    } finally {
      await close();
    }
  });
});

describe.skipIf(!hasBrowser && !process.env.CI)("the share door's honest states", () => {
  it("draw a Card and never a second Island, each with exactly one way on, and pass axe", async () => {
    for (const view of ["example", "gone", "missing", "unreachable"] as const) {
      const { page, close } = await mountInBrowser({ entry: entry(view), css: CSS });
      try {
        expect(await islands(page), view).toBe(0);
        expect(await page.locator(".nf-panel.nf-door__card").count(), view).toBe(1);
        expect(await page.locator("a.nf-btn--primary, button.nf-btn--primary").count(), view).toBe(1);
        await page.waitForTimeout(900);
        expect(await axeViolations(page), view).toEqual([]);
      } finally {
        await close();
      }
    }
  });

  it("send a gone or missing link to sign in, and offer an unreachable one a retry that asks the page again", async () => {
    const gone = await mountInBrowser({ entry: entry("gone"), css: CSS });
    try {
      expect(await gone.page.getByTestId("door-gone").getByRole("link").getAttribute("href")).toBe("/sign-in");
    } finally {
      await gone.close();
    }
    const missing = await mountInBrowser({ entry: entry("missing"), css: CSS });
    try {
      expect(await missing.page.getByTestId("door-missing").getByRole("link").getAttribute("href")).toBe("/sign-in");
    } finally {
      await missing.close();
    }
    const down = await mountInBrowser({ entry: entry("unreachable"), css: CSS });
    try {
      const copy = await copyOf(down.page);
      await down.page.getByRole("button", { name: copy.retry! }).click();
      expect(await down.page.evaluate(() => (window as unknown as { __router: { calls: unknown[][] } }).__router.calls)).toEqual([["refresh"]]);
    } finally {
      await down.close();
    }
  });

  it("an example is a Card with its code and one way on, and states no figure", async () => {
    const { page, close } = await mountInBrowser({ entry: entry("example"), css: CSS });
    try {
      expect(await page.getByTestId("door-code").textContent()).toBe("REF-SLOT");
      expect(await page.locator("[data-testid=door-move-in], .nf-door__figure").count()).toBe(0);
      expect(await page.getByTestId("door-card-example").textContent()).not.toMatch(/₦/);
    } finally {
      await close();
    }
  });
});
