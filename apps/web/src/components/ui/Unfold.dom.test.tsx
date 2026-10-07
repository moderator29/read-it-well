/**
 * Unfold, mounted for real in Chromium: the ARIA contract, the keyboard, the
 * single and multiple modes, that a closed panel is unreachable, and that the
 * reveal collapses under reduced motion.
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

/* Structural fixtures only: labels that say what slot they are. */
const entry = (props = "") => `
  import { Unfold } from "@/components/ui/Unfold";
  import { mount } from "@/lib/testing/browser-root";
  const items = [
    { id: "a", title: "Row one", hint: "Hint", content: <p>Content one <a href="#x">link</a></p> },
    { id: "b", title: "Row two", content: <p>Content two</p> },
    { id: "c", title: "Row three", content: <p>Content three</p>, disabled: true },
    { id: "d", title: "Row four", content: <p>Content four</p> },
  ];
  window.__changes = [];
  mount(<div style={{ width: 360, padding: 16 }}><Unfold items={items} onValueChange={(v) => window.__changes.push(v)} ${props} /></div>);
`;

describe.skipIf(!hasBrowser && !process.env.CI)("Unfold", () => {
  it("is headings with buttons that carry aria-expanded and aria-controls", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS });
    try {
      const t = page.getByRole("button", { name: /Row one/ });
      expect(await t.getAttribute("aria-expanded")).toBe("false");
      const controls = await t.getAttribute("aria-controls");
      // Closed panels are not landmarks: no empty named regions in the list.
      expect(await page.locator(`#${controls}`).getAttribute("role")).toBeNull();
      expect(await page.getByRole("region").count()).toBe(0);
      await t.click();
      expect(await page.locator(`#${controls}`).getAttribute("role")).toBe("region");
      expect(await page.getByRole("region").count()).toBe(1);
      expect(await page.getByRole("heading", { level: 3 }).count()).toBe(4);
    } finally {
      await close();
    }
  });

  it("opens one at a time by default, and many with `multiple`", async () => {
    const one = await mountInBrowser({ entry: entry(), css: PORTED_CSS });
    try {
      await one.page.getByRole("button", { name: /Row one/ }).click();
      await one.page.getByRole("button", { name: /Row two/ }).click();
      expect(await one.page.getByRole("button", { name: /Row one/ }).getAttribute("aria-expanded")).toBe("false");
      expect(await one.page.getByRole("button", { name: /Row two/ }).getAttribute("aria-expanded")).toBe("true");
    } finally {
      await one.close();
    }
    const many = await mountInBrowser({ entry: entry("multiple"), css: PORTED_CSS });
    try {
      await many.page.getByRole("button", { name: /Row one/ }).click();
      await many.page.getByRole("button", { name: /Row two/ }).click();
      expect(await many.page.getByRole("button", { name: /Row one/ }).getAttribute("aria-expanded")).toBe("true");
      expect(await many.page.getByRole("button", { name: /Row two/ }).getAttribute("aria-expanded")).toBe("true");
      expect(await many.page.evaluate(() => (window as unknown as { __changes: string[][] }).__changes.at(-1))).toEqual(["a", "b"]);
    } finally {
      await many.close();
    }
  });

  it("keeps a closed panel out of reach, and an open one reachable", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS });
    try {
      expect(await page.getByText("Content one").isVisible()).toBe(false);
      expect(await page.locator("a[href='#x']").isVisible()).toBe(false);
      expect(await page.locator("a[href='#x']").evaluate((el) => !!el.closest("[inert]"))).toBe(true);
      await page.getByRole("button", { name: /Row one/ }).click();
      await page.waitForFunction(() => getComputedStyle(document.querySelector("a[href='#x']")!).visibility === "visible");
      expect(await page.locator("a[href='#x']").isVisible()).toBe(true);
      await page.locator("a[href='#x']").focus();
      expect(await page.evaluate(() => document.activeElement?.getAttribute("href"))).toBe("#x");
      await page.getByRole("button", { name: /Row one/ }).click();
      await page.waitForFunction(() => getComputedStyle(document.querySelector("a[href='#x']")!).visibility === "hidden");
    } finally {
      await close();
    }
  });

  it("grows the panel over the base duration rather than snapping it", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS });
    try {
      expect(await page.locator(".nf-unfold__panel").first().evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0.24s");
      await page.getByRole("button", { name: /Row one/ }).click();
      await page.waitForTimeout(700);
      const natural = await page.locator(".nf-unfold__content").first().evaluate((el) => el.getBoundingClientRect().height);
      expect(natural).toBeGreaterThan(20);
    } finally {
      await close();
    }
  });

  it("is fully usable with no framer-motion feature bundle, as production ships it (D49.1): opens, shows, is focusable", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS });
    try {
      await page.getByRole("button", { name: /Row one/ }).click();
      expect(await page.getByRole("button", { name: /Row one/ }).getAttribute("aria-expanded")).toBe("true");
      await page.waitForFunction(() => getComputedStyle(document.querySelector("a[href='#x']")!).visibility === "visible");
      expect(await page.getByText("Content one").isVisible()).toBe(true);
      await page.locator("a[href='#x']").focus();
      expect(await page.evaluate(() => document.activeElement?.getAttribute("href"))).toBe("#x");
    } finally {
      await close();
    }
  });

  it("moves between triggers with the arrows, Home and End, skipping a disabled one", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS });
    try {
      await page.getByRole("button", { name: /Row one/ }).focus();
      await page.keyboard.press("ArrowDown");
      expect(await page.evaluate(() => document.activeElement?.textContent)).toContain("Row two");
      await page.keyboard.press("ArrowDown");
      expect(await page.evaluate(() => document.activeElement?.textContent)).toContain("Row four");
      await page.keyboard.press("ArrowDown");
      expect(await page.evaluate(() => document.activeElement?.textContent)).toContain("Row one");
      await page.keyboard.press("End");
      expect(await page.evaluate(() => document.activeElement?.textContent)).toContain("Row four");
      await page.keyboard.press("Home");
      expect(await page.evaluate(() => document.activeElement?.textContent)).toContain("Row one");
      await page.keyboard.press("Enter");
      expect(await page.getByRole("button", { name: /Row one/ }).getAttribute("aria-expanded")).toBe("true");
    } finally {
      await close();
    }
  });

  it("works controlled", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(`value={["b"]}`), css: PORTED_CSS });
    try {
      expect(await page.getByRole("button", { name: /Row two/ }).getAttribute("aria-expanded")).toBe("true");
      await page.getByRole("button", { name: /Row one/ }).click();
      /* The owner has not changed `value`, so nothing opens. */
      expect(await page.getByRole("button", { name: /Row one/ }).getAttribute("aria-expanded")).toBe("false");
      expect(await page.evaluate(() => (window as unknown as { __changes: string[][] }).__changes.at(-1))).toEqual(["a"]);
    } finally {
      await close();
    }
  });

  it("opens at full height at once under reduced motion", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS, reducedMotion: true });
    try {
      await page.getByRole("button", { name: /Row one/ }).click();
      await page.waitForTimeout(60);
      expect(await page.locator(".nf-unfold__panel").first().evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0s");
      expect(await page.getByText("Content one").isVisible()).toBe(true);
    } finally {
      await close();
    }
  });

  it("passes axe in both themes, closed and open", async () => {
    for (const theme of ["dark", "light"]) {
      const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS });
      try {
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
        expect(await axeViolations(page), `${theme} closed`).toEqual([]);
        await page.getByRole("button", { name: /Row one/ }).click();
        await page.waitForTimeout(400);
        expect(await axeViolations(page), `${theme} open`).toEqual([]);
      } finally {
        await close();
      }
    }
  });
});
