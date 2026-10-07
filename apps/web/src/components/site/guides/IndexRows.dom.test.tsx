/**
 * The index (reference 7086), mounted for real in Chromium on the product's own
 * stylesheets: the one component the documentation contents, the help topics,
 * the guides and the policy links all share. What it is held to:
 *
 *   - a real list (ordered when it is a sequence), named, one link per row;
 *   - every row at least 44px tall, at a phone's width and at a desktop's, and
 *     one column below 48rem and two from it;
 *   - ONE Card holds the rows; a row has no edge of its own;
 *   - the trailing fact is tabular, on one line, at the row's end, and absent
 *     when the row has none; the one-line description stops at two lines;
 *   - the keyboard walks the rows in order with a visible focus ring;
 *   - the rows are simply there under reduced motion, Calm and Off, and settle
 *     fully visible when motion is allowed;
 *   - axe passes in both themes.
 *
 * Fixtures are slot names ("First door, slot"): no guide, topic or count is
 * invented, and the trailing facts are the words "Fact, slot".
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
  "app/css/base.css",
  "app/css/typography.css",
  "app/css/controls.css",
  "components/site/guides/docs-type.css",
);

const LONG = "A long description of what is behind this door, slot. ".repeat(8);

const ITEMS = [
  { href: "/first-slot", icon: "document", title: "First door, slot", line: "What is behind the first door, slot.", meta: "Fact, slot" },
  { href: "/second-slot", icon: "info", title: "Second door, slot", line: LONG, meta: "Fact, slot" },
  { href: "/third-slot", icon: "key", title: "Third door, slot", line: "What is behind the third door, slot." },
  { href: "/fourth-slot", icon: "map", title: "Fourth door, slot", line: "What is behind the fourth door, slot.", meta: "Fact, slot", lang: "yo" },
  { href: "/fifth-slot", icon: "bell", title: "Fifth door, slot", line: "What is behind the fifth door, slot." },
  { href: "/sixth-slot", icon: "heart", title: "Sixth door, slot", line: "What is behind the sixth door, slot.", meta: "Fact, slot" },
  { href: "/seventh-slot", icon: "user", title: "Seventh door, slot", line: "What is behind the seventh door, slot." },
];

function entry(as: "ul" | "ol" = "ol"): string {
  return `
    import { IndexRows } from "@/components/site/guides/IndexRows";
    import { mount } from "@/lib/testing/browser-root";
    mount(
      <div style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
        <a id="before" href="#top">before</a>
        <IndexRows items={${JSON.stringify(ITEMS)}} label="The index, slot" as="${as}" />
      </div>,
    );
  `;
}

const rows = (page: Page) => page.locator(".nf-index__row");
const LIGHT = `document.documentElement.setAttribute("data-theme", "light");`;
const WIDE = { width: 1280, height: 900 };

describe.skipIf(!hasBrowser && !process.env.CI)("the index rows", () => {
  it("is a named ordered list for a sequence, one link per row, in the order given", async () => {
    const { page, close } = await mountInBrowser({ entry: entry("ol"), css: CSS });
    try {
      const list = page.getByRole("list", { name: "The index, slot" });
      expect(await list.count()).toBe(1);
      expect(await list.evaluate((el) => el.tagName)).toBe("OL");
      expect(await list.locator("> li").count()).toBe(ITEMS.length);
      expect(await rows(page).evaluateAll((els) => els.map((el) => el.getAttribute("href")))).toEqual(ITEMS.map((i) => i.href));
      expect(await rows(page).locator(".nf-index__title").allTextContents()).toEqual(ITEMS.map((i) => i.title));
      /* A row's own language is passed through where it differs. */
      expect(await rows(page).evaluateAll((els) => els.map((el) => el.getAttribute("lang")))).toEqual(
        ITEMS.map((i) => ("lang" in i ? i.lang : null)),
      );
      /* The glyph is decoration: the row is named by its words. */
      expect(await page.getByRole("link", { name: /First door, slot/ }).count()).toBe(1);
    } finally {
      await close();
    }
  });

  it("is an unordered list by default", async () => {
    const { page, close } = await mountInBrowser({ entry: entry("ul"), css: CSS });
    try {
      expect(await page.getByRole("list", { name: "The index, slot" }).evaluate((el) => el.tagName)).toBe("UL");
    } finally {
      await close();
    }
  });

  it("keeps every row at least 44px tall, in one column on a phone and two from 48rem", async () => {
    const phone = await mountInBrowser({ entry: entry(), css: CSS });
    try {
      await phone.page.waitForTimeout(900);
      for (const h of await rows(phone.page).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))) {
        expect(h).toBeGreaterThanOrEqual(44);
      }
      const columns = await phone.page.locator(".nf-index").evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
      expect(columns).toBe(1);
      expect(await phone.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    } finally {
      await phone.close();
    }
    const desk = await mountInBrowser({ entry: entry(), css: CSS, viewport: WIDE });
    try {
      await desk.page.waitForTimeout(900);
      for (const h of await rows(desk.page).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))) {
        expect(h).toBeGreaterThanOrEqual(44);
      }
      expect(await desk.page.locator(".nf-index").evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length)).toBe(2);
      /* The first two rows share a line; the third starts the next. */
      const tops = await rows(desk.page).evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
      expect(tops[0]).toBe(tops[1]);
      expect(tops[2]).toBeGreaterThan(tops[0]!);
    } finally {
      await desk.close();
    }
  });

  it("is one Card of rows: the rows carry no edge of their own, only the Plate's radius and wash", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: CSS });
    try {
      expect(await page.locator(".nf-index-card").count()).toBe(1);
      expect(await page.locator(".nf-index-card").evaluate((el) => el.classList.contains("nf-panel--card"))).toBe(true);
      expect(await page.locator(".nf-panel").count()).toBe(1);
      const edges = await rows(page).evaluateAll((els) =>
        els.map((el) => {
          const s = getComputedStyle(el);
          return { border: s.borderTopWidth, shadow: s.boxShadow, radius: s.borderTopLeftRadius };
        }),
      );
      for (const e of edges) {
        expect(e.border).toBe("0px");
        expect(e.shadow).toBe("none");
        expect(parseFloat(e.radius)).toBe(14);
      }
    } finally {
      await close();
    }
  });

  it("puts the trailing fact at the row's end, tabular and on one line, and draws none where a row has none", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: CSS });
    try {
      expect(await page.locator(".nf-index__meta").count()).toBe(ITEMS.filter((i) => "meta" in i).length);
      const facts = await page.locator(".nf-index__row").evaluateAll((els) =>
        els.map((row) => {
          const meta = row.querySelector(".nf-index__meta") as HTMLElement | null;
          if (!meta) return null;
          const text = (row.querySelector(".nf-index__text") as HTMLElement).getBoundingClientRect();
          const m = meta.getBoundingClientRect();
          const s = getComputedStyle(meta);
          return { after: m.left >= text.right - 1, tabular: s.fontVariantNumeric, nowrap: s.whiteSpace, oneLine: m.height < 2 * parseFloat(s.fontSize) * 1.6 };
        }),
      );
      expect(facts.map((f) => f !== null)).toEqual(ITEMS.map((i) => "meta" in i));
      for (const f of facts.filter(Boolean)) {
        expect(f).toMatchObject({ after: true, nowrap: "nowrap", oneLine: true });
        expect(f!.tabular).toContain("tabular-nums");
      }
    } finally {
      await close();
    }
  });

  it("stops a long description at two lines, and leaves a short one whole", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: CSS });
    try {
      const lines = await page.locator(".nf-index__line").evaluateAll((els) =>
        els.map((el) => {
          const s = getComputedStyle(el);
          const one = el.cloneNode(false) as HTMLElement;
          one.textContent = "x";
          one.style.setProperty("-webkit-line-clamp", "none");
          one.style.display = "block";
          el.parentElement!.append(one);
          const line = one.getBoundingClientRect().height;
          one.remove();
          return { clamp: s.webkitLineClamp, shown: Math.round(el.clientHeight / line), cut: el.scrollHeight > el.clientHeight + 1 };
        }),
      );
      expect(lines.every((l) => l.clamp === "2")).toBe(true);
      expect(lines[1]).toEqual({ clamp: "2", shown: 2, cut: true });
      expect(lines[0]!.cut).toBe(false);
      expect(lines.every((l) => l.shown <= 2)).toBe(true);
    } finally {
      await close();
    }
  });

  it("is walked by the keyboard row by row, in order, each with a visible focus ring", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: CSS });
    try {
      await page.locator("#before").focus();
      const seen: (string | null)[] = [];
      for (let i = 0; i < ITEMS.length; i += 1) {
        await page.keyboard.press("Tab");
        seen.push(await page.evaluate(() => document.activeElement?.getAttribute("href") ?? null));
        if (i === 0) {
          const ring = await page.evaluate(() => {
            const s = getComputedStyle(document.activeElement!);
            return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
          });
          expect(ring.style).not.toBe("none");
          expect(ring.width).toBeGreaterThanOrEqual(2);
        }
      }
      expect(seen).toEqual(ITEMS.map((i) => i.href));
    } finally {
      await close();
    }
  });

  it("settles every row fully visible when motion is allowed, and has them simply there when it is not", async () => {
    const live = await mountInBrowser({ entry: entry(), css: CSS, viewport: { width: 390, height: 600 } });
    try {
      await live.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await live.page.waitForTimeout(1500);
      expect(await rows(live.page).evaluateAll((els) => els.every((el) => getComputedStyle(el.parentElement!).opacity === "1"))).toBe(true);
    } finally {
      await live.close();
    }
    for (const mode of [{ reducedMotion: true }, { motion: "calm" as const }, { motion: "off" as const }]) {
      const quiet = await mountInBrowser({ entry: entry(), css: CSS, viewport: { width: 390, height: 600 }, ...mode });
      try {
        /* At once, with no wait: below the fold included, and not mid-animation. */
        const state = await rows(quiet.page).evaluateAll((els) =>
          els.map((el) => {
            const s = getComputedStyle(el.parentElement!);
            return { opacity: s.opacity, transform: s.transform, animation: s.animationName };
          }),
        );
        for (const s of state) {
          expect(s.opacity).toBe("1");
          expect(s.transform).toBe("none");
          expect(s.animation).toBe("none");
        }
      } finally {
        await quiet.close();
      }
    }
  });

  it("passes axe in the night theme and in the paper theme", async () => {
    for (const init of [undefined, LIGHT]) {
      const { page, close } = await mountInBrowser({ entry: entry(), css: CSS, init });
      try {
        await page.waitForTimeout(1200);
        expect(await page.evaluate(() => document.documentElement.getAttribute("data-theme") ?? "dark")).toBe(init ? "light" : "dark");
        expect(await axeViolations(page), init ? "light" : "dark").toEqual([]);
      } finally {
        await close();
      }
    }
  });
});
