/**
 * THE ON-DEMAND SHEETS OPEN EXACTLY AS THEY DID (lib/ui/lazy-sheet.ts).
 *
 * The filter drawer, the stays filter sheet and the report sheet now load
 * their body when they are wanted rather than with the page. Each is mounted
 * for real in Chromium behind its real trigger and driven from the keyboard:
 * the body is absent until asked for, the sheet opens and runs its entrance
 * (`data-open` flips), focus goes into it, Escape closes it and puts focus back
 * on the trigger, and a second open finds the draft the reader left, because
 * the body stays mounted once it has been drawn.
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

/* The browser starts in the hook; each test gets the budget its mount needs. */
vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const run = describe.skipIf(!hasBrowser && !process.env.CI);

const focusedTestId = (page: Page) =>
  page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.testid ?? null);
const focusInside = (page: Page, sheet: string) =>
  page.evaluate((s) => Boolean(document.querySelector(s)?.contains(document.activeElement)), sheet);

/** Open from the keyboard, check the entrance and focus, close with Escape. */
async function roundTrip(page: Page, trigger: string, sheet: string): Promise<void> {
  const opener = page.getByTestId(trigger);
  await opener.focus();
  await page.keyboard.press("Enter");
  await page.waitForSelector(`${sheet}[data-open="true"]`, { timeout: 8_000 });
  expect(await opener.getAttribute("aria-expanded")).toBe("true");
  expect(await opener.getAttribute("aria-busy")).toBeNull();
  expect(await focusInside(page, sheet)).toBe(true);

  await page.keyboard.press("Escape");
  await page.waitForSelector(sheet, { state: "detached", timeout: 8_000 });
  expect(await opener.getAttribute("aria-expanded")).toBe("false");
  expect(await focusedTestId(page)).toBe(trigger);
}

const FILTERS = `
  import { getDictionary } from "@vallo/i18n";
  import { mount } from "@/lib/testing/browser-root";
  import { FilterDrawer } from "@/components/app/filters/FilterDrawer";
  import { parseShelfQuery } from "@/components/app/search/shelf-query";
  const t = getDictionary("en");
  mount(
    <FilterDrawer query={parseShelfQuery({})} facts={[]} locale="en" copy={t.catalogue.filters}
      costCopy={t.moveIn} compoundCopy={t.shape.compound} sortCopy={t.shape.sorts}
      serviceCopy={t.shape.service} cashCopy={t.shape.cash} unitCopy={t.shape.unit}
      commuteCopy={t.shape.commute} kindCopy={t.experienceLabels} />,
  );
`;

run("the property filter drawer, loaded on demand", () => {
  it("is not drawn until asked for, then opens, traps focus, closes on Escape and hands focus back", async () => {
    const { page, close } = await mountInBrowser({ entry: FILTERS });
    try {
      expect(await page.locator('[data-testid="filters-drawer"]').count()).toBe(0);
      await roundTrip(page, "filters-open", '[data-testid="filters-drawer"]');
    } finally {
      await close();
    }
  });

  it("keeps the unapplied draft across a close and a reopen", async () => {
    const { page, close } = await mountInBrowser({ entry: FILTERS });
    try {
      await page.getByTestId("filters-open").click();
      const verified = page.locator('[data-testid="filter-verified"] [role="switch"]');
      await verified.waitFor({ timeout: 8_000 });
      expect(await verified.getAttribute("aria-checked")).toBe("false");
      await verified.click();
      expect(await verified.getAttribute("aria-checked")).toBe("true");
      await page.keyboard.press("Escape");
      await page.waitForSelector('[data-testid="filters-drawer"]', { state: "detached" });

      await page.getByTestId("filters-open").click();
      await verified.waitFor();
      expect(await verified.getAttribute("aria-checked")).toBe("true");
    } finally {
      await close();
    }
  });
});

const STAYS = `
  import { getDictionary } from "@vallo/i18n";
  import { mount } from "@/lib/testing/browser-root";
  import { StayFilterSheet } from "@/components/app/stays/StayFilterSheet";
  import { parseStaysQuery } from "@/lib/stays/filters";
  mount(<StayFilterSheet query={parseStaysQuery({}, "2026-01-01")} locale="en" t={getDictionary("en")} today="2026-01-01" />);
`;

run("the stays filter sheet, loaded on demand", () => {
  it("is not drawn until asked for, then opens, traps focus, closes on Escape and hands focus back", async () => {
    const { page, close } = await mountInBrowser({ entry: STAYS });
    try {
      expect(await page.locator('[data-testid="stay-filters"]').count()).toBe(0);
      await roundTrip(page, "stay-filters-open", '[data-testid="stay-filters"]');
      /* And again: the second open runs the entrance just the same. */
      await roundTrip(page, "stay-filters-open", '[data-testid="stay-filters"]');
    } finally {
      await close();
    }
  });
});

const REPORT = `
  import { mount } from "@/lib/testing/browser-root";
  import { ReportSheet } from "@/components/app/ReportSheet";
  mount(<ReportSheet targetType="listing" targetId="l-1" targetLabel="Two-bedroom flat" signedIn />);
`;

run("the report sheet, loaded on demand", () => {
  it("is not drawn until asked for, then opens, closes on Escape and hands focus back to the link", async () => {
    const { page, close } = await mountInBrowser({ entry: REPORT });
    try {
      expect(await page.locator('[data-testid="report-sheet"]').count()).toBe(0);
      await page.getByTestId("report-opener").focus();
      await page.keyboard.press("Enter");
      await page.getByTestId("report-sheet").waitFor({ timeout: 8_000 });
      await page.waitForSelector('[role="dialog"][data-open="true"]');
      expect(await focusInside(page, '[role="dialog"]')).toBe(true);
      await page.keyboard.press("Escape");
      await page.getByTestId("report-sheet").waitFor({ state: "detached" });
      expect(await focusedTestId(page)).toBe("report-opener");
    } finally {
      await close();
    }
  });
});

const STAYS_OPEN = `
  import { getDictionary } from "@vallo/i18n";
  import { mount } from "@/lib/testing/browser-root";
  import { StayFilterSheet } from "@/components/app/stays/StayFilterSheet";
  import { parseStaysQuery } from "@/lib/stays/filters";
  mount(<StayFilterSheet openOnMount query={parseStaysQuery({}, "2026-01-01")} locale="en" t={getDictionary("en")} today="2026-01-01" />);
`;

run("a sheet the address opens (?filters=open)", () => {
  it("fetches its body at mount and opens without a tap", async () => {
    const { page, close } = await mountInBrowser({ entry: STAYS_OPEN });
    try {
      await page.waitForSelector('[data-testid="stay-filters"][data-open="true"]', { timeout: 8_000 });
      const opener = page.getByTestId("stay-filters-open");
      expect(await opener.getAttribute("aria-expanded")).toBe("true");
      expect(await opener.getAttribute("aria-busy")).toBeNull();
      await page.keyboard.press("Escape");
      await page.waitForSelector('[data-testid="stay-filters"]', { state: "detached", timeout: 8_000 });
      expect(await opener.getAttribute("aria-expanded")).toBe("false");
    } finally {
      await close();
    }
  });
});

run("a double tap on a trigger whose body is still loading", () => {
  it("opens one sheet, once", async () => {
    const { page, close } = await mountInBrowser({ entry: REPORT });
    try {
      const opener = page.getByTestId("report-opener");
      expect(await opener.getAttribute("aria-haspopup")).toBe("dialog");
      expect(await opener.getAttribute("aria-expanded")).toBe("false");
      await opener.dblclick();
      await page.waitForSelector('[role="dialog"][data-open="true"]', { timeout: 8_000 });
      expect(await page.locator('[data-testid="report-sheet"]').count()).toBe(1);
      expect(await page.locator('[role="dialog"]').count()).toBe(1);
      expect(await opener.getAttribute("aria-expanded")).toBe("true");
    } finally {
      await close();
    }
  });
});
