/**
 * InnerNav, mounted for real in Chromium: the physical pull (it follows the
 * finger, settles open past halfway, springs back short of it), the tap and
 * keyboard paths that do not need a gesture, Escape, and the glass material.
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
import { PORTED_CSS, axeViolations } from "./ported-test-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const entry = `
  import { InnerNav } from "@/components/ui/InnerNav";
  import { mount } from "@/lib/testing/browser-root";
  window.__selected = [];
  mount(
    <div style={{ padding: 16, minHeight: 500 }}>
      <button id="outside">outside</button>
      <InnerNav
        label="Section navigation"
        toggleLabel="Sections"
        currentLabel="Section one"
        activeId="one"
        items={[
          { id: "one", label: "Section one", icon: "home", href: "#one", onSelect: () => window.__selected.push("one") },
          { id: "two", label: "Section two", icon: "wallet", href: "#two", onSelect: () => window.__selected.push("two") },
          { id: "three", label: "Section three", onSelect: () => window.__selected.push("three") },
        ]}
        data-testid="nav"
      />
    </div>
  );
`;

const open = (page: Page) => page.getByTestId("nav").getAttribute("data-open");
const panelOpacity = (page: Page) => page.locator(".nf-innernav__panel").evaluate((el) => Number(getComputedStyle(el).opacity));
const panelVisible = (page: Page) =>
  page.locator(".nf-innernav__panel").evaluate((el) => getComputedStyle(el).visibility === "visible" && Number(getComputedStyle(el).opacity) > 0.99);
const toggleY = (page: Page) =>
  page.getByRole("button", { name: "Sections" }).evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42);

/* `settle` waits before letting go, so the throw at release is the finger's
   own rest and not the synthetic mouse's infinite speed. */
async function pull(page: Page, distance: number, release = true, settle = 0) {
  const box = (await page.getByRole("button", { name: "Sections" }).boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + distance / 2, { steps: 5 });
  await page.mouse.move(x, y + distance, { steps: 5 });
  if (settle) await page.waitForTimeout(settle);
  if (release) await page.mouse.up();
}

describe.skipIf(!hasBrowser && !process.env.CI)("InnerNav", () => {
  it("is a named navigation with a labelled toggle, closed, with its items out of reach", async () => {
    const { page, close } = await mountInBrowser({ entry, css: PORTED_CSS });
    try {
      expect(await page.getByRole("navigation", { name: "Section navigation" }).isVisible()).toBe(true);
      const toggle = page.getByRole("button", { name: "Sections" });
      expect(await toggle.getAttribute("aria-expanded")).toBe("false");
      expect(await page.getByRole("link", { name: "Section two" }).isVisible()).toBe(false);
      const box = (await toggle.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    } finally {
      await close();
    }
  });

  it("follows the finger while pulled, then settles open when released past halfway", async () => {
    const { page, close } = await mountInBrowser({ entry, css: PORTED_CSS });
    try {
      await pull(page, 60, false);
      /* Mid-pull: partly open, in proportion to the pull (60px of 96), the panel
         already visible and following, and the toggle pulled down with it. */
      const opacity = await panelOpacity(page);
      expect(opacity).toBeGreaterThan(0.5);
      expect(opacity).toBeLessThan(0.7);
      expect(await page.locator(".nf-innernav__panel").evaluate((el) => getComputedStyle(el).visibility)).toBe("visible");
      expect(await toggleY(page)).toBeGreaterThan(2);
      await page.mouse.up();
      await page.waitForFunction(() => document.querySelector("[data-testid=nav]")?.hasAttribute("data-open"));
      await page.waitForTimeout(900);
      expect(await panelVisible(page)).toBe(true);
      expect(await page.getByRole("button", { name: "Sections" }).getAttribute("aria-expanded")).toBe("true");
      /* The toggle has settled back to rest. */
      expect(Math.abs(await toggleY(page))).toBeLessThan(0.5);
    } finally {
      await close();
    }
  });

  it("springs back closed when let go short of halfway", async () => {
    const { page, close } = await mountInBrowser({ entry, css: PORTED_CSS });
    try {
      await pull(page, 30, true, 200);
      await page.waitForTimeout(900);
      expect(await open(page)).toBeNull();
      expect(await page.locator(".nf-innernav__panel").evaluate((el) => getComputedStyle(el).visibility)).toBe("hidden");
    } finally {
      await close();
    }
  });

  it("closes by pulling up from open", async () => {
    const { page, close } = await mountInBrowser({ entry, css: PORTED_CSS });
    try {
      await page.getByRole("button", { name: "Sections" }).click();
      await page.waitForFunction(() => document.querySelector("[data-testid=nav]")?.hasAttribute("data-open"));
      await pull(page, -80);
      await page.waitForFunction(() => !document.querySelector("[data-testid=nav]")?.hasAttribute("data-open"));
    } finally {
      await close();
    }
  });

  it("is fully usable with no framer-motion feature bundle, as production ships it (D49.1): a tap opens it visibly, the keyboard lands focus in it, and the pull follows the finger", async () => {
    const { page, close } = await mountInBrowser({ entry: entry, css: PORTED_CSS });
    try {
      const toggle = page.getByRole("button", { name: "Sections" });
      await toggle.click();
      await page.waitForFunction(() => document.querySelector("[data-testid=nav]")?.hasAttribute("data-open"));
      await page.waitForTimeout(900);
      expect(await panelVisible(page)).toBe(true);
      expect(await page.getByRole("link", { name: "Section two" }).isVisible()).toBe(true);
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => getComputedStyle(document.querySelector(".nf-innernav__panel")!).visibility === "hidden");
      /* Keyboard open: focus must land on a VISIBLE item. */
      await toggle.focus();
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => document.activeElement?.getAttribute("aria-current") === "page");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(900);
      /* And the pull still tracks the finger. */
      await pull(page, 60, false);
      const opacity = await panelOpacity(page);
      expect(opacity).toBeGreaterThan(0.5);
      expect(opacity).toBeLessThan(0.7);
      expect(await toggleY(page)).toBeGreaterThan(2);
      await page.mouse.up();
    } finally {
      await close();
    }
  });

  it("opens and closes on a plain tap, and does not double-toggle after a pull", async () => {
    const { page, close } = await mountInBrowser({ entry, css: PORTED_CSS });
    try {
      const toggle = page.getByRole("button", { name: "Sections" });
      await toggle.click();
      expect(await open(page)).toBe("true");
      await toggle.click();
      expect(await open(page)).toBeNull();
      await pull(page, 90);
      await page.waitForTimeout(50);
      /* The click that follows a pull is swallowed: it stays open. */
      expect(await open(page)).toBe("true");
    } finally {
      await close();
    }
  });

  it("opens from the keyboard onto the active item, and Escape closes it and returns focus", async () => {
    const { page, close } = await mountInBrowser({ entry, css: PORTED_CSS });
    try {
      await page.getByRole("button", { name: "Sections" }).focus();
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => document.activeElement?.getAttribute("aria-current") === "page");
      expect(await page.evaluate(() => document.activeElement?.textContent)).toContain("Section one");
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => document.activeElement?.textContent)).toContain("Section two");
      await page.keyboard.press("Escape");
      expect(await open(page)).toBeNull();
      expect(await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))).toBe("Sections");
    } finally {
      await close();
    }
  });

  it("closes on a press outside and when an item is chosen, reporting the choice", async () => {
    const { page, close } = await mountInBrowser({ entry, css: PORTED_CSS });
    try {
      await page.getByRole("button", { name: "Sections" }).click();
      await page.locator("#outside").click();
      expect(await open(page)).toBeNull();
      await page.getByRole("button", { name: "Sections" }).click();
      await page.waitForTimeout(450);
      await page.getByRole("button", { name: "Section three" }).click();
      expect(await open(page)).toBeNull();
      expect(await page.evaluate(() => (window as unknown as { __selected: string[] }).__selected)).toEqual(["three"]);
    } finally {
      await close();
    }
  });

  it("is glass: a hairline edge brighter on the leading side, radius 32, blur that data saver drops", async () => {
    const { page, close } = await mountInBrowser({ entry, css: PORTED_CSS });
    try {
      await page.getByRole("button", { name: "Sections" }).click();
      const s = await page.locator(".nf-innernav__panel").evaluate((el) => {
        const c = getComputedStyle(el);
        return { radius: c.borderTopLeftRadius, lead: c.borderInlineStartColor, trail: c.borderInlineEndColor, blur: c.backdropFilter };
      });
      expect(s.radius).toBe("32px");
      expect(s.lead).not.toBe(s.trail);
      expect(s.blur).toContain("blur");
    } finally {
      await close();
    }
    const saver = await mountInBrowser({ entry, css: PORTED_CSS, init: `document.documentElement.dataset.saveData = "on";` });
    try {
      expect(await saver.page.locator(".nf-innernav__panel").evaluate((el) => getComputedStyle(el).backdropFilter)).toBe("none");
    } finally {
      await saver.close();
    }
  });

  it("can be caught mid-settle and carried on from where it is", async () => {
    const { page, close } = await mountInBrowser({ entry, css: PORTED_CSS });
    try {
      await pull(page, 90, true, 150);
      await page.waitForTimeout(40);
      /* Mid-settle on the way open; grab it and pull back up. */
      const box = (await page.getByRole("button", { name: "Sections" }).boundingBox())!;
      await page.mouse.move(box.x + 22, box.y + 22);
      await page.mouse.down();
      await page.mouse.move(box.x + 22, box.y + 22 - 90, { steps: 6 });
      await page.waitForTimeout(150);
      await page.mouse.up();
      await page.waitForFunction(() => !document.querySelector("[data-testid=nav]")?.hasAttribute("data-open"));
      await page.waitForTimeout(900);
      expect(await page.locator(".nf-innernav__panel").evaluate((el) => getComputedStyle(el).visibility)).toBe("hidden");
    } finally {
      await close();
    }
  });

  it("opens instantly under reduced motion, and still opens", async () => {
    const { page, close } = await mountInBrowser({ entry, css: PORTED_CSS, reducedMotion: true });
    try {
      await page.getByRole("button", { name: "Sections" }).click();
      await page.waitForTimeout(80);
      expect(await panelVisible(page)).toBe(true);
    } finally {
      await close();
    }
  });

  it("passes axe in both themes, closed and open", async () => {
    for (const theme of ["dark", "light"]) {
      const { page, close } = await mountInBrowser({ entry, css: PORTED_CSS });
      try {
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
        expect(await axeViolations(page), `${theme} closed`).toEqual([]);
        await page.getByRole("button", { name: "Sections" }).click();
        await page.waitForTimeout(600);
        expect(await axeViolations(page), `${theme} open`).toEqual([]);
      } finally {
        await close();
      }
    }
  });
});
