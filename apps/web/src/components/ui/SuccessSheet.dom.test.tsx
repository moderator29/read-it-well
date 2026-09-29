/**
 * The success sheet, mounted for real in Chromium (lib/testing/mount-in-browser):
 * what it draws, where focus lands, what a quiet reader is shown, and that
 * Continue does what it says. docs/SUCCESS_MOMENTS.md.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { closeBrowser, hasBrowser, mountInBrowser } from "@/lib/testing/mount-in-browser";

afterAll(closeBrowser);

/* The product's own stylesheet for this component, unwrapped from its layer,
   so the reduced-motion rules are the ones that ship. */
const CSS = readFileSync(join(__dirname, "..", "..", "app", "css", "success.css"), "utf8");

function entry(variant: "success" | "submitted" | "approved" = "success"): string {
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
      const live = page.locator('[role="status"][aria-live="polite"]');
      await page.waitForFunction(() => document.querySelector('[data-testid="success-title"]') !== null);
      expect(await live.textContent()).toContain("Stay paid");
      expect(await live.textContent()).toContain("these dates are confirmed");
      expect(await page.getByTestId("success-amount").textContent()).toContain("485,000");
      expect(await page.locator(".nf-success__mono").textContent()).toBe("rm-book-7f3a9c21e4");
      expect(await page.locator(".nf-success__bit").count()).toBe(10);
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

  it("animates by default: the mark is marked not-quiet and the burst runs", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: CSS });
    try {
      await page.waitForSelector('.nf-success[data-quiet="false"]');
      await page.waitForSelector('.nf-sheet--card[data-open="true"]');
      const animation = await page.locator(".nf-success__bit").first().evaluate((el) => getComputedStyle(el).animationName);
      expect(animation).toBe("nf-success-burst");
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
        const bit = document.querySelector(".nf-success__bit")!;
        const stroke = document.querySelector(".nf-success__stroke")!;
        return {
          bitAnimation: getComputedStyle(bit).animationName,
          strokeAnimation: getComputedStyle(stroke).animationName,
          dashoffset: getComputedStyle(stroke).strokeDashoffset,
        };
      });
      expect(state).toEqual({ bitAnimation: "none", strokeAnimation: "none", dashoffset: "0px" });
    } finally {
      await close();
    }
  });

  it.each(["success", "submitted", "approved"] as const)("draws the %s variant's own mark", async (variant) => {
    const { page, close } = await mountInBrowser({ entry: entry(variant), css: CSS });
    try {
      await page.waitForSelector(`.nf-success[data-variant="${variant}"]`);
      const marks = await page.evaluate(() => ({
        badge: document.querySelectorAll(".nf-success__badge").length,
        seal: document.querySelectorAll(".nf-success__seal").length,
      }));
      expect(marks).toEqual({
        badge: variant === "submitted" ? 1 : 0,
        seal: variant === "approved" ? 1 : 0,
      });
    } finally {
      await close();
    }
  });
});
