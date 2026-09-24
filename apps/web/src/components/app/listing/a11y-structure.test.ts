import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser } from "playwright-core";

/**
 * DOC-21: axe on the live site at 390px found scrollable strips a keyboard
 * could not reach (the stay gallery, the detail capsules, the stay-card
 * chips), a <dl> whose rows wrapped <dt>/<dd> in an extra div beside an icon,
 * and /wallet with no <h1>. The source checks pin each fix; the Chromium
 * check runs axe itself over the utilities row as it was and as it is.
 */
const APP = join(__dirname, "..", "..", "..");
const src = (p: string) => readFileSync(join(APP, p), "utf8");

const CHROMIUM = [
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  "/opt/pw-browsers/chromium/chrome-linux/chrome",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
].find((path) => existsSync(path));
const AXE = [join(APP, "..", "node_modules", "axe-core", "axe.min.js"), join(APP, "..", "..", "..", "node_modules", "axe-core", "axe.min.js")].find(
  (p) => existsSync(p),
);

describe("keyboard and semantics on listing, stay and wallet pages", () => {
  it("lets a keyboard reach every scrolling strip, or does not scroll", () => {
    expect(src("components/app/listing/ListingGallery.tsx")).toMatch(/ref=\{track\}[\s\S]{0,80}tabIndex=\{0\}/);
    expect(src("components/app/listing/DetailAnatomy.tsx")).toMatch(/nf-detail-capsules nf-scroll-x"[^>]*tabIndex=\{0\}/);
    const chips = src("app/css/catalogue.css");
    const rule = chips.slice(chips.indexOf("  .nf-stay-card__chips {"), chips.indexOf("}", chips.indexOf("  .nf-stay-card__chips {")));
    expect(rule).not.toMatch(/overflow(-x)?:\s*(auto|scroll)/);
  });

  it("keeps each utilities row to its <dt> and <dd>, and gives /wallet an <h1>", () => {
    const row = src("components/app/listing/ListingUtilities.tsx");
    const body = row.slice(row.indexOf("function Row("));
    expect(body).not.toContain('<div className="min-w-0 flex-1">');
    expect(body).toMatch(/<div className="flow-root[^"]*">\s*<dt/);
    expect(src("app/(app)/wallet/page.tsx")).toContain('<h1 className="sr-only">');
  });

  describe.skipIf((!CHROMIUM || !AXE) && !process.env.CI)("axe over the row shapes (real Chromium)", () => {
    let browser: Browser;
    beforeAll(async () => {
      if (!CHROMIUM || !AXE) throw new Error("CI must have Chromium and axe-core to run this check");
      browser = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox"] });
    });
    afterAll(async () => {
      await browser?.close();
    });

    const violations = async (html: string) => {
      const page = await browser.newPage();
      await page.setContent(`<html lang="en"><body><main>${html}</main></body></html>`);
      await page.addScriptTag({ content: readFileSync(AXE!, "utf8") });
      const ids = await page.evaluate(async () => {
        const w = window as unknown as { axe: { run: (d: Document, o: unknown) => Promise<{ violations: { id: string }[] }> } };
        const r = await w.axe.run(document, { runOnly: { type: "rule", values: ["definition-list", "dlitem"] } });
        return r.violations.map((v) => v.id);
      });
      await page.close();
      return ids;
    };

    it("fails the old row and passes the new one", async () => {
      const before = `<dl><div class="flex"><span><svg></svg></span><div><dt>Light</dt><dd>Grid</dd></div></div></dl>`;
      const after = `<dl><div style="display:flow-root"><dt><span style="float:left" aria-hidden="true"><svg></svg></span>Light</dt><dd style="overflow:hidden">Grid</dd></div></dl>`;
      expect(await violations(before)).toEqual(expect.arrayContaining(["definition-list"]));
      expect(await violations(after)).toEqual([]);
    });
  });
});
