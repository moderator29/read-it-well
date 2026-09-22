/*
 * THE FOUR DAYLIGHT STATE COLOURS, DRAWN AND THEN READ OFF THE PIXELS.
 *
 * The ledger records success, warning, error and info as recomputed on 22
 * September and all four clearing 4.5:1 on the light surfaces, and marks the
 * claim PROVEN BY ARITHMETIC and UNPROVEN IN A BROWSER. The arithmetic was
 * done against the token values; this draws the tokens, on all four light
 * surfaces the badge tint can land on, and reads the ratio out of a screenshot.
 *
 * The badge tint is a percentage of the colour OVER WHATEVER SURFACE IT LANDS
 * ON, which is the whole reason the first figures were wrong: a ratio quoted
 * against white is not the ratio on the grey canvas. So each swatch is drawn
 * four times, once on each surface token, and the screenshot is the record.
 *
 * It mounts its own markup on a real page of the product, so the real token
 * sheet, the real cascade and the real compositor are all in the loop. Nothing
 * here is computed from `getComputedStyle`.
 */
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.PROBE_BASE ?? "http://127.0.0.1:3971";
const OUT = process.env.PROBE_OUT ?? "docs/design/proofs/prove";
mkdirSync(OUT, { recursive: true });

const STATES = ["success", "warning", "error", "info"];
const SURFACES = [
  "--nf-canvas",
  "--nf-surface-1",
  "--nf-surface-2",
  "--nf-container",
];

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
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--disable-lcd-text"],
});

const out = {};
for (const theme of ["light", "dark"]) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: theme,
  });
  await page.addInitScript((t) => {
    try {
      window.localStorage.setItem("nf_theme", t);
    } catch {
      /* the attribute below still lands */
    }
  }, theme);
  const res = await page.goto(`${BASE}/around`, { waitUntil: "networkidle", timeout: 60_000 });
  if ((res?.status() ?? 0) !== 200) throw new Error(`status ${res?.status()}`);
  if (new URL(page.url()).pathname !== "/around") throw new Error("landed elsewhere");
  if (await page.locator("[data-nf-not-found]").count()) throw new Error("not-found body at 200");
  await page.evaluate((t) => {
    if (t === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
  }, theme);
  await page.waitForTimeout(400);

  await page.evaluate(
    ({ states, surfaces }) => {
      const host = document.createElement("div");
      host.id = "nf-state-probe";
      host.style.cssText =
        "position:fixed;inset:0;z-index:99999;padding:12px;overflow:auto;background:var(--nf-canvas)";
      for (const s of surfaces) {
        const band = document.createElement("div");
        band.style.cssText = `background:var(${s});padding:10px;display:flex;gap:8px;flex-wrap:wrap`;
        for (const st of states) {
          /*
           * DRAWN FROM THE TOKENS, NOT FROM A BADGE CLASS, AND THE FIRST RUN OF
           * THIS PROBE FOUND OUT WHY THAT MATTERS.
           *
           * It asked for `.nf-badge--error` and `.nf-badge--info`, and neither
           * exists: the stylesheet defines only `--success`, `--warning`,
           * `--brand`, `--neutral`, `--example` and the four status classes.
           * Both unstyled badges then drew default ink on the default surface
           * and read 17.76:1, which is a fine number about nothing. The claim
           * under test is about the four STATE TOKENS, so the swatch composes
           * them the way the product does: the colour as ink on its own 15 per
           * cent tint, over each surface the tint can land on.
           */
          const b = document.createElement("span");
          b.className = "nf-badge";
          b.style.background = `var(--nf-state-${st}-surface)`;
          b.style.color = `var(--nf-state-${st})`;
          b.dataset.probe = `${st}|${s}`;
          b.textContent = st.toUpperCase();
          band.appendChild(b);
        }
        host.appendChild(band);
      }
      document.body.appendChild(host);
    },
    { states: STATES, surfaces: SURFACES },
  );
  await page.waitForTimeout(500);
  const shotPath = join(OUT, `state-colours-390-${theme}.png`);
  await page.screenshot({ path: shotPath });

  for (const st of STATES) {
    for (const sf of SURFACES) {
      const loc = page.locator(`[data-probe="${st}|${sf}"]`);
      const buf = await loc.screenshot();
      const read = await page.evaluate(async (src) => {
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
          all: [...m.entries()].sort((a, b) => b[1] - a[1]),
        };
      }, buf.toString("base64"));
      const surface = read.all[0][0].split(",").map(Number);
      let ink = surface;
      let best = 0;
      for (const [k, n] of read.all) {
        const v = k.split(",").map(Number);
        const gap = Math.abs(lum(v) - lum(surface));
        if (gap > best && n > read.px * 0.005) {
          best = gap;
          ink = v;
        }
      }
      out[`${theme} ${st} on ${sf}`] = {
        ink,
        tint: surface,
        ratio: ratio(ink, surface),
        clears: ratio(ink, surface) >= 4.5,
      };
    }
  }
  await page.close();
}
await browser.close();
writeFileSync(join(OUT, "state-colours.json"), JSON.stringify(out, null, 2) + "\n");
const rows = Object.entries(out);
for (const [k, v] of rows) {
  console.log(
    `${k.padEnd(34)} ink rgb(${v.ink}) on tint rgb(${v.tint}) = ${v.ratio.toFixed(2)}:1  ${v.clears ? "clears 4.5" : "BELOW 4.5"}`,
  );
}
console.log(`\n${rows.filter(([, v]) => v.clears).length} of ${rows.length} clear the 4.5:1 floor, read off the pixels.`);
