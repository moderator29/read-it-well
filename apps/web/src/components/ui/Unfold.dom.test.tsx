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
  import { MotionProvider } from "@/components/app/MotionProvider";
  import { mount } from "@/lib/testing/browser-root";
  const items = [
    { id: "a", title: "Row one", hint: "Hint", content: <p>Content one <a href="#x">link</a></p> },
    { id: "b", title: "Row two", content: <p>Content two</p> },
    { id: "c", title: "Row three", content: <p>Content three</p>, disabled: true },
    { id: "d", title: "Row four", content: <p>Content four</p> },
  ];
  window.__changes = [];
  mount(<MotionProvider><div style={{ width: 360, padding: 16 }}><Unfold items={items} onValueChange={(v) => window.__changes.push(v)} ${props} /></div></MotionProvider>);
`;

describe.skipIf(!hasBrowser && !process.env.CI)("Unfold", () => {
  it("is headings with buttons that carry aria-expanded and aria-controls", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS });
    try {
      const t = page.getByRole("button", { name: /Row one/ });
      expect(await t.getAttribute("aria-expanded")).toBe("false");
      const controls = await t.getAttribute("aria-controls");
      await t.click();
      expect(await page.locator(`#${controls}`).getAttribute("role")).toBe("region");
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

  it("keeps a closed panel out of the page altogether, and an open one reachable", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS });
    try {
      /* Unmounted when closed: nothing for Tab to land in or a reader to read. */
      expect(await page.locator("a[href='#x']").count()).toBe(0);
      expect(await page.locator("[role=region]").count()).toBe(0);
      await page.getByRole("button", { name: /Row one/ }).click();
      await page.waitForSelector("a[href='#x']");
      expect(await page.locator("a[href='#x']").isVisible()).toBe(true);
      await page.getByRole("button", { name: /Row one/ }).click();
      /* The exit finishes before it leaves. */
      await page.waitForFunction(() => document.querySelectorAll("[role=region]").length === 0);
    } finally {
      await close();
    }
  });

  it("grows the panel on a spring rather than snapping it", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS });
    try {
      await page.getByRole("button", { name: /Row one/ }).click();
      await page.waitForSelector("[role=region]");
      const early = await page.locator("[role=region]").evaluate((el) => el.getBoundingClientRect().height);
      await page.waitForTimeout(900);
      const late = await page.locator("[role=region]").evaluate((el) => el.getBoundingClientRect().height);
      expect(late).toBeGreaterThan(20);
      expect(early).toBeLessThan(late);
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
      await page.waitForSelector("[role=region]");
      const natural = await page.locator("[role=region]").evaluate((el) => el.scrollHeight);
      const h = await page.locator("[role=region]").evaluate((el) => el.getBoundingClientRect().height);
      expect(Math.abs(h - natural)).toBeLessThan(1.5);
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
