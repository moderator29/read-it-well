/**
 * THE MAP CREDIT IS A ROUND "i" (13 October 2026). The credit is a licence
 * requirement and must stay reachable on the home map, so it moved from a line
 * of visible text to a compact control (MapLibre's attribution pattern): the
 * credit is not on screen until the "i" is tapped, and then it is, with its
 * links. Mounted for real in Chromium with the home sheet.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { BROWSER_TEST_TIMEOUT, closeBrowser, hasBrowser, mountInBrowser, warmBrowser } from "@/lib/testing/mount-in-browser";
import { appCss } from "@/lib/testing/locale-fit";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const ENTRY = `
  import { mount } from "@/lib/testing/browser-root";
  import { MapCreditsInfo } from "@/components/app/maps/MapCreditsInfo";
  mount(
    <div className="nf-fstack" style={{ padding: 80 }}>
      <span className="nf-fstack__mapbox"><MapCreditsInfo label="Map credits" /></span>
      <p id="elsewhere" style={{ marginTop: 40 }}>Elsewhere</p>
    </div>,
  );
`;

describe.skipIf(!hasBrowser && !process.env.CI)("the map credit control", () => {
  it("shows no credit text until tapped, then shows the linked credit, and closes on Escape and on a tap elsewhere", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: await appCss() });
    try {
      const button = page.getByRole("button", { name: "Map credits" });
      expect(await button.getAttribute("aria-expanded")).toBe("false");
      /* Nothing of the credit is drawn at rest. */
      expect(await page.evaluate(() => document.body.innerText)).not.toMatch(/MapTiler|OpenStreetMap|CARTO/);

      /* The disc is small; its tap target is 44px. */
      const target = await page.evaluate(() => {
        const el = document.querySelector(".nf-mapinfo__btn")!;
        const after = getComputedStyle(el, "::after");
        const r = el.getBoundingClientRect();
        return { w: r.width + 2 * Math.abs(parseFloat(after.top)), h: r.height + 2 * Math.abs(parseFloat(after.left)) };
      });
      expect(target.w).toBeGreaterThanOrEqual(44);
      expect(target.h).toBeGreaterThanOrEqual(44);

      await button.click();
      expect(await button.getAttribute("aria-expanded")).toBe("true");
      const group = page.getByRole("group", { name: "Map credits" });
      await group.waitFor({ state: "visible" });
      expect(await group.innerText()).toMatch(/^©/);
      const links = await group.locator("a").evaluateAll((els) => els.map((a) => ({ href: (a as HTMLAnchorElement).href, target: a.getAttribute("target") })));
      expect(links.length).toBeGreaterThanOrEqual(1);
      for (const link of links) {
        expect(link.href).toMatch(/^https:/);
        expect(link.target).toBe("_blank");
      }

      await page.keyboard.press("Escape");
      await group.waitFor({ state: "hidden" });
      expect(await button.getAttribute("aria-expanded")).toBe("false");

      await button.click();
      await group.waitFor({ state: "visible" });
      await page.locator("#elsewhere").click();
      await group.waitFor({ state: "hidden" });
    } finally {
      await close();
    }
  });
});
