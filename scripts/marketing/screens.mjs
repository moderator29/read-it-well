/**
 * Turns each mobile capture into a whole phone display, the way the phone
 * shows it: the status bar the native shell draws above the web view, then
 * the web view.
 *
 *   node scripts/marketing/screens.mjs [--only id,id]
 *
 * In:  docs/marketing/source/<id>.webp        1320 x 2682 (440 x 894 pt at 3x)
 * Out: docs/marketing/screens/<id>-ios.png     1320 x 2868, "9:41", for the island handset
 *      docs/marketing/screens/<id>-android.png 1320 x 2868, "10:00", for the Android handset
 *
 * The shell paints its status bar in the theme's colour (`overlaysWebView:
 * false` in apps/web/capacitor.config.ts), so the bar takes the colour of the
 * capture's own top edge and its glyphs are white on dark and black on light.
 * The bar shows full signal, Wi-Fi and battery, as a store screenshot should.
 */
import sharp from "sharp";
import { chromium } from "playwright-core";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const SOURCE = join(REPO, "docs", "marketing", "source");
const OUT = join(REPO, "docs", "marketing", "screens");
const FONTS = join(REPO, "apps", "web", "public", "fonts");
mkdirSync(OUT, { recursive: true });

/* Inlined: a page set with setContent may not load file:// fonts. */
const INTER = `data:font/woff2;base64,${readFileSync(join(FONTS, "inter-latin.woff2")).toString("base64")}`;
const W = 1320;
const BAR = 186;
const H = 2868;
const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1].split(",") : null;

const glyphs = (fg, android) => `
  <svg width="${android ? 58 : 66}" height="${android ? 40 : 40}" viewBox="0 0 20 12" fill="${fg}">
    <rect x="0" y="8" width="3.4" height="4" rx="1"/><rect x="5.2" y="5.6" width="3.4" height="6.4" rx="1"/>
    <rect x="10.4" y="3" width="3.4" height="9" rx="1"/><rect x="15.6" y="0" width="3.4" height="12" rx="1"/>
  </svg>
  <svg width="${android ? 50 : 58}" height="${android ? 38 : 42}" viewBox="0 0 18 13" fill="${fg}">
    <path d="M9 12.6 6.2 9.4a4 4 0 0 1 5.6 0L9 12.6Z"/>
    <path d="M3.4 6.6a8 8 0 0 1 11.2 0l-1.5 1.7a5.8 5.8 0 0 0-8.2 0L3.4 6.6Z"/>
    <path d="M.6 3.6a12 12 0 0 1 16.8 0l-1.5 1.7a9.8 9.8 0 0 0-13.8 0L.6 3.6Z"/>
  </svg>
  ${android
    ? `<svg width="30" height="52" viewBox="0 0 10 17"><rect x="3" y="0" width="4" height="1.6" rx=".5" fill="${fg}"/><rect x=".6" y="1.4" width="8.8" height="15" rx="2" fill="${fg}"/></svg>`
    : `<svg width="92" height="42" viewBox="0 0 29 13"><rect x="0.6" y="0.6" width="24.4" height="11.8" rx="3.6" fill="none" stroke="${fg}" stroke-opacity="0.42" stroke-width="1.2"/><rect x="2.4" y="2.4" width="20.8" height="8.2" rx="2.2" fill="${fg}"/><path d="M26.4 4.4v4.2a2.2 2.2 0 0 0 0-4.2Z" fill="${fg}" fill-opacity="0.45"/></svg>`}`;

function barHtml({ fg, android }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face { font-family: "Inter"; font-weight: 100 900; src: url("${INTER}") format("woff2"); }
  html, body { margin: 0; width: ${W}px; height: ${BAR}px; background: transparent; }
  .bar { position: relative; width: ${W}px; height: ${BAR}px; display: flex; align-items: center; justify-content: space-between;
    box-sizing: border-box; padding: ${android ? "8px 70px 0 76px" : "16px 96px 0 150px"};
    font: ${android ? 500 : 600} ${android ? 50 : 54}px/1 "Inter", sans-serif; letter-spacing: ${android ? "0" : "-0.01em"}; color: ${fg}; }
  .g { display: flex; align-items: center; gap: ${android ? 16 : 20}px; }
  </style></head><body><div class="bar"><span>${android ? "10:00" : "9:41"}</span><span class="g">${glyphs(fg, android)}</span></div></body></html>`;
}

/* The four bars, drawn once with a transparent ground. */
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: W, height: BAR }, deviceScaleFactor: 1 });
const bars = {};
for (const android of [false, true]) {
  for (const fg of ["#FFFFFF", "#000000"]) {
    await page.setContent(barHtml({ fg, android }), { waitUntil: "load" });
    await page.evaluate(async () => { await document.fonts.load("600 54px Inter", "9:41"); await document.fonts.ready; });
    const family = await page.evaluate(() => document.fonts.check("600 54px Inter", "9:41"));
    if (!family) throw new Error("Inter did not load for the status bar");
    bars[`${android ? "android" : "ios"}-${fg}`] = await page.screenshot({ omitBackground: true });
  }
}
await browser.close();

/* The colour of the capture's top edge: the median of its first rows. */
/* The app's own chrome colours (apps/web/src/lib/theme/chrome.ts), which the
   native shell paints behind the status bar. */
const CHROME = { dark: { r: 1, g: 1, b: 24 }, light: { r: 244, g: 244, b: 241 } };
const REPORT = JSON.parse(readFileSync(join(SOURCE, "capture-report.json"), "utf8"));
/* Pages that keep one theme whatever the member chose. */
const ONE_THEME = /^(welcome|lock)/;

/**
 * The bar's colour: the flat colour of the page's header, read a few rows
 * down so a 1 px hairline at the very top does not tint it; where the page
 * opens on a photograph rather than a flat header, the app's chrome colour
 * for the capture's theme.
 */
async function topColour(file, id) {
  const { data, info } = await sharp(file).extract({ left: 0, top: 6, width: W, height: 10 }).raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const vals = [[], [], []];
  for (let i = 0; i < data.length; i += ch) for (let c = 0; c < 3; c += 1) vals[c].push(data[i + c]);
  const med = vals.map((v) => [...v].sort((a, b) => a - b)[v.length >> 1]);
  const spread = Math.max(...vals.map((v, c) => Math.sqrt(v.reduce((sum, x) => sum + (x - med[c]) ** 2, 0) / v.length)));
  const [r, g, b] = med;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  /* A header is a flat navy (blue leading) or a flat near-white; anything
     else up there is a photograph. */
  const header = spread <= 10 && ((b >= r && b >= g && lum < 90) || lum > 200);
  if (header) return { r, g, b };
  const theme = ONE_THEME.test(id) ? "dark" : String(REPORT[id]?.theme ?? "dark").startsWith("light") ? "light" : "dark";
  return CHROME[theme];
}

const files = readdirSync(SOURCE).filter((f) => f.endsWith(".webp") && !f.endsWith("-full.webp") && !f.startsWith("d-"));
let made = 0;
for (const f of files) {
  const id = f.replace(/\.webp$/, "");
  if (only && !only.includes(id)) continue;
  const src = join(SOURCE, f);
  const meta = await sharp(src).metadata();
  if (meta.width !== W || meta.height !== H - BAR) { console.log(`skip ${id}: ${meta.width}x${meta.height}`); continue; }
  const bg = await topColour(src, id);
  const dark = 0.2126 * bg.r + 0.7152 * bg.g + 0.0722 * bg.b < 140;
  const fg = dark ? "#FFFFFF" : "#000000";
  for (const android of [false, true]) {
    const out = join(OUT, `${id}-${android ? "android" : "ios"}.png`);
    await sharp({ create: { width: W, height: H, channels: 3, background: bg } })
      .composite([
        { input: bars[`${android ? "android" : "ios"}-${fg}`], left: 0, top: 0 },
        { input: src, left: 0, top: BAR },
      ])
      .png({ compressionLevel: 9 })
      .toFile(out);
  }
  made += 1;
}
console.log(`screens: ${made} captures, ${made * 2} displays in ${OUT.replace(REPO + "/", "")}`);
if (!existsSync(OUT)) process.exit(1);
