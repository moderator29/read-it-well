import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser } from "playwright-core";

/**
 * UI-06: on a 390px phone the fit row of listing spec tiles broke words at
 * any letter ("Parkin g", "Backu p power"). This renders the real rules from
 * `app/css/catalogue.css` in Chromium, at the content width a 390px screen
 * leaves, and checks every word in every tile lays out on ONE line.
 */
const CHROMIUM = [
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  "/opt/pw-browsers/chromium/chrome-linux/chrome",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
].find((path) => existsSync(path));

const CSS = readFileSync(join(__dirname, "..", "..", "..", "app", "css", "catalogue.css"), "utf8");

/** The rules this surface is drawn by, lifted out of the stylesheet as written. */
function rule(selector: string): string {
  const start = CSS.indexOf(`  ${selector} {`);
  if (start < 0) throw new Error(`rule not found: ${selector}`);
  return CSS.slice(start, CSS.indexOf("\n  }", start) + 4);
}

const TOKENS = `:root{--nf-space-xs:8px;--nf-space-3xs:2px;--nf-pad-shell:24px;--nf-text-overline:11px;--nf-border-width:1px;--nf-radius-sm:10px}`;

const LABELS = ["Parking", "Backup power", "3 bedrooms", "2 bathrooms", "Furnished"];

describe.skipIf(!CHROMIUM && !process.env.CI)("listing spec tiles at 390px (real Chromium)", () => {
  let browser: Browser;
  beforeAll(async () => {
    if (!CHROMIUM) throw new Error("CI must have a Chromium to run this check");
    browser = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox"] });
  });
  afterAll(async () => {
    await browser?.close();
  });

  it("breaks no word in the middle", async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
    const css = [TOKENS, rule(".nf-spec-row"), rule(".nf-spec-tile"), rule(".nf-spec-row--fit"), rule(".nf-spec-row--fit .nf-spec-tile"), rule(".nf-spec-row--fit .nf-spec-tile > span")]
      .join("\n")
      .replace(/^\s*@layer[^{]*\{/m, "");
    const tiles = LABELS.map((l) => `<li class="nf-spec-tile"><svg width="16" height="16"></svg><span>${l}</span></li>`).join("");
    await page.setContent(
      `<html lang="en"><head><style>body{margin:0;font:11px/1.3 sans-serif}main{width:342px;margin-inline:24px}${css}</style></head><body><main><ul class="nf-spec-row nf-spec-row--fit">${tiles}</ul></main></body></html>`,
    );
    const split = await page.evaluate(() => {
      const broken: string[] = [];
      for (const span of Array.from(document.querySelectorAll(".nf-spec-tile > span"))) {
        const node = span.firstChild as Text;
        const text = node.data;
        let at = 0;
        for (const word of text.split(" ")) {
          const range = document.createRange();
          range.setStart(node, at);
          range.setEnd(node, at + word.length);
          const lines = new Set(Array.from(range.getClientRects()).map((r) => Math.round(r.top)));
          if (lines.size > 1) broken.push(word);
          at += word.length + 1;
        }
      }
      return broken;
    });
    expect(split).toEqual([]);
    await page.close();
  });
});
