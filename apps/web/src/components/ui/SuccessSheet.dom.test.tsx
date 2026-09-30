/**
 * The success sheet, mounted for real in Chromium (lib/testing/mount-in-browser):
 * what it draws, where focus lands, what a quiet reader is shown, and that
 * Continue does what it says. docs/SUCCESS_MOMENTS.md.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";

/* The browser starts in the hook; each test gets the budget its mount needs. */
vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

/* The product's own stylesheet for this component, unwrapped from its layer,
   so the reduced-motion rules are the ones that ship. */
const CSS = [
  /* The tokens first: an animation shorthand naming an undefined easing token
     is invalid, and would read as "no animation" for the wrong reason. */
  readFileSync(join(__dirname, "..", "..", "..", "..", "..", "packages", "design-tokens", "src", "tokens.css"), "utf8"),
  /* The sheet's own geometry, which the success card's shape is layered on. */
  "*, ::before, ::after { box-sizing: border-box; }",
  readFileSync(join(__dirname, "..", "..", "app", "css", "overlays.css"), "utf8"),
  readFileSync(join(__dirname, "..", "..", "app", "css", "buttons.css"), "utf8"),
  readFileSync(join(__dirname, "..", "..", "app", "css", "success.css"), "utf8"),
].join("\n");

function entry(variant: "success" | "submitted" | "approved" = "success", object?: string): string {
  return `
    import { useState } from "react";
    import { mount } from "@/lib/testing/browser-root";
    import { SuccessSheet } from "@/components/ui/SuccessSheet";
    function Harness() {
      const [open, setOpen] = useState(true);
      window.__open = open;
      return (
        <>
          <button id="opener" onClick={() => setOpen(true)}>Open</button>
          <SuccessSheet
            open={open}
            onOpenChange={setOpen}
            variant=${JSON.stringify(variant)}
            ${object ? `object=${JSON.stringify(object)}` : ""}
            title="Stay paid"
            body="Your payment is in and these dates are confirmed."
            amount={{ minorUnits: 48500000 }}
            details={[{ label: "Reference", value: "rm-book-7f3a9c21e4", mono: true }]}
            primary={{ label: "Continue", onClick: () => { window.__continued = (window.__continued || 0) + 1; } }}
            secondary={{ label: "Close" }}
            haptic={false}
          />
        </>
      );
    }
    mount(<Harness />);
  `;
}

describe.skipIf(!hasBrowser && !process.env.CI)("SuccessSheet", () => {
  it("renders an accessible dialog with the title, the line, the amount and the reference", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: CSS });
    try {
      const dialog = page.getByRole("dialog", { name: "Stay paid" });
      await dialog.waitFor();
      expect(await dialog.getAttribute("aria-modal")).toBe("true");
      /* The live region is filled a frame after opening, so it is announced. */
      /* The title is the dialog's name and is NOT repeated in the live region;
         the line is what the live region announces. */
      const live = page.locator('[role="status"][aria-live="polite"]');
      await page.waitForFunction(() => document.querySelector('[role="status"] span[aria-hidden]') === null);
      expect(await live.textContent()).toBe("Your payment is in and these dates are confirmed.");
      expect(await page.getByTestId("success-title").getAttribute("aria-hidden")).toBe("true");
      expect(await page.getByTestId("success-amount").textContent()).toContain("485,000");
      expect(await page.locator(".nf-success__mono").textContent()).toBe("rm-book-7f3a9c21e4");
      /* The object, decorative, with eight sparks round it (three orange). */
      expect(await page.locator(".nf-success__mark img").getAttribute("alt")).toBe("");
      expect(await page.locator(".nf-success__bit").count()).toBe(8);
      expect(await page.locator('.nf-success__bit[data-tone="spark"]').count()).toBe(3);
    } finally {
      await close();
    }
  });

  it("moves focus to the primary action", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: CSS });
    try {
      await page.getByTestId("success-primary").waitFor();
      await page.waitForFunction(() => document.activeElement?.getAttribute("data-testid") === "success-primary");
      expect(await page.evaluate(() => document.activeElement?.textContent)).toBe("Continue");
    } finally {
      await close();
    }
  });

  it("Continue runs its action and closes the sheet", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: CSS });
    try {
      await page.getByTestId("success-primary").click();
      await page.waitForFunction(() => (window as unknown as { __open: boolean }).__open === false);
      expect(await page.evaluate(() => (window as unknown as { __continued: number }).__continued)).toBe(1);
      expect(await page.getByRole("dialog").count()).toBe(0);
    } finally {
      await close();
    }
  });

  it("Escape closes it too, and the secondary action only closes", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: CSS });
    try {
      await page.getByTestId("success-primary").waitFor();
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => (window as unknown as { __open: boolean }).__open === false);
      await page.locator("#opener").click();
      await page.getByTestId("success-secondary").click();
      await page.waitForFunction(() => (window as unknown as { __open: boolean }).__open === false);
      expect(await page.evaluate(() => (window as unknown as { __continued?: number }).__continued ?? 0)).toBe(0);
    } finally {
      await close();
    }
  });

  it("animates by default: the object pops, the sparks burst and the words rise", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: CSS });
    try {
      await page.waitForSelector('.nf-success[data-quiet="false"]');
      const names = await page.evaluate(() => ({
        pop: getComputedStyle(document.querySelector(".nf-success__pop")!).animationName,
        bit: getComputedStyle(document.querySelector(".nf-success__bit")!).animationName,
        title: getComputedStyle(document.querySelector(".nf-success__title")!).animationName,
        float: getComputedStyle(document.querySelector(".nf-success__float")!).animationName,
      }));
      expect(names).toEqual({ pop: "nf-success-pop", bit: "nf-success-burst", title: "nf-success-rise", float: "nf-success-float" });
    } finally {
      await close();
    }
  });

  it.each([
    ["the operating system asks for less motion", { reducedMotion: true }],
    ["the app's motion setting is Calm", { motion: "calm" as const }],
    ["the app's motion setting is Off", { motion: "off" as const }],
  ])("shows the static final state when %s", async (_why, options) => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: CSS, ...options });
    try {
      await page.waitForSelector('.nf-success[data-quiet="true"]');
      await page.waitForSelector('.nf-sheet--card[data-open="true"]');
      const state = await page.evaluate(() => {
        const cs = (sel: string) => getComputedStyle(document.querySelector(sel)!);
        return {
          pop: cs(".nf-success__pop").animationName,
          float: cs(".nf-success__float").animationName,
          bit: cs(".nf-success__bit").animationName,
          title: cs(".nf-success__title").animationName,
          actions: cs(".nf-success__actions").animationName,
          /* Everything in its final place, fully drawn. */
          popOpacity: cs(".nf-success__pop").opacity,
          titleOpacity: cs(".nf-success__title").opacity,
          pulseOpacity: cs(".nf-success__pulse").opacity,
        };
      });
      expect(state).toEqual({
        pop: "none",
        float: "none",
        bit: "none",
        title: "none",
        actions: "none",
        popOpacity: "1",
        titleOpacity: "1",
        pulseOpacity: "0",
      });
    } finally {
      await close();
    }
  });

  it("keeps the float off when ambient motion is off, while the arrival still runs", async () => {
    const { page, close } = await mountInBrowser({
      entry: entry(),
      css: CSS,
      init: `document.documentElement.dataset.motionAmbient = "off";`,
    });
    try {
      await page.waitForSelector('.nf-success[data-quiet="false"]');
      const names = await page.evaluate(() => ({
        pop: getComputedStyle(document.querySelector(".nf-success__pop")!).animationName,
        float: getComputedStyle(document.querySelector(".nf-success__float")!).animationName,
      }));
      expect(names).toEqual({ pop: "nf-success-pop", float: "none" });
    } finally {
      await close();
    }
  });

  it("fills a phone screen, with the pill at the foot and every action 44px or taller", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: CSS, viewport: { width: 360, height: 740 } });
    try {
      await page.waitForSelector('.nf-sheet--card[data-open="true"]');
      await page.waitForTimeout(400);
      const box = await page.getByTestId("success-sheet").boundingBox();
      expect(box).toMatchObject({ x: 0, y: 0, width: 360, height: 740 });
      const primary = (await page.getByTestId("success-primary").boundingBox())!;
      const secondary = (await page.getByTestId("success-secondary").boundingBox())!;
      expect(primary.height).toBeGreaterThanOrEqual(44);
      expect(secondary.height).toBeGreaterThanOrEqual(44);
      /* The pills sit in the lower part of the screen, under the object. */
      const mark = (await page.locator(".nf-success__mark").boundingBox())!;
      expect(primary.y).toBeGreaterThan(mark.y + mark.height);
      expect(secondary.y + secondary.height).toBeGreaterThan(740 * 0.8);
    } finally {
      await close();
    }
  });

  it("is a centred card on a wide screen", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: CSS, viewport: { width: 1440, height: 900 } });
    try {
      await page.waitForSelector('.nf-sheet--card[data-open="true"]');
      await page.waitForTimeout(500);
      const box = (await page.getByTestId("success-sheet").boundingBox())!;
      expect(box.width).toBeLessThanOrEqual(26 * 16 + 1);
      expect(Math.abs(box.x + box.width / 2 - 720)).toBeLessThan(2);
      expect(box.height).toBeLessThan(900);
    } finally {
      await close();
    }
  });

  it.each([
    ["success", "verified"],
    ["submitted", "calendar-pending"],
    ["approved", "verified"],
  ] as const)("draws the %s variant with its default object", async (variant, object) => {
    const { page, close } = await mountInBrowser({ entry: entry(variant), css: CSS });
    try {
      await page.waitForSelector(`.nf-success[data-variant="${variant}"]`);
      expect(await page.locator(".nf-success__mark").getAttribute("data-object")).toBe(object);
      expect(await page.locator(".nf-success__mark img").getAttribute("src")).toContain(`/brand/3d/${object}@2x.webp`);
    } finally {
      await close();
    }
  });

  it("draws the object it is given", async () => {
    const { page, close } = await mountInBrowser({ entry: entry("success", "keys"), css: CSS });
    try {
      expect(await page.locator(".nf-success__mark").getAttribute("data-object")).toBe("keys");
    } finally {
      await close();
    }
  });
});
