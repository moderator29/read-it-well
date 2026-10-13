/**
 * The console search, a command palette over the desk index, mounted for real
 * in Chromium on the product's own stylesheets (reference 7067). What it
 * promises and this holds it to:
 *
 *   - Control or Command K opens it from anywhere (and closes it again), and so
 *     does the phone bar's search button;
 *   - it is a modal dialog holding a combobox over a listbox: focus stays in the
 *     field, the lit row is `aria-activedescendant`, the arrows wrap, Home goes
 *     to the top, Enter opens, Escape closes, Tab stays inside, the page behind
 *     does not scroll;
 *   - IT ROUTES AND NOTHING ELSE: every row is a desk or a search that lands on
 *     a console address, no row reads or acts on a record, and the palette makes
 *     no request of its own;
 *   - focus returns to whatever opened it, by Enter, by Escape or by the scrim;
 *   - what a reader who asked for less motion is shown.
 *
 * Fixtures: the console's own desk map and the real English words. The queue
 * counts are left empty (the palette computes none; the rail's badges would pass
 * them down), and the pasted reference is the nil UUID, which is a shape and not
 * a record.
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

const CSS = productCss(
  GLASS_CSS,
  "app/css/typography.css",
  "app/css/controls.css",
  "app/css/admin.css",
  "app/admin/_components/admin-material.css",
);

const ENTRY = `
  import { getDictionary } from "@vallo/i18n";
  import { ConsolePalette } from "@/app/admin/_components/ConsolePalette";
  import { mount } from "@/lib/testing/browser-root";
  import { joinOverlay, leaveOverlay } from "@/lib/ui/overlay-registry";
  const t = getDictionary("en");
  /* Every request the page makes after mount is counted: a palette that routes asks for nothing. */
  window.__requests = 0;
  const realFetch = window.fetch.bind(window);
  window.fetch = (...args) => { window.__requests += 1; return realFetch(...args); };
  /* Stands in for a sheet that is already open: it joins the overlay stack. */
  window.__openSheet = () => joinOverlay();
  window.__closeSheet = (token) => leaveOverlay(token);
  mount(
    <div style={{ minHeight: 1400, padding: 16 }}>
      <button id="other" type="button">Something else on the page</button>
      <textarea id="note" aria-label="A note" defaultValue="A reviewer's draft" />
      <ConsolePalette
        copy={t.experienceAdmin.palette}
        ledes={t.experienceAdmin.deskLedes}
        counts={{}}
        shell={t.admin.shell}
      />
    </div>,
  );
`;

const MAC = `Object.defineProperty(navigator, "platform", { get: () => "MacIntel", configurable: true });`;

const dialog = (page: Page) => page.getByRole("dialog", { name: "Search the console" });
const box = (page: Page) => page.getByRole("combobox", { name: "Search the console" });
const options = (page: Page) => page.getByRole("option");
const names = (page: Page) => page.locator(".nf-admin-palette__row .nf-admin-palette__name").allTextContents();
const lit = (page: Page) =>
  options(page).evaluateAll((els) => els.findIndex((el) => el.getAttribute("aria-selected") === "true"));
const pushes = (page: Page) =>
  page.evaluate(() =>
    ((window as unknown as { __router: { calls: unknown[][] } }).__router?.calls ?? [])
      .filter((call) => call[0] === "push")
      .map((call) => call[1] as string),
  );
const activeId = (page: Page) => page.evaluate(() => document.activeElement?.id ?? document.activeElement?.getAttribute("aria-label") ?? "");
const focusInDialog = (page: Page) =>
  page.evaluate(() => document.querySelector("[role=dialog]")?.contains(document.activeElement) === true);

async function openByKeyboard(page: Page, chord = "Control+k") {
  await page.keyboard.press(chord);
  await dialog(page).waitFor();
}

describe.skipIf(!hasBrowser && !process.env.CI)("the console search palette", () => {
  it("is closed until asked, opens on Control K from anywhere, and closes on a second Control K", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      expect(await dialog(page).count()).toBe(0);
      await openByKeyboard(page);
      /* Focus goes straight to the field. */
      expect(await box(page).evaluate((el) => el === document.activeElement)).toBe(true);
      await page.keyboard.press("Control+k");
      expect(await dialog(page).count()).toBe(0);
    } finally {
      await close();
    }
  });

  /* D49.3: the chord used to be taken from inside any admin textarea. */
  it("leaves Control K and Command K to a textarea being written in", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      await page.locator("#note").focus();
      /* One chord at a time: two in a row would toggle a palette open and shut. */
      for (const chord of ["Control+k", "Meta+k"]) {
        await page.keyboard.press(chord);
        await page.waitForTimeout(200);
        expect(await dialog(page).count(), chord).toBe(0);
        expect(await page.evaluate(() => document.activeElement?.id), chord).toBe("note");
      }
      /* From anywhere else on the page it still opens. */
      await page.locator("#other").focus();
      await openByKeyboard(page);
    } finally {
      await close();
    }
  });

  /* D49.3: it used to stack a second aria-modal dialog over an open sheet. */
  it("does not open a second modal dialog over a sheet that is already open", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      const token = await page.evaluateHandle(() => (window as unknown as { __openSheet: () => symbol }).__openSheet());
      await page.keyboard.press("Control+k");
      await page.waitForTimeout(200);
      expect(await dialog(page).count()).toBe(0);
      expect(await page.locator("[aria-modal=true]").count()).toBe(0);
      await page.evaluate(
        (t) => (window as unknown as { __closeSheet: (token: symbol) => void }).__closeSheet(t),
        token,
      );
      await openByKeyboard(page);
      expect(await page.locator("[aria-modal=true]").count()).toBe(1);
    } finally {
      await close();
    }
  });

  it("opens on Command K as well, and says Cmd K on a Mac and Ctrl K elsewhere", async () => {
    const mac = await mountInBrowser({ entry: ENTRY, css: CSS, init: MAC });
    try {
      await openByKeyboard(mac.page, "Meta+k");
      expect(await mac.page.locator(".nf-admin-palette__where").textContent()).toBe("Cmd K");
    } finally {
      await mac.close();
    }
    const pc = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      await openByKeyboard(pc.page);
      expect(await pc.page.locator(".nf-admin-palette__where").textContent()).toBe("Ctrl K");
    } finally {
      await pc.close();
    }
  });

  it("is a modal dialog holding a combobox over a listbox of options, with the count announced politely", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      await openByKeyboard(page);
      expect(await dialog(page).getAttribute("aria-modal")).toBe("true");
      const field = box(page);
      expect(await field.getAttribute("aria-expanded")).toBe("true");
      expect(await field.getAttribute("aria-autocomplete")).toBe("list");
      const list = page.getByRole("listbox", { name: "Search the console" });
      expect(await list.count()).toBe(1);
      expect(await field.getAttribute("aria-controls")).toBe(await list.getAttribute("id"));
      expect(await options(page).count()).toBeGreaterThan(1);
      expect(await lit(page)).toBe(0);
      expect(await field.getAttribute("aria-activedescendant")).toBe(await options(page).first().getAttribute("id"));
      const status = dialog(page).locator("[role=status]");
      expect(await status.getAttribute("aria-live")).toBe("polite");
      expect(await status.textContent()).toMatch(/^\d+ results$/);
      expect(Number((await status.textContent())!.split(" ")[0])).toBe(await options(page).count());
      /* The group headings are decoration for the eye; the options are the content. */
      expect(await page.locator(".nf-admin-palette__heading").evaluateAll((els) => els.every((el) => el.getAttribute("aria-hidden") === "true"))).toBe(true);
      await page.waitForTimeout(400);
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("offers the desks in the rail's order with nothing waiting, and draws no count it was not handed", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      await openByKeyboard(page);
      const shown = await names(page);
      expect(shown[0]).toBe("Overview");
      expect(shown.length).toBeLessThanOrEqual(8);
      expect(await page.locator(".nf-admin-palette__count").count()).toBe(0);
      /* A desk's line says what it is for, from the console's own words. */
      expect(await page.locator(".nf-admin-palette__lede").first().textContent()).toBe(
        "What is waiting on a person, and how the platform is doing.",
      );
    } finally {
      await close();
    }
  });

  it("moves with the arrows (wrapping), Home goes to the top, and focus never leaves the field", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      await openByKeyboard(page);
      const total = await options(page).count();
      await page.keyboard.press("ArrowDown");
      expect(await lit(page)).toBe(1);
      await page.keyboard.press("ArrowUp");
      await page.keyboard.press("ArrowUp");
      /* Wrapped from the top to the last row. */
      expect(await lit(page)).toBe(total - 1);
      await page.keyboard.press("ArrowDown");
      expect(await lit(page)).toBe(0);
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Home");
      expect(await lit(page)).toBe(0);
      expect(await options(page).evaluateAll((els) => els.filter((el) => el.getAttribute("aria-selected") === "true").length)).toBe(1);
      expect(await box(page).getAttribute("aria-activedescendant")).toBe(await options(page).nth(0).getAttribute("id"));
      expect(await box(page).evaluate((el) => el === document.activeElement)).toBe(true);
    } finally {
      await close();
    }
  });

  it("filters desks by what is typed, leads with the desk named, and adds the searches under it", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      await openByKeyboard(page);
      await page.keyboard.type("money");
      const shown = await names(page);
      expect(shown[0]).toBe("Money");
      /* The searches offered once something is typed: people and the unified queue. */
      expect(shown).toContain("Search people for “money”");
      expect(shown).toContain("Search the unified queue for “money”");
      const sections = await page.locator(".nf-admin-palette__heading").allTextContents();
      expect(sections).toEqual(["Desks", "Search for"]);
      await page.keyboard.press("Enter");
      expect(await pushes(page)).toEqual(["/admin/money"]);
    } finally {
      await close();
    }
  });

  it("offers the open desk's own search first when it is on a desk, and leads with the lookup for a pasted reference", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS, url: "http://vallo.test/admin/bookings" });
    try {
      await openByKeyboard(page);
      await page.keyboard.type("zzz");
      expect((await names(page))[0]).toBe("Search Bookings for “zzz”");
      /* A word that names no desk says so, and still offers where to look. */
      expect(await page.locator(".nf-admin-palette__none .nf-admin-palette__name").textContent()).toBe("No desk by that name");
      await box(page).fill("00000000-0000-0000-0000-000000000000");
      expect((await names(page))[0]).toBe("Look up “00000000-0000-0000-0000-000000000000” as a reference");
      expect(await page.locator(".nf-admin-palette__heading").first().textContent()).toBe("Search for");
      await page.keyboard.press("Enter");
      expect(await pushes(page)).toEqual(["/admin/lookup?q=00000000-0000-0000-0000-000000000000"]);
      expect(await dialog(page).count()).toBe(0);
    } finally {
      await close();
    }
  });

  it("only routes: every row it can offer lands on a console address, and it asks the network for nothing", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS, url: "http://vallo.test/admin/bookings" });
    try {
      const landed: string[] = [];
      for (const query of ["", "queue", "zzz", "00000000-0000-0000-0000-000000000000"]) {
        await openByKeyboard(page);
        if (query) await page.keyboard.type(query);
        const total = await options(page).count();
        for (let row = 0; row < total; row += 1) {
          for (let step = 0; step < row; step += 1) await page.keyboard.press("ArrowDown");
          await page.keyboard.press("Enter");
          landed.push(...(await pushes(page)).slice(landed.length));
          await dialog(page).waitFor({ state: "detached" });
          await openByKeyboard(page);
          if (query) await page.keyboard.type(query);
        }
        await page.keyboard.press("Escape");
        await dialog(page).waitFor({ state: "detached" });
      }
      expect(landed.length).toBeGreaterThan(10);
      for (const href of landed) expect(href).toMatch(/^\/admin(\/[a-z-]+)*(\?q=[^&#]*)?$/);
      /* The palette is one field: it holds no form, no other input, no record. */
      await openByKeyboard(page);
      expect(await dialog(page).locator("form, textarea, select, input:not([role=combobox])").count()).toBe(0);
      expect(await page.evaluate(() => (window as unknown as { __requests: number }).__requests)).toBe(0);
    } finally {
      await close();
    }
  });

  it("keeps Tab inside, locks the page behind it, and unlocks it on close", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      await openByKeyboard(page);
      expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
      for (let i = 0; i < 5; i += 1) {
        await page.keyboard.press("Tab");
        expect(await focusInDialog(page)).toBe(true);
      }
      for (let i = 0; i < 3; i += 1) {
        await page.keyboard.press("Shift+Tab");
        expect(await focusInDialog(page)).toBe(true);
      }
      await page.keyboard.press("Escape");
      expect(await dialog(page).count()).toBe(0);
      expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
    } finally {
      await close();
    }
  });

  it("returns focus to whatever opened it: by Escape, by Enter, by the scrim and by the close button", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      /* Opened with the keyboard from another control. */
      await page.locator("#other").focus();
      await openByKeyboard(page);
      await page.keyboard.press("Escape");
      expect(await activeId(page)).toBe("other");

      await page.locator("#other").focus();
      await openByKeyboard(page);
      await page.keyboard.press("Enter");
      expect(await dialog(page).count()).toBe(0);
      expect(await activeId(page)).toBe("other");

      await page.locator("#other").focus();
      await openByKeyboard(page);
      await page.locator(".nf-admin-palette__scrim").click({ position: { x: 4, y: 700 } });
      expect(await dialog(page).count()).toBe(0);
      expect(await activeId(page)).toBe("other");

      await page.locator("#other").focus();
      await openByKeyboard(page);
      /* Measured once the arrival (a 0.985 scale on the way in) has settled. */
      await page.waitForTimeout(400);
      const closeButton = page.getByRole("button", { name: "Close the search" }).last();
      expect((await closeButton.boundingBox())!.width).toBeGreaterThanOrEqual(44);
      await closeButton.click();
      expect(await dialog(page).count()).toBe(0);
      expect(await activeId(page)).toBe("other");
    } finally {
      await close();
    }
  });

  it("opens from the phone bar's search button and hands focus back to that button", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      const opener = page.getByRole("button", { name: "Search the console", exact: true });
      expect(await opener.getAttribute("aria-haspopup")).toBe("dialog");
      expect(await opener.getAttribute("aria-expanded")).toBe("false");
      expect((await opener.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await opener.focus();
      await page.keyboard.press("Enter");
      await dialog(page).waitFor();
      expect(await opener.getAttribute("aria-expanded")).toBe("true");
      await page.keyboard.press("Escape");
      await dialog(page).waitFor({ state: "detached" });
      expect(await opener.evaluate((el) => el === document.activeElement)).toBe(true);
      expect(await opener.getAttribute("aria-expanded")).toBe("false");
    } finally {
      await close();
    }
  });

  it("is reached by Control K alone on a wide screen, where the bar has its own field and no button", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS, viewport: { width: 1280, height: 800 } });
    try {
      expect(await page.getByRole("button", { name: "Search the console", exact: true }).isVisible()).toBe(false);
      await openByKeyboard(page);
      expect(await box(page).evaluate((el) => el === document.activeElement)).toBe(true);
    } finally {
      await close();
    }
  });

  it("lights the row the pointer is on, so the pointer and Enter never disagree, and opens it on a tap", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      await openByKeyboard(page);
      const target = options(page).nth(2);
      await target.hover();
      expect(await lit(page)).toBe(2);
      expect(await box(page).getAttribute("aria-activedescendant")).toBe(await target.getAttribute("id"));
      const name = (await target.locator(".nf-admin-palette__name").textContent())!;
      await page.mouse.down();
      await page.mouse.up();
      const [pushed] = await pushes(page);
      expect(pushed).toMatch(/^\/admin/);
      expect(name.length).toBeGreaterThan(0);
      expect(await dialog(page).count()).toBe(0);
    } finally {
      await close();
    }
  });

  it("passes axe with a search typed and with no desk matching", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      await openByKeyboard(page);
      await page.keyboard.type("queue");
      await page.waitForTimeout(400);
      expect(await axeViolations(page)).toEqual([]);
      await box(page).fill("zzz");
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("arrives on a short rise when motion is allowed, and without one under reduced motion", async () => {
    const live = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      await openByKeyboard(live.page);
      expect(await live.page.locator(".nf-admin-palette__panel").evaluate((el) => getComputedStyle(el).animationName)).toBe("nf-admin-palette-in");
    } finally {
      await live.close();
    }
    const quiet = await mountInBrowser({ entry: ENTRY, css: CSS, reducedMotion: true });
    try {
      await openByKeyboard(quiet.page);
      expect(await quiet.page.locator(".nf-admin-palette__panel").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
      expect(await quiet.page.locator(".nf-admin-palette__panel").isVisible()).toBe(true);
    } finally {
      await quiet.close();
    }
  });
});
