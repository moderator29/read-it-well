/**
 * ParticleDelete, mounted for real in Chromium: it deletes first and dissolves
 * only if that worked, the pieces are the same on every run, the layer is
 * click-through and tidied away, and quiet readers get a fade, not particles.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";
import { PORTED_CSS, axeViolations } from "./ported-test-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const entry = (behaviour = "() => {}") => `
  import { useState } from "react";
  import { ParticleDelete } from "@/components/ui/ParticleDelete";
  import { mount } from "@/lib/testing/browser-root";
  window.__log = [];
  function Harness() {
    const [gone, setGone] = useState(false);
    if (gone) return <p id="empty">Nothing here</p>;
    return (
      <div style={{ padding: 24, width: 320 }}>
        <ParticleDelete
          data-testid="host"
          options={{ seed: 5 }}
          onDelete={async () => { window.__log.push("delete"); return (${behaviour})(); }}
          onGone={() => { window.__log.push("gone"); setGone(true); }}
        >
          {({ isDeleting, remove }) => (
            <div style={{ padding: 16, border: "1px solid gray", minHeight: 64 }}>
              <span>Item title</span>
              <button id="remove" onClick={remove} disabled={isDeleting}>Remove item</button>
            </div>
          )}
        </ParticleDelete>
      </div>
    );
  }
  mount(<Harness />);
`;

const log = (page: import("playwright-core").Page) => page.evaluate(() => (window as unknown as { __log: string[] }).__log);

describe.skipIf(!hasBrowser && !process.env.CI)("ParticleDelete", () => {
  it("deletes first, then dissolves into pieces, then reports it is gone and tidies up", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS });
    try {
      await page.locator("#remove").click();
      await page.waitForSelector(".nf-particles");
      expect(await log(page)).toEqual(["delete"]);
      expect(await page.locator(".nf-particle").count()).toBeGreaterThan(10);
      expect(await page.getByTestId("host").getAttribute("aria-busy")).toBe("true");
      /* The layer is decorative and click-through. */
      expect(await page.locator(".nf-particles").getAttribute("aria-hidden")).toBe("true");
      expect(await page.locator(".nf-particles").evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
      /* The original is already hidden: the eye sees it become its pieces. */
      expect(await page.getByTestId("host").evaluate((el) => el.style.opacity)).toBe("0");
      await page.waitForSelector("#empty", { timeout: 8000 });
      expect(await log(page)).toEqual(["delete", "gone"]);
      expect(await page.locator(".nf-particles").count()).toBe(0);
    } finally {
      await close();
    }
  });

  it("does NOT dissolve when the deletion failed, and the item stays", async () => {
    for (const behaviour of ["() => false", "() => { throw new Error('no'); }"]) {
      const { page, close } = await mountInBrowser({ entry: entry(behaviour), css: PORTED_CSS });
      try {
        await page.locator("#remove").click();
        await page.waitForTimeout(500);
        expect(await page.locator(".nf-particles").count()).toBe(0);
        expect(await log(page)).toEqual(["delete"]);
        expect(await page.getByTestId("host").evaluate((el) => el.style.opacity)).toBe("");
        expect(await page.locator("#remove").isEnabled()).toBe(true);
      } finally {
        await close();
      }
    }
  });

  it("makes the same dissolve on every run for the same seed", async () => {
    const shapes: string[] = [];
    for (let run = 0; run < 2; run += 1) {
      const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS });
      try {
        await page.locator("#remove").click();
        await page.waitForSelector(".nf-particle");
        shapes.push(
          await page.locator(".nf-particle").evaluateAll((els) =>
            els.map((e) => (e as HTMLElement).style.cssText).join("|"),
          ),
        );
      } finally {
        await close();
      }
    }
    expect(shapes[0]).toBe(shapes[1]);
    expect(shapes[0]!.length).toBeGreaterThan(100);
  });

  it("uses only transform and opacity for the pieces", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS });
    try {
      await page.locator("#remove").click();
      await page.waitForSelector(".nf-particle");
      const props = await page.locator(".nf-particle").first().evaluate((el) =>
        (el.getAnimations()[0]?.effect as KeyframeEffect).getKeyframes().flatMap((k) => Object.keys(k)).filter((k) => !["offset", "easing", "composite", "computedOffset"].includes(k)),
      );
      expect([...new Set(props)].sort()).toEqual(["opacity", "transform"]);
    } finally {
      await close();
    }
  });

  it("fades instead of scattering under reduced motion, and under data saver", async () => {
    for (const mode of ["motion", "saver"]) {
      const { page, close } = await mountInBrowser({
        entry: entry(),
        css: PORTED_CSS,
        reducedMotion: mode === "motion",
        init: mode === "saver" ? `document.documentElement.dataset.saveData = "on";` : undefined,
      });
      try {
        await page.locator("#remove").click();
        await page.waitForSelector("#empty", { timeout: 5000 });
        expect(await page.locator(".nf-particles").count()).toBe(0);
        expect(await log(page)).toEqual(["delete", "gone"]);
      } finally {
        await close();
      }
    }
  });

  it("passes axe in both themes", async () => {
    for (const theme of ["dark", "light"]) {
      const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS });
      try {
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
        expect(await axeViolations(page), theme).toEqual([]);
      } finally {
        await close();
      }
    }
  });
});
