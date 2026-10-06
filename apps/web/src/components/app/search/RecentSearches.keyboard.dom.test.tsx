/**
 * RECENT SEARCHES, REACHED AND ANNOUNCED WITHOUT A POINTER (Chromium).
 *
 * The submit button sits between the field and the list in document order, so
 * Tab from the field leaves for the button and the list closes behind it. The
 * way in is ArrowDown from the field; the way out is Escape. While the list is
 * shown the field is described by its title ("Recent searches"). The field
 * stays a plain search field and the list a list of links: no combobox role,
 * no `aria-expanded` (not allowed on a textbox), no options.
 *
 * Both fields are the real components: the Home hero and the Stays bar.
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

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT * 2 });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const SEEDED = JSON.stringify([
  { label: "Lekki, 2 beds", href: "/search?q=Lekki&beds=2" },
  { label: "Yaba, under 3m", href: "/search?q=Yaba" },
  { label: "Ikeja", href: "/search?q=Ikeja" },
]);
const SEEDED_STAYS = JSON.stringify([
  { label: "Victoria Island", href: "/stays/search?q=Victoria%20Island" },
  { label: "Ikoyi", href: "/stays/search?q=Ikoyi" },
]);

const FIELDS = {
  "Home hero": {
    inputId: "home-q",
    stored: SEEDED,
    entry: `
      import { mount } from "@/lib/testing/browser-root";
      import { HomeHero } from "@/components/app/home/HomeHero";
      mount(
        <HomeHero
          place={null}
          title="Find a place"
          lede="Lede"
          searchPlaceholder="Search"
          searchAction="/search"
          filtersHref="/search?filters=1"
          filtersLabel="Filters"
          searchLabel="Search listings"
          kind="rent"
          id="home-q"
          recent={{ title: "Recent searches", clear: "Clear", clearLabel: "Clear recent searches" }}
        />,
      );
    `,
  },
  "Stays bar": {
    inputId: "stays-q",
    stored: SEEDED_STAYS,
    entry: `
      import { mount } from "@/lib/testing/browser-root";
      import { StaySearchBar } from "@/components/app/stays/StaySearchBar";
      const t = {
        catalogue: {
          stays: { search: "Search stays", wherePlaceholder: "Where are you going?", filters: "Filters" },
          recent: { title: "Recent searches", clear: "Clear", clearLabel: "Clear recent searches" },
        },
      };
      mount(<StaySearchBar t={t as never} filtersHref="/stays/search?filters=1" />);
    `,
  },
} as const;

/** The field's accessible description as Chromium computes it, not as the attribute reads. */
async function describedAs(page: Page, selector: string): Promise<string> {
  const cdp = await page.context().newCDPSession(page);
  try {
    const { root } = await cdp.send("DOM.getDocument");
    const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector });
    const { nodes } = await cdp.send("Accessibility.getPartialAXTree", { nodeId, fetchRelatives: false });
    return String(nodes[0]?.description?.value ?? "");
  } finally {
    await cdp.detach();
  }
}

const focusedHref = (page: Page) =>
  page.evaluate(() => (document.activeElement as HTMLAnchorElement | null)?.getAttribute("href") ?? null);

describe.skipIf(!hasBrowser && !process.env.CI)("recent searches by keyboard", () => {
  for (const [name, field] of Object.entries(FIELDS)) {
    it(`${name}: ArrowDown enters the list, the title describes the field, Escape returns`, async () => {
      const { page, close } = await mountInBrowser({
        entry: field.entry,
        init: `localStorage.setItem("nf_recent_searches", ${JSON.stringify(field.stored)});`,
      });
      try {
        const input = page.locator(`#${field.inputId}`);
        const panel = page.getByTestId("recent-searches");
        await expect.poll(() => panel.count()).toBe(1);
        expect(await panel.isHidden(), "closed until the field is focused").toBe(true);
        expect(await describedAs(page, `#${field.inputId}`)).toBe("");

        await input.focus();
        await expect.poll(() => panel.isVisible()).toBe(true);
        expect(await describedAs(page, `#${field.inputId}`)).toBe("Recent searches");
        /* A plain field: no combobox, no aria-expanded. */
        expect(await input.getAttribute("role")).toBeNull();
        expect(await input.getAttribute("aria-expanded")).toBeNull();

        await page.keyboard.press("ArrowDown");
        const links = panel.locator("a.nf-recent__row");
        expect(await focusedHref(page)).toBe(await links.first().getAttribute("href"));
        expect(await panel.isVisible(), "moving into the list keeps it open").toBe(true);

        /* The rows are walked with the arrows; ArrowUp off the first is the field again. */
        await page.keyboard.press("ArrowDown");
        expect(await focusedHref(page)).toBe(await links.nth(1).getAttribute("href"));
        await page.keyboard.press("ArrowUp");
        await page.keyboard.press("ArrowUp");
        expect(await page.evaluate(() => document.activeElement?.id)).toBe(field.inputId);
        expect(await panel.isVisible()).toBe(true);

        /* Escape from a row closes the list and puts focus back in the field, and the list stays closed. */
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("Escape");
        expect(await page.evaluate(() => document.activeElement?.id)).toBe(field.inputId);
        await expect.poll(() => panel.isHidden()).toBe(true);
        expect(await describedAs(page, `#${field.inputId}`)).toBe("");
        await page.waitForTimeout(100);
        expect(await panel.isHidden(), "Escape is not undone by the field regaining focus").toBe(true);

        /* Leaving and coming back offers it again; ArrowDown on a closed list does nothing. */
        await page.keyboard.press("ArrowDown");
        expect(await page.evaluate(() => document.activeElement?.id)).toBe(field.inputId);
        await input.blur();
        await input.focus();
        await expect.poll(() => panel.isVisible()).toBe(true);
      } finally {
        await close();
      }
    });

    it(`${name}: typing closes the list and takes the description with it; a page's own description is kept`, async () => {
      const { page, close } = await mountInBrowser({
        entry: field.entry,
        init: `localStorage.setItem("nf_recent_searches", ${JSON.stringify(field.stored)});`,
      });
      try {
        const input = page.locator(`#${field.inputId}`);
        const panel = page.getByTestId("recent-searches");
        await page.evaluate((id) => {
          const note = document.createElement("p");
          note.id = "page-note";
          note.textContent = "Searches this city";
          document.body.append(note);
          document.getElementById(id)!.setAttribute("aria-describedby", "page-note");
        }, field.inputId);
        await input.focus();
        await expect.poll(() => panel.isVisible()).toBe(true);
        expect(await describedAs(page, `#${field.inputId}`)).toContain("Searches this city");
        expect(await describedAs(page, `#${field.inputId}`)).toContain("Recent searches");
        await page.keyboard.type("a");
        await expect.poll(() => panel.isHidden()).toBe(true);
        expect(await input.getAttribute("aria-describedby")).toBe("page-note");
      } finally {
        await close();
      }
    });
  }
});
