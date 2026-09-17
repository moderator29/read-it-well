import { chromium } from "playwright-core";
const EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: EXE });

/*
 * CONTRAST FROM THE PIXELS THAT WERE ACTUALLY PAINTED.
 *
 * Two earlier probes computed it from the cascade and both were wrong: one took
 * a 15%-alpha `color-mix` surface as if it were opaque, and one walked past a
 * gradient because it only ever read `background-color`. The second was caught
 * by a sanity case reading 1.09 for white on a brand button, which cannot
 * happen. Nothing derived from `getComputedStyle` is trusted here.
 *
 * This screenshots the element, reads it back through a canvas, and takes the
 * darkest and lightest pixels actually present. For text on a flat panel those
 * ARE the ink and the surface, whatever painted them: a gradient, a color-mix,
 * a backdrop-filter or three translucent layers.
 */
function lum([r, g, b]) {
  const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return +((x + 0.05) / (y + 0.05)).toFixed(2);
};

/*
 * What to measure. Selectors rather than a sweep: a sweep over every node
 * screenshots hundreds of elements and the ones that matter are the few where
 * ink sits on a tinted surface.
 */
const TARGETS = [
  ["stalled body", 'span:has-text("Do not send this again")'],
  ["stalled heading", 'span:text-is("We have not heard back")'],
  ["slow line", 'p:has-text("This is taking longer than usual")'],
  ["primary button label", 'a:has-text("See your history")'],
];

for (const theme of ["dark", "light"]) {
  const page = await browser.newPage({ viewport: { width: 390, height: 1400 }, colorScheme: theme, deviceScaleFactor: 2 });
  await page.goto("http://localhost:3000/gallery", { waitUntil: "networkidle" });
  await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
  await page.waitForTimeout(300);
  console.log(`\n== ${theme}`);
  for (const [name, sel] of TARGETS) {
    const el = page.locator(sel).first();
    if (!(await el.count())) { console.log(`   ${name}: not found`); continue; }
    await el.scrollIntoViewIfNeeded();
    const buf = await el.screenshot();
    const dataUrl = `data:image/png;base64,${buf.toString("base64")}`;
    const res = await page.evaluate(async (url) => {
      const img = new Image();
      img.src = url;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      const hist = new Map();
      for (let i = 0; i < d.length; i += 4) {
        const k = `${d[i]},${d[i + 1]},${d[i + 2]}`;
        hist.set(k, (hist.get(k) || 0) + 1);
      }
      const sorted = [...hist.entries()].sort((a, b) => b[1] - a[1]);
      /* The most common colour is the surface. The ink is the most common
         colour furthest from it in luminance, which for antialiased text is the
         glyph core rather than a fringe pixel. */
      const px = (k) => k.split(",").map(Number);
      const surface = px(sorted[0][0]);
      const L = (v) => {
        const f = (x) => { const s = x / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
        return 0.2126 * f(v[0]) + 0.7152 * f(v[1]) + 0.0722 * f(v[2]);
      };
      let ink = surface, best = 0;
      for (const [k, n] of sorted.slice(0, 40)) {
        const v = px(k);
        const d2 = Math.abs(L(v) - L(surface));
        if (d2 > best && n > c.width * c.height * 0.01) { best = d2; ink = v; }
      }
      return { surface, ink };
    }, dataUrl);
    console.log(`   ${name.padEnd(22)} ink ${String(res.ink).padEnd(15)} on ${String(res.surface).padEnd(15)} = ${ratio(res.ink, res.surface)}`);
  }
  await page.close();
}
await browser.close();
