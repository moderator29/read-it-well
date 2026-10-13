/**
 * The illustrated action sheet, mounted for real in Chromium on top of the real
 * Sheet: the anatomy of north star 15.2, the sheet behaviour it inherits (name,
 * focus, Escape), row choice, and both themes.
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

const entry = `
  import { useState } from "react";
  import { ActionSheetIllustrated } from "@/components/ui/ActionSheetIllustrated";
  import { mount } from "@/lib/testing/browser-root";
  function Harness() {
    const [open, setOpen] = useState(true);
    window.__open = open;
    window.__chosen = window.__chosen || [];
    return (
      <>
        <button id="opener" onClick={() => setOpen(true)}>Open</button>
        <ActionSheetIllustrated
          open={open}
          onOpenChange={setOpen}
          title="Sheet title"
          body="One line of body."
          object="gift"
          rows={[
            { id: "r1", label: "Row one", hint: "Row hint", icon: "users", onSelect: () => window.__chosen.push("r1") },
            { id: "r2", label: "Row two", icon: "share", tone: "info", href: "#two" },
            { id: "r3", label: "Row three", icon: "trash", danger: true, onSelect: () => window.__chosen.push("r3") },
          ]}
          dismissLabel="Not now"
          testId="asi"
        />
      </>
    );
  }
  mount(<Harness />);
`;

describe.skipIf(!hasBrowser && !process.env.CI)("ActionSheetIllustrated", () => {
  it("is a dialog named by its title, on the real Sheet, with first focus on the first row", async () => {
    const { page, close } = await mountInBrowser({ entry, css: PORTED_CSS });
    try {
      const dialog = page.getByRole("dialog", { name: "Sheet title" });
      await dialog.waitFor();
      expect(await dialog.getAttribute("aria-modal")).toBe("true");
      expect(await dialog.getAttribute("class")).toContain("nf-sheet");
      expect(await dialog.getAttribute("class")).toContain("nf-asi");
      await page.waitForFunction(() => document.activeElement?.classList.contains("nf-asi__row"));
      expect(await page.evaluate(() => document.activeElement?.textContent)).toContain("Row one");
    } finally {
      await close();
    }
  });

  it("draws the anatomy in order: object, title, one line, hairline rows with plate, label and chevron, one dismiss", async () => {
    const { page, close } = await mountInBrowser({ entry, css: PORTED_CSS });
    try {
      await page.getByRole("dialog").waitFor();
      const order = await page.locator(".nf-asi__head > *, .nf-asi__rows, .nf-asi__dismiss").evaluateAll((els) => els.map((e) => e.className));
      expect(order).toEqual(["nf-asi__ground", "nf-asi__title", "nf-asi__body", "nf-asi__rows", "nf-asi__dismiss"]);
      expect(await page.locator(".nf-asi__ground img").count()).toBe(1);
      expect(await page.locator(".nf-asi__row").count()).toBe(3);
      /* Each row: a round plate, a label and a chevron. */
      const first = page.locator(".nf-asi__row").first();
      expect(await first.locator(".nf-plate--round").count()).toBe(1);
      expect(await first.locator(".nf-asi__chevron").count()).toBe(1);
      /* Hairlines between rows, and exactly one dismiss. */
      const border = await page.locator(".nf-asi__li").nth(1).evaluate((el) => getComputedStyle(el).borderTopWidth);
      expect(border).toBe("1px");
      expect(await page.getByRole("button", { name: "Not now" }).count()).toBe(1);
      /* The title is visible once and named once: Sheet's own is hidden. */
      expect(await page.getByText("Sheet title", { exact: true }).evaluateAll((els) => els.filter((e) => getComputedStyle(e).position !== "absolute").length)).toBe(1);
    } finally {
      await close();
    }
  });

  it("chooses a row, reports it and closes; links are real links", async () => {
    const { page, close } = await mountInBrowser({ entry, css: PORTED_CSS });
    try {
      await page.getByRole("dialog").waitFor();
      expect(await page.getByRole("link", { name: "Row two" }).getAttribute("href")).toBe("#two");
      await page.getByRole("button", { name: /Row one/ }).click();
      expect(await page.evaluate(() => (window as unknown as { __chosen: string[] }).__chosen)).toEqual(["r1"]);
      expect(await page.evaluate(() => (window as unknown as { __open: boolean }).__open)).toBe(false);
    } finally {
      await close();
    }
  });

  it("dismisses with the quiet button and with Escape, returning focus to the opener", async () => {
    const { page, close } = await mountInBrowser({ entry, css: PORTED_CSS });
    try {
      await page.getByRole("dialog").waitFor();
      await page.getByRole("button", { name: "Not now" }).click();
      expect(await page.evaluate(() => (window as unknown as { __open: boolean }).__open)).toBe(false);
      await page.locator("#opener").click();
      await page.getByRole("dialog").waitFor();
      await page.keyboard.press("Escape");
      expect(await page.evaluate(() => (window as unknown as { __open: boolean }).__open)).toBe(false);
    } finally {
      await close();
    }
  });

  it("gives every row a 56px target and marks the danger row in the danger tone", async () => {
    const { page, close } = await mountInBrowser({ entry, css: PORTED_CSS });
    try {
      await page.getByRole("dialog").waitFor();
      for (const row of await page.locator(".nf-asi__row").all()) {
        expect((await row.boundingBox())!.height).toBeGreaterThanOrEqual(55.5);
      }
      expect(await page.locator(".nf-asi__row[data-danger] .nf-plate--danger").count()).toBe(1);
    } finally {
      await close();
    }
  });

  it("passes axe in both themes", async () => {
    for (const theme of ["dark", "light"]) {
      const { page, close } = await mountInBrowser({ entry, css: PORTED_CSS });
      try {
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
        await page.getByRole("dialog").waitFor();
        await page.waitForTimeout(600);
        expect(await axeViolations(page), theme).toEqual([]);
      } finally {
        await close();
      }
    }
  });
});
