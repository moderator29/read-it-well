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
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";
import { productCss } from "@/lib/testing/product-css";

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

/*
 * TAB REACHES EVERY ROW, WITH A RING, IN A NAMED LIST (auditor A8, fifth audit:
 * "unreachable by keyboard and not announced"). ArrowDown was a shortcut only a
 * reader who already knew of it could use; Tab is the way every keyboard user
 * moves. Tab from the field passes what sits between (submit, filters) and must
 * then land on Clear and on each row in turn, the list open the whole way, each
 * row drawing the shared focus ring (2px, at least 3:1 against the panel, in
 * night and paper); the list is named "Recent searches" in the accessibility
 * tree; axe finds nothing with a row focused; Tab past the last row closes it.
 * On the old component the list closed the moment focus left the field, so no
 * row was ever reached, and the list had no name. The search screen's own bar
 * (ShelfBar, the real dictionary) is checked beside the Home hero and Stays bar.
 */
const TAB_FIELDS = {
  ...FIELDS,
  "Search screen bar": {
    inputId: "shelf-q",
    stored: SEEDED,
    entry: `
      import { mount } from "@/lib/testing/browser-root";
      import { getDictionary } from "@vallo/i18n";
      import { ShelfBar } from "@/components/app/search/ShelfBar";
      import { parseShelfQuery } from "@/components/app/search/shelf-query";
      mount(<ShelfBar query={parseShelfQuery({})} facts={[]} locale="en" t={getDictionary("en")} />);
    `,
  },
} as const;

const AXE_SOURCE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

/** WCAG 2.1 A and AA plus best practice over the mounted page, minus the page-level rules a bare harness cannot meet. */
async function axeViolations(page: Page): Promise<string[]> {
  await page.addScriptTag({ content: AXE_SOURCE });
  return page.evaluate(async () => {
    const w = window as unknown as {
      axe: { run: (ctx: unknown, options: unknown) => Promise<{ violations: { id: string; nodes: { html: string }[] }[] }> };
    };
    const out = await w.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] },
      rules: { "document-title": { enabled: false }, region: { enabled: false }, "page-has-heading-one": { enabled: false }, "landmark-one-main": { enabled: false } },
    });
    return out.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 160) ?? ""}`);
  });
}

/** The accessible role and name of the first node matching `selector`, as Chromium computes them. */
async function axNode(page: Page, selector: string): Promise<{ role: string; name: string }> {
  const cdp = await page.context().newCDPSession(page);
  try {
    const { root } = await cdp.send("DOM.getDocument");
    const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector });
    const { nodes } = await cdp.send("Accessibility.getPartialAXTree", { nodeId, fetchRelatives: false });
    return { role: String(nodes[0]?.role?.value ?? ""), name: String(nodes[0]?.name?.value ?? "") };
  } finally {
    await cdp.detach();
  }
}

/** The focused element's ring: style, width, and its contrast against the panel it sits on. */
const ringOfFocused = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const panel = el.closest(".nf-recent") as HTMLElement;
    const rgb = (c: string) => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const [r = 0, g = 0, b = 0, a = 1] = (m[1] ?? "").split(/[ ,/]+/).filter(Boolean).map(Number);
      return { r, g, b, a };
    };
    const lum = (c: { r: number; g: number; b: number }) => {
      const ch = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
    };
    const ring = getComputedStyle(el);
    const ink = rgb(ring.outlineColor);
    const ground = rgb(getComputedStyle(panel).backgroundColor);
    const ratio =
      ink && ground && ground.a === 1
        ? (Math.max(lum(ink), lum(ground)) + 0.05) / (Math.min(lum(ink), lum(ground)) + 0.05)
        : 0;
    return { style: ring.outlineStyle, width: Number.parseFloat(ring.outlineWidth), ratio, outline: ring.outlineColor, ground: getComputedStyle(panel).backgroundColor };
  });

describe.skipIf(!hasBrowser && !process.env.CI)("recent searches by Tab", () => {
  for (const [name, field] of Object.entries(TAB_FIELDS)) {
    it(`${name}: Tab reaches Clear and every row with a ring, the list is named, axe is clean`, async () => {
      const { page, close } = await mountInBrowser({
        entry: field.entry,
        css: productCss("app/css/member-loop.css"),
        init: `localStorage.setItem("nf_recent_searches", ${JSON.stringify(field.stored)});`,
      });
      try {
        const input = page.locator(`#${field.inputId}`);
        const panel = page.getByTestId("recent-searches");
        await input.focus();
        await expect.poll(() => panel.isVisible()).toBe(true);
        const hrefs = await panel.locator("a.nf-recent__row").evaluateAll((els) => els.map((a) => a.getAttribute("href")));
        expect(hrefs.length).toBeGreaterThan(1);

        /* The list is a list, named by its title. */
        expect(await axNode(page, `[data-testid="recent-searches"] ul`)).toEqual({ role: "list", name: "Recent searches" });

        /* Tab from the field: whatever sits between, then Clear, then each row in order, the list open throughout. */
        let steps = 0;
        while (!(await page.evaluate(() => Boolean(document.activeElement?.closest(".nf-recent"))))) {
          expect(++steps, "Tab never reached the list").toBeLessThan(8);
          await page.keyboard.press("Tab");
          expect(await panel.isVisible(), "Tab towards the list keeps it open").toBe(true);
        }
        expect(await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))).toBe("Clear recent searches");
        for (const href of hrefs) {
          await page.keyboard.press("Tab");
          expect(await focusedHref(page)).toBe(href);
          expect(await panel.isVisible()).toBe(true);
          for (const theme of ["dark", "light"]) {
            await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
            const ring = await ringOfFocused(page);
            expect(ring.style, `${theme} ${href}: a visible ring`).toBe("solid");
            expect(ring.width, `${theme} ${href}: ring width`).toBeGreaterThanOrEqual(2);
            expect(ring.ratio, `${theme} ${href}: ring ${ring.outline} on ${ring.ground}`).toBeGreaterThanOrEqual(3);
          }
          await page.evaluate(() => document.documentElement.removeAttribute("data-theme"));
        }

        /* With a row focused and the list open, axe finds nothing. */
        expect(await axeViolations(page)).toEqual([]);

        /* Tab past the last row leaves the stretch and the list closes. */
        await page.keyboard.press("Tab");
        await expect.poll(() => panel.isHidden()).toBe(true);
      } finally {
        await close();
      }
    });
  }
});
