/**
 * "Search for help", the support home's command palette, mounted for real in
 * Chromium on the product's own stylesheets: the ARIA combobox-with-listbox
 * contract (focus stays in the field, the lit row is `aria-activedescendant`,
 * each row an option), the arrow keys, Enter opening the lit row's answer in
 * place, Escape clearing, the honest empty answer, and what a reader who asked
 * for less motion is shown.
 *
 * The fixtures are slot articles ("First question slot"), so the order the
 * matching rule produces is something a test can state, not something a help
 * centre's wording decides. "kiwi" is a word that sits in one answer and one
 * question, to prove a question hit leads.
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
import { axeViolations } from "@/components/ui/ported-test-css";
import { GLASS_CSS, productCss } from "@/lib/testing/product-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const CSS = productCss(GLASS_CSS, "app/css/typography.css", "app/css/controls.css", "app/(app)/support/support-palette.css");

const ARTICLES = [
  { category: "Category slot", q: "First question slot", a: "First answer slot" },
  { category: "Category slot", q: "Second question slot", a: "Second answer slot, mentioning kiwi" },
  { category: "Other category slot", q: "Third question slot about kiwi", a: "Third answer slot" },
  { category: "Category slot", q: "Fourth question slot", a: "Fourth answer slot" },
];
/* The popular list is its own order, not the library's. */
const POPULAR = [ARTICLES[3]!, ARTICLES[0]!];

const ENTRY = `
  import { SupportSearch } from "@/app/(app)/support/SupportSearch";
  import { mount } from "@/lib/testing/browser-root";
  mount(
    <div style={{ maxWidth: 560, margin: "0 auto", padding: 16 }}>
      <SupportSearch articles={${JSON.stringify(ARTICLES)}} popular={${JSON.stringify(POPULAR)}} />
    </div>,
  );
`;

const input = (page: Page) => page.getByRole("combobox", { name: "Search for help" });
const options = (page: Page) => page.getByRole("option");
const optionTexts = (page: Page) => page.locator(".nf-palette__q").allTextContents();
const selected = (page: Page) =>
  options(page).evaluateAll((els) => els.findIndex((el) => el.getAttribute("aria-selected") === "true"));
const activeDescendant = (page: Page) => input(page).getAttribute("aria-activedescendant");
const status = (page: Page) => page.locator(".nf-palette__status").textContent();

async function open(opts: { reducedMotion?: boolean; motion?: "calm" | "off" } = {}) {
  return mountInBrowser({ entry: ENTRY, css: CSS, ...opts });
}

describe.skipIf(!hasBrowser && !process.env.CI)("the support search palette", () => {
  it("is a combobox over a listbox of options, and before any typing offers the popular articles in their own order", async () => {
    const { page, close } = await open();
    try {
      const box = input(page);
      expect(await box.getAttribute("aria-expanded")).toBe("true");
      expect(await box.getAttribute("aria-autocomplete")).toBe("list");
      expect(await box.getAttribute("autocomplete")).toBe("off");
      const list = page.getByRole("listbox", { name: "Search for help" });
      expect(await list.count()).toBe(1);
      expect(await box.getAttribute("aria-controls")).toBe(await list.getAttribute("id"));
      expect(await page.getByTestId("support-popular").count()).toBe(1);
      expect(await optionTexts(page)).toEqual(["Fourth question slot", "First question slot"]);
      expect(await status(page)).toBe("Popular articles");
      /* The first row is lit, and the field says which by id. */
      expect(await selected(page)).toBe(0);
      const firstId = await options(page).first().getAttribute("id");
      expect(await activeDescendant(page)).toBe(firstId);
      /* Rows are plates at least 44px tall. */
      for (const h of await options(page).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))) {
        expect(h).toBeGreaterThanOrEqual(44);
      }
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("filters as it is typed, says how many match in a polite status, and lights the first row", async () => {
    const { page, close } = await open();
    try {
      await input(page).focus();
      await page.keyboard.type("slot");
      expect(await page.getByTestId("support-search-results").count()).toBe(1);
      expect(await optionTexts(page)).toEqual([
        "First question slot",
        "Second question slot",
        "Third question slot about kiwi",
        "Fourth question slot",
      ]);
      expect(await status(page)).toBe("4 matching answers");
      expect(await page.locator(".nf-palette__status").getAttribute("role")).toBe("status");
      expect(await selected(page)).toBe(0);
      /* A word in a question leads a word only in an answer. */
      await input(page).fill("kiwi");
      expect(await optionTexts(page)).toEqual(["Third question slot about kiwi", "Second question slot"]);
      expect(await status(page)).toBe("2 matching answers");
      await input(page).fill("fourth question");
      expect(await optionTexts(page)).toEqual(["Fourth question slot"]);
      expect(await status(page)).toBe("1 matching answer");
    } finally {
      await close();
    }
  });

  it("moves the lit row with the arrow keys while focus never leaves the field, and stops at either end", async () => {
    const { page, close } = await open();
    try {
      await input(page).focus();
      await page.keyboard.type("slot");
      await page.keyboard.press("ArrowDown");
      expect(await selected(page)).toBe(1);
      expect(await activeDescendant(page)).toBe(await options(page).nth(1).getAttribute("id"));
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      expect(await selected(page)).toBe(3);
      await page.keyboard.press("ArrowUp");
      expect(await selected(page)).toBe(2);
      for (let i = 0; i < 6; i += 1) await page.keyboard.press("ArrowUp");
      expect(await selected(page)).toBe(0);
      /* Only one row is ever marked selected, and the field kept focus throughout. */
      expect(await options(page).evaluateAll((els) => els.filter((el) => el.getAttribute("aria-selected") === "true").length)).toBe(1);
      expect(await input(page).evaluate((el) => el === document.activeElement)).toBe(true);
      /* Typing starts again from the first row. */
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Backspace");
      expect(await selected(page)).toBe(0);
    } finally {
      await close();
    }
  });

  it("opens the lit row's answer in place on Enter, closes it on a second Enter, and holds one open at a time", async () => {
    const { page, close } = await open();
    try {
      await input(page).focus();
      await page.keyboard.type("slot");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      const answer = page.getByRole("region", { name: "Open the answer" });
      expect(await answer.count()).toBe(1);
      expect(await answer.locator(".nf-palette__cat").textContent()).toBe("Category slot");
      expect(await answer.locator("p").last().textContent()).toBe("Second answer slot, mentioning kiwi");
      /* It stands under the list, not inside it. */
      /* The answer sits OUTSIDE the listbox (a listbox holds only options) and names its question. */
      expect(await answer.evaluate((el) => el.closest('[role="listbox"]') === null)).toBe(true);
      expect(await answer.locator("p").nth(1).textContent()).toBe("Second question slot");
      /* Focus did not move into the answer. */
      expect(await input(page).evaluate((el) => el === document.activeElement)).toBe(true);
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      expect(await page.getByRole("region", { name: "Open the answer" }).count()).toBe(1);
      expect(await page.getByRole("region", { name: "Open the answer" }).locator("p").last().textContent()).toBe("Third answer slot");
      await page.keyboard.press("Enter");
      expect(await page.getByRole("region", { name: "Open the answer" }).count()).toBe(0);
      await page.waitForTimeout(250);
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("clears on Escape and puts the popular articles back, and Escape on an empty field does nothing", async () => {
    const { page, close } = await open();
    try {
      await input(page).focus();
      await page.keyboard.press("Escape");
      expect(await optionTexts(page)).toEqual(["Fourth question slot", "First question slot"]);
      await page.keyboard.type("slot");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Escape");
      expect(await input(page).inputValue()).toBe("");
      expect(await status(page)).toBe("Popular articles");
      expect(await selected(page)).toBe(0);
      expect(await input(page).evaluate((el) => el === document.activeElement)).toBe(true);
    } finally {
      await close();
    }
  });

  it("offers a clear button once there is a query, which clears and returns focus to the field", async () => {
    const { page, close } = await open();
    try {
      expect(await page.getByRole("button", { name: "Clear the search" }).count()).toBe(0);
      await input(page).fill("kiwi");
      const clear = page.getByRole("button", { name: "Clear the search" });
      expect((await clear.boundingBox())!.width).toBeGreaterThanOrEqual(44);
      await clear.click();
      expect(await input(page).inputValue()).toBe("");
      expect(await input(page).evaluate((el) => el === document.activeElement)).toBe(true);
      expect(await page.getByRole("button", { name: "Clear the search" }).count()).toBe(0);
    } finally {
      await close();
    }
  });

  it("answers a search that matches nothing in words, with no listbox, and Enter does nothing", async () => {
    const { page, close } = await open();
    try {
      await input(page).focus();
      await page.keyboard.type("zzz");
      expect(await status(page)).toBe("No answer matches that yet.");
      expect(await page.getByRole("listbox").count()).toBe(0);
      expect(await options(page).count()).toBe(0);
      expect(await page.locator(".nf-palette__none").textContent()).toBe(
        "Try a shorter word, or ask a question above. A person reads every ticket.",
      );
      expect(await input(page).getAttribute("aria-expanded")).toBe("false");
      expect(await input(page).getAttribute("aria-activedescendant")).toBeNull();
      await page.keyboard.press("Enter");
      await page.keyboard.press("ArrowDown");
      expect(await page.getByRole("region", { name: "Open the answer" }).count()).toBe(0);
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("works by pointer too: a row lights as the pointer passes and opens on a tap", async () => {
    const { page, close } = await open();
    try {
      await input(page).fill("slot");
      await options(page).nth(2).hover();
      expect(await selected(page)).toBe(2);
      expect(await activeDescendant(page)).toBe(await options(page).nth(2).getAttribute("id"));
      await options(page).nth(2).click();
      expect(await page.getByRole("region", { name: "Open the answer" }).count()).toBe(1);
      await options(page).nth(2).click();
      expect(await page.getByRole("region", { name: "Open the answer" }).count()).toBe(0);
    } finally {
      await close();
    }
  });

  it("keeps a sensible tab order, the keyboard hint out of the reading order, and a way on to the whole help centre", async () => {
    const { page, close } = await open();
    try {
      await page.keyboard.press("Tab");
      expect(await input(page).evaluate((el) => el === document.activeElement)).toBe(true);
      await page.keyboard.press("Tab");
      /* No query, no clear button: the next stop is the help centre link. */
      const link = page.getByRole("link", { name: "Browse every answer in the help centre" });
      expect(await link.evaluate((el) => el === document.activeElement)).toBe(true);
      expect(await link.getAttribute("href")).toBe("/help");
      /* Its 44px floor is a Tailwind utility the harness does not compile, so the class is what is asserted. */
      expect(await link.getAttribute("class")).toContain("min-h-11");
      expect(await page.locator(".nf-palette__hint").getAttribute("aria-hidden")).toBe("true");
      /* Rows are not tab stops: the field is the one control, the rows are its options. */
      expect(await options(page).evaluateAll((els) => els.every((el) => (el as HTMLElement).tabIndex === -1))).toBe(true);
    } finally {
      await close();
    }
  });

  it("arrives its answer on a 160ms-class rise when motion is allowed, and at once when it is not", async () => {
    const live = await open();
    try {
      await live.page.locator(".nf-palette__row").first().click();
      expect(await live.page.locator(".nf-palette__answer").evaluate((el) => getComputedStyle(el).animationName)).toBe("nf-palette-in");
    } finally {
      await live.close();
    }
    for (const mode of [{ reducedMotion: true }, { motion: "calm" as const }, { motion: "off" as const }]) {
      const quiet = await open(mode);
      try {
        await quiet.page.locator(".nf-palette__row").first().click();
        expect(await quiet.page.locator(".nf-palette__answer").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
        expect(await quiet.page.locator(".nf-palette__answer").isVisible()).toBe(true);
      } finally {
        await quiet.close();
      }
    }
  });
});
