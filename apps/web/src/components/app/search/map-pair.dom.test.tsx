/**
 * THE CHOSEN PIN AND ITS CARD, IN CHROMIUM (round 5 craft, "a search finds
 * the right place"): the chosen pin lifts, the card that docks for it rises
 * from the frame's foot at the browsing pace and wears the pin's selected
 * edge, a new choice lands a new card, and reduced motion keeps the arrival
 * as a 160ms fade with the pin still lifted. Computed styles and animations,
 * never a clock.
 *
 * The pin is the map's own class list (`nf-map-pin-drop`, `data-selected`)
 * on a plain button: MapCanvas needs Leaflet and tiles to mount, and the
 * motion lives in map.css either way. The dock is the real MapDock.
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
import { GLASS_CSS, productCss } from "@/lib/testing/product-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT * 2 });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const CSS = productCss(GLASS_CSS, "app/css/brand-glass.css", "app/css/map.css");

const ENTRY = `
  import { useLayoutEffect, useState } from "react";
  import { mount } from "@/lib/testing/browser-root";
  import { MapDock } from "@/components/app/search/MapDock";
  const place = (id, title) => ({
    id, title, area: "Yaba", city: "Lagos", kindLabel: "Apartment", kind: "apartment",
    priceMinor: 250000000, currency: "NGN", period: "year", rating: 0, reviewCount: 0,
    hue: 210, verified: false, isDemo: false, lat: 6.5, lng: 3.38, byArea: true,
  });
  const copy = { night: "night", year: "year", guest: "guest", verified: "Verified", imageryOffline: "", creditJoin: "", approximate: "" };
  function Harness() {
    const [chosen, setChosen] = useState("a");
    window.__choose = setChosen;
    const listing = chosen === "a" ? place("a", "Two bed in Yaba") : place("b", "Mini flat in Yaba");
    /* Captured in the commit that mounts the card, before any frame is
       drawn, so a slow machine cannot let the animation finish unread
       (getAnimations flushes style, so the CSS animation exists here). */
    useLayoutEffect(() => {
      const read = (sel) =>
        [...(document.querySelector(sel)?.getAnimations() ?? [])]
          .filter((a) => a instanceof CSSAnimation)
          .map((a) => ({ name: a.animationName, duration: Number(a.effect.getTiming().duration) }));
      (window.__atMount ??= []).push({ dock: read("[data-testid=map-dock]"), pin: read("#pin") });
    }, [chosen]);
    return (
      <div style={{ position: "relative", height: 400 }}>
        <span id="probe" style={{ borderStyle: "solid", borderWidth: 1, borderColor: "var(--nf-selected-edge)" }} />
        <button id="pin" type="button" className="nf-map-pin-drop" data-selected="true" style={{ position: "absolute", left: 100, top: 100 }}>
          N2.5m
        </button>
        <div style={{ position: "absolute", insetInline: 0, bottom: 0 }}>
          <MapDock key={listing.id} listing={listing} locale="en" copy={copy} saved={false} saveBusy={false}
            saveMessage={null} onSave={() => {}} onDismiss={() => {}} />
        </div>
      </div>
    );
  }
  mount(<Harness />);
`;

type Anim = { name: string; duration: number };
type Mounted = { dock: Anim[]; pin: Anim[] };
/** What was running on the card and the pin in each commit that mounted a card. */
const atMount = (page: Page): Promise<Mounted[]> =>
  page.evaluate(() => (window as unknown as { __atMount?: Mounted[] }).__atMount ?? []);

/**
 * The animation the stylesheet declares on an element (computed, so it holds
 * after the animation has finished, however slow the machine), and the
 * properties its keyframes animate, read from the keyframes rule itself.
 */
const declared = (page: Page, selector: string) =>
  page.evaluate((sel) => {
    const style = getComputedStyle(document.querySelector(sel)!);
    const name = style.animationName;
    const props = new Set<string>();
    const walk = (rules: CSSRuleList) => {
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSKeyframesRule && rule.name === name) {
          for (const frame of Array.from(rule.cssRules) as CSSKeyframeRule[]) {
            for (let i = 0; i < frame.style.length; i += 1) props.add(frame.style.item(i));
          }
        } else if ("cssRules" in rule) {
          walk((rule as CSSGroupingRule).cssRules);
        }
      }
    };
    for (const sheet of Array.from(document.styleSheets)) walk(sheet.cssRules);
    return { name, duration: style.animationDuration, props: [...props].sort() };
  }, selector);

const edges = (page: Page) =>
  page.evaluate(() => ({
    card: getComputedStyle(document.querySelector("[data-testid=map-dock] article")!).borderTopColor,
    selected: getComputedStyle(document.getElementById("probe")!).borderTopColor,
  }));

const pinLift = (page: Page) => page.evaluate(() => getComputedStyle(document.getElementById("pin")!).transform);

describe.skipIf(!hasBrowser && !process.env.CI)("the chosen pin and its card", () => {
  it("the card rises at the browsing pace, wears the pin's edge, and a new choice lands a new card", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      /* Running in the commit that mounted it: the card's rise and the pin's drop, both at 240ms. */
      const [first] = await atMount(page);
      expect(first!.dock).toEqual([{ name: "nf-map-dock-in", duration: 240 }]);
      expect(first!.pin).toEqual([{ name: "nf-map-pin-drop", duration: 240 }]);
      /* And as the stylesheet declares them: transform and opacity only. */
      expect(await declared(page, "[data-testid=map-dock]")).toEqual({
        name: "nf-map-dock-in",
        duration: "0.24s",
        props: ["opacity", "transform"],
      });
      expect(await declared(page, "#pin")).toEqual({
        name: "nf-map-pin-drop",
        duration: "0.24s",
        props: ["opacity", "transform"],
      });
      const { card, selected } = await edges(page);
      expect(card).toBe(selected);
      await page.waitForTimeout(500);
      expect(
        await page.evaluate(() => {
          const dock = getComputedStyle(document.querySelector("[data-testid=map-dock]")!);
          return [dock.opacity, dock.transform];
        }),
        "the card rests where it docks",
      ).toEqual(["1", "none"]);
      expect(await pinLift(page)).toBe("matrix(1, 0, 0, 1, 0, -6)");
      /* Choosing another place lands a new card, not new words in the old one. */
      await page.evaluate(() => {
        (document.querySelector("[data-testid=map-dock]") as HTMLElement).dataset.was = "a";
        (window as unknown as { __choose: (id: string) => void }).__choose("b");
      });
      await expect.poll(() => page.locator("[data-testid=map-dock] h3").innerText()).toBe("Mini flat in Yaba");
      expect(await page.locator("[data-testid=map-dock][data-was]").count(), "a new card, not the old one rewritten").toBe(0);
      const mounts = await atMount(page);
      expect(mounts).toHaveLength(2);
      expect(mounts[1]!.dock).toEqual([{ name: "nf-map-dock-in", duration: 240 }]);
    } finally {
      await close();
    }
  });

  it("reduced motion: the card fades in over 160ms without travel, and the chosen pin is lifted at once", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS, reducedMotion: true });
    try {
      const [first] = await atMount(page);
      expect(first!.dock).toEqual([{ name: "nf-map-dock-fade", duration: 160 }]);
      expect(await declared(page, "[data-testid=map-dock]")).toEqual({
        name: "nf-map-dock-fade",
        duration: "0.16s",
        props: ["opacity"],
      });
      await page.waitForTimeout(50);
      expect(await pinLift(page)).toBe("matrix(1, 0, 0, 1, 0, -6)");
      const { card, selected } = await edges(page);
      expect(card).toBe(selected);
    } finally {
      await close();
    }
  });
});
