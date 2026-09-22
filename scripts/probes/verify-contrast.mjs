/*
 * SETTLE ONE CONTRAST READING BY LOOKING AT THE ELEMENT ITSELF.
 *
 * The sweep reads an element's rectangle out of a frame. This opens the route,
 * scrolls the element into the middle of the screen, and asks Playwright for a
 * screenshot OF THAT ELEMENT, which is a different capture path with different
 * failure modes. If the two disagree, the sweep is wrong about that element and
 * the file on disk is the evidence either way.
 *
 * It writes the crop, so a person can open it rather than take a number's word.
 *
 * Usage: node scripts/probes/verify-contrast.mjs --base URL --spec spec.json --out DIR
 *   spec.json: [{ route, theme, selector, text }]
 */
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

const arg = (n, d = null) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const BASE = arg("base", "http://127.0.0.1:3971").replace(/\/$/, "");
const OUT = arg("out", "/tmp/verify");
const SPEC = JSON.parse(readFileSync(arg("spec"), "utf8"));
mkdirSync(OUT, { recursive: true });

const lum = ([r, g, b]) => {
  const f = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return +((x + 0.05) / (y + 0.05)).toFixed(2);
};

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: [
    "--enable-unsafe-swiftshader",
    "--use-angle=swiftshader",
    /*
     * SUBPIXEL ANTIALIASING MAKES EVERY GLYPH PIXEL A DIFFERENT COLOUR, AND
     * THAT IS WHY LOW-CONTRAST SMALL TEXT READ 1.00:1.
     *
     * With LCD text on, Chromium blends each glyph edge per colour channel, so
     * a 12px word is drawn in a few hundred RGB triples of which none is
     * common. The histogram then has no colour above the half-a-per-cent floor
     * except the ground, and the probe reports the ground against itself.
     * Measured on `/preview/f5/agent-listings`: "5 photos" is plainly legible
     * in an element crop opened by hand and read 1.00:1 in both the sweep and
     * the crop until this flag went in. Greyscale antialiasing keeps the glyph
     * core one colour, which is the colour the stylesheet actually asked for.
     */
    "--disable-lcd-text",
  ],
});

const results = [];
for (const s of SPEC) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: s.theme,
  });
  await page.addInitScript((t) => {
    try {
      window.localStorage.setItem("nf_theme", t);
    } catch {
      /* the attribute below still lands */
    }
  }, s.theme);
  const row = { ...s };
  try {
    const res = await page.goto(BASE + s.route, { waitUntil: "networkidle", timeout: 60_000 });
    if ((res?.status() ?? 0) !== 200) throw new Error(`status ${res?.status()}`);
    if (new URL(page.url()).pathname !== s.route) throw new Error(`landed ${new URL(page.url()).pathname}`);
    if (await page.locator("[data-nf-not-found]").count()) throw new Error("not-found body at 200");
    await page.evaluate((t) => {
      if (t === "light") document.documentElement.setAttribute("data-theme", "light");
      else document.documentElement.removeAttribute("data-theme");
    }, s.theme);
    await page.waitForTimeout(900);
    const loc = page
      .locator(s.selector)
      .filter({ hasText: s.text })
      .first();
    await loc.scrollIntoViewIfNeeded({ timeout: 10_000 });
    await page.waitForTimeout(500);
    const box = await loc.boundingBox();
    row.box = box && { w: Math.round(box.width), h: Math.round(box.height) };
    const name = `${s.route.replace(/\//g, "_")}-${s.theme}-${(s.label ?? s.text).replace(/\W+/g, "-")}.png`;
    const buf = await loc.screenshot({ path: join(OUT, name) });
    row.file = name;
    /* Read the crop back in the page, which is the only canvas available. */
    const hist = await page.evaluate(async (src) => {
      const img = new Image();
      img.src = "data:image/png;base64," + src;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      const m = new Map();
      for (let i = 0; i < d.length; i += 4) {
        const k = `${d[i]},${d[i + 1]},${d[i + 2]}`;
        m.set(k, (m.get(k) || 0) + 1);
      }
      return {
        px: c.width * c.height,
        /* The whole histogram, for the same reason probe-contrast.mjs searches
           all of it: an antialiased glyph core is rarely in the top few. */
        all: [...m.entries()].sort((a, b) => b[1] - a[1]),
      };
    }, buf.toString("base64"));
    row.px = hist.px;
    row.distinct = hist.all.slice(0, 6).map(([k, n]) => ({ rgb: k, share: +(n / hist.px).toFixed(3) }));
    const surface = hist.all[0][0].split(",").map(Number);
    let ink = surface;
    let best = 0;
    for (const [k, n] of hist.all) {
      const v = k.split(",").map(Number);
      const gap = Math.abs(lum(v) - lum(surface));
      if (gap > best && n > hist.px * 0.005) {
        best = gap;
        ink = v;
      }
    }
    row.surface = surface;
    row.ink = ink;
    row.measured = ratio(ink, surface);
  } catch (e) {
    row.error = String(e.message).split("\n")[0].slice(0, 160);
  }
  results.push(row);
  console.log(
    `${(row.error ? "ERR " : "").padEnd(4)}${row.theme.padEnd(5)} ${row.route}  ${s.selector}  "${s.text}"  ` +
      (row.error ? row.error : `sweep said ${s.sweepRatio ?? "?"}  element crop says ${row.measured}  (${row.box?.w}x${row.box?.h})  -> ${row.file}`),
  );
}
await browser.close();
writeFileSync(join(OUT, "verify.json"), JSON.stringify(results, null, 2) + "\n");
