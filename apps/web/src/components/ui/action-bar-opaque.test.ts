import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser } from "playwright-core";

/**
 * The pinned action bar on a listing is opaque, so the tab strip and headings
 * scrolling under it never read through the price and the button (THE_HUNDRED
 * walk: "Overview" printed across "Total for 2 nights"). Renders the real rules
 * from `glass.css` and `chips.css` in Chromium and reads the bar's computed
 * background colour.
 */
const CHROMIUM = [
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  "/opt/pw-browsers/chromium/chrome-linux/chrome",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
].find((path) => existsSync(path));

const CSS_DIR = join(__dirname, "..", "..", "app", "css");
function rule(file: string, selector: string): string {
  const css = readFileSync(join(CSS_DIR, file), "utf8");
  const start = css.indexOf(`  ${selector} {`);
  if (start < 0) return "";
  return css.slice(start, css.indexOf("\n  }", start) + 4);
}

describe.skipIf(!CHROMIUM && !process.env.CI)("the pinned action bar (real Chromium)", () => {
  let browser: Browser;
  beforeAll(async () => {
    if (!CHROMIUM) throw new Error("CI must have a Chromium to run this check");
    browser = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox"] });
  });
  afterAll(async () => {
    await browser?.close();
  });

  it("hides what scrolls under it, with or without a backdrop blur", async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 400 } });
    const css = [
      ":root{--nf-glass-fill-strong:rgba(255,255,255,0.11);--nf-surface-canvas:#010118;--nf-glass-blur-strong:0px;--nf-glass-saturate:1}",
      rule("glass.css", ".nf-glass--strong"),
      rule("chips.css", ".nf-action-bar-pinned"),
      rule("chips.css", ".nf-glass.nf-action-bar-pinned"),
    ].join("\n");
    await page.setContent(
      `<html><head><style>body{margin:0;background:#fff}${css}</style></head><body>
       <div class="nf-glass nf-glass--strong nf-action-bar-pinned" style="position:fixed;left:0;right:0;bottom:0;height:120px;backdrop-filter:none;-webkit-backdrop-filter:none"></div>
       </body></html>`,
    );
    const bg = await page.evaluate(
      () => getComputedStyle(document.querySelector(".nf-action-bar-pinned") as Element).backgroundColor,
    );
    /* An opaque colour computes as rgb(...); the old 11% glass computed as rgba(..., 0.11). */
    expect(bg).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
    await page.close();
  });
});
