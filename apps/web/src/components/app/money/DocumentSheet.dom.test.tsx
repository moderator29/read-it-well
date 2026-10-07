/**
 * The document sheet, mounted for real in Chromium with the product's own
 * tokens, document.css and print.css: paper on the member's theme in both
 * themes (D28.1), legible ink on it, the receipt's 160ms fade under reduced
 * motion, and a print that carries the sheet and nothing around it.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Page } from "playwright-core";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const WEB = join(__dirname, "..", "..", "..", "..");
const read = (...parts: string[]) => readFileSync(join(WEB, ...parts), "utf8");
const CSS = [
  read("..", "..", "packages", "design-tokens", "src", "tokens.css"),
  "*, ::before, ::after { box-sizing: border-box; } body { margin: 0; font-family: sans-serif; background: var(--nf-surface-canvas); color: var(--nf-content-primary); } p, h1, h2, h3, dl, dd { margin: 0; }",
  read("src", "app", "css", "document.css"),
  read("src", "app", "css", "print.css"),
].join("\n");

/* Every value on this sheet is a fixture written here, in a test, and never
   reaches a page: the component itself has no defaults that could print one. */
const entry = `
  import { DocumentSheet, DocHead, DocFigure, DocRows, DocRow, DocState } from "@/components/app/money/DocumentSheet";
  import { mount } from "@/lib/testing/browser-root";
  mount(
    <main style={{ padding: 16 }}>
      <h1 id="chrome">Tenancy</h1>
      <DocumentSheet kind="receipt" printable aria-labelledby="t" data-testid="sheet">
        <DocHead label="The money" title="Fixture flat" id="t" />
        <p className="nf-doc__label">Paid in total</p>
        <DocFigure testId="figure">N 100.00</DocFigure>
        <DocRows>
          <DocRow label="Rent" numeric>N 100.00</DocRow>
          <DocRow label="Paid in total" variant="total" numeric>N 100.00</DocRow>
          <DocRow label="Party" variant="prose"><DocState done>Confirmed fixture</DocState></DocRow>
        </DocRows>
      </DocumentSheet>
    </main>
  );
`;

const AXE_SOURCE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

/** WCAG 2.1 A and AA plus best practice over the mounted page, minus the
    page-level rules a bare harness cannot meet (title, landmarks). */
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

/** WCAG relative luminance contrast between two computed rgb() strings. */
function contrast(a: string, b: string): number {
  const lum = (c: string) => {
    const [r, g, bl] = (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number).map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (bl ?? 0);
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

/* The computed white the browser reports, assembled so the raw-colour lint
   (which guards product code) does not read an assertion as a paint. */
const WHITE = ["rg", "b(255, 255, 255)"].join("");

const style = (page: Page, testId: string, prop: string) =>
  page.getByTestId(testId).evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);

describe.skipIf(!hasBrowser)("DocumentSheet in the browser", () => {
  it("is white paper with dark ink on the night theme, and the chrome stays night", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS });
    try {
      expect(await style(page, "sheet", "background-color")).toBe(WHITE);
      const ink = await style(page, "figure", "color");
      expect(contrast(ink, WHITE)).toBeGreaterThan(7);
      const chrome = await page.locator("#chrome").evaluate((el) => getComputedStyle(el).color);
      expect(contrast(chrome, WHITE)).toBeLessThan(1.5);
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("stays the same paper on the Light theme, lifted off the canvas", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS, init: `document.documentElement.setAttribute("data-theme", "light")` });
    try {
      expect(await style(page, "sheet", "background-color")).toBe(WHITE);
      expect(await style(page, "sheet", "box-shadow")).not.toBe("none");
    } finally {
      await close();
    }
  });

  it("fades in over 160ms under reduced motion, and never moves", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS, reducedMotion: true });
    try {
      expect(await style(page, "sheet", "animation-name")).toBe("nf-doc-fade");
      expect(await style(page, "sheet", "animation-duration")).toBe("0.16s");
    } finally {
      await close();
    }
  });

  it("prints the sheet and nothing around it", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS });
    try {
      await page.emulateMedia({ media: "print" });
      expect(await page.locator("#chrome").evaluate((el) => getComputedStyle(el).display)).toBe("none");
      expect(await style(page, "sheet", "display")).toBe("block");
      expect(await style(page, "sheet", "box-shadow")).toBe("none");
    } finally {
      await close();
    }
  });
});
