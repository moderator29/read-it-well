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
  import { useState } from "react";
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

type Anim = { name: string; duration: number; props: string[] };
const animsOf = (page: Page, selector: string): Promise<Anim[]> =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return [];
    return el
      .getAnimations()
      .filter((a) => a instanceof CSSAnimation)
      .map((a) => ({
        name: (a as CSSAnimation).animationName,
        duration: Number(a.effect!.getTiming().duration),
        props: (a.effect as KeyframeEffect)
          .getKeyframes()
          .flatMap((k) => Object.keys(k))
          .filter((k) => !["offset", "easing", "composite", "computedOffset"].includes(k))
          .filter((k, i, all) => all.indexOf(k) === i)
          .sort(),
      }));
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
      expect(await animsOf(page, "[data-testid=map-dock]")).toEqual([
        { name: "nf-map-dock-in", duration: 240, props: ["opacity", "transform"] },
      ]);
      /* The pin lands at the same pace, and the chosen one rests lifted 6px. */
      expect((await animsOf(page, "#pin")).map((a) => a.duration)).toEqual([240]);
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
      await page.evaluate(() => (window as unknown as { __choose: (id: string) => void }).__choose("b"));
      await page.waitForTimeout(20);
      expect(await page.locator("[data-testid=map-dock] h3").innerText()).toBe("Mini flat in Yaba");
      expect((await animsOf(page, "[data-testid=map-dock]")).map((a) => a.name)).toEqual(["nf-map-dock-in"]);
    } finally {
      await close();
    }
  });

  it("reduced motion: the card fades in over 160ms without travel, and the chosen pin is lifted at once", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS, reducedMotion: true });
    try {
      expect(await animsOf(page, "[data-testid=map-dock]")).toEqual([
        { name: "nf-map-dock-fade", duration: 160, props: ["opacity"] },
      ]);
      await page.waitForTimeout(50);
      expect(await pinLift(page)).toBe("matrix(1, 0, 0, 1, 0, -6)");
      const { card, selected } = await edges(page);
      expect(card).toBe(selected);
    } finally {
      await close();
    }
  });
});
