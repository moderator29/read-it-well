import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser } from "playwright-core";

/**
 * UI-09: hit-tested at 21px from each control's centre (inside a 44px
 * target, outside a 40px one). The header avatar's overflow clip cut its
 * 44px `.nf-tap` area back to 40 (0 of 4 on the live site); site footer
 * links were 40px tall. Renders the real rules in Chromium.
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
  const match = new RegExp(`^( *)${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{`, "m").exec(css);
  if (!match) throw new Error(`rule not found: ${selector} in ${file}`);
  const end = css.indexOf(`\n${match[1]}}`, match.index);
  return css.slice(match.index, end + match[1]!.length + 2);
}

describe.skipIf(!CHROMIUM && !process.env.CI)("touch targets (real Chromium)", () => {
  let browser: Browser;
  beforeAll(async () => {
    if (!CHROMIUM) throw new Error("CI must have a Chromium to run this check");
    browser = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox"] });
  });
  afterAll(async () => {
    await browser?.close();
  });

  it("the header avatar answers a thumb anywhere in its 44px target", async () => {
    const css = [rule("base.css", ".nf-tap"), rule("base.css", ".nf-tap::after"), rule("chrome.css", ".nf-app-header__avatar")].join("\n");
    const page = await browser.newPage({ viewport: { width: 390, height: 400 } });
    await page.setContent(
      `<html><head><style>:root{--nf-radius-circle:9999px}body{margin:0;display:grid;place-items:center;height:400px}${css}</style></head>
       <body><a href="#" class="nf-tap nf-app-header__avatar">A</a></body></html>`,
    );
    const hits = await page.evaluate(() => {
      const el = document.querySelector("a")!;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      return [[cx - 21, cy], [cx + 21, cy], [cx, cy - 21], [cx, cy + 21]].filter(([x, y]) => {
        const hit = document.elementFromPoint(x!, y!);
        return hit === el || el.contains(hit);
      }).length;
    });
    await page.close();
    expect(hits).toBe(4);
  });

  it("site footer links are at least 44px tall", async () => {
    const page = await browser.newPage();
    await page.setContent(`<html><head><style>${rule("site.css", ".nf-site-footer-link")}</style></head><body><a class="nf-site-footer-link" href="#">About</a></body></html>`);
    const height = await page.$eval("a", (a) => a.getBoundingClientRect().height);
    await page.close();
    expect(height).toBeGreaterThanOrEqual(44);
  });
});
