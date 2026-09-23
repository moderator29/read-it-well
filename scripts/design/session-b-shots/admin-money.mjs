/**
 * Admin money desks: every proof and side-by-side, from the committed harness.
 *
 *   cd apps/web && npx next build && VALLO_PREVIEW_HARNESS=1 npx next start -p 3177
 *   node scripts/design/session-b-shots/admin-money.mjs [--base http://127.0.0.1:3177]
 *
 * Shoots /preview/session-b/admin-money/{money,escrow,supply,bookings,payments}
 * in both fixture states (`full`, `live`) at 1440 and 390, dark and light, full
 * page, into docs/design/proofs/session-b/admin-money/, then draws each governing
 * render panel beside the built 1440 dark page. Run from the repository root.
 */
import { chromium } from "playwright-core";
import { readFileSync, mkdirSync } from "node:fs";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const BASE = arg("base", "http://127.0.0.1:3177");
const OUT = "docs/design/proofs/session-b/admin-money";
const DESKS = ["money", "escrow", "supply", "bookings", "payments"];
const C = "C1D98B3C-D7B7-4B2D-9182-79E0F89ED287.png";
const E = "8E9602E2-0E75-4623-8813-A10D2165CE27.png";
/** [out name, render, crop x, y, w, h, built shot, caption] */
const SIDES = [
  ["side-by-side-money.jpg", C, 1033, 70, 486, 826, "money-full-1440-dark.jpg", "C1D98B3C panel 3"],
  ["side-by-side-escrow.jpg", E, 12, 95, 494, 790, "escrow-full-1440-dark.jpg", "8E9602E2 panel 1"],
  ["side-by-side-supply.jpg", E, 1030, 95, 493, 790, "supply-full-1440-dark.jpg", "8E9602E2 panel 3"],
  ["side-by-side-bookings-vs-register.jpg", C, 1033, 70, 486, 826, "bookings-full-1440-dark.jpg", "register: C1D98B3C panel 3"],
  ["side-by-side-payments-vs-register.jpg", C, 1033, 70, 486, 826, "payments-full-1440-dark.jpg", "register: C1D98B3C panel 3"],
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });

async function shoot(url, out, width, theme) {
  const ctx = await browser.newContext({
    viewport: { width, height: width > 800 ? 900 : 844 },
    deviceScaleFactor: width > 800 ? 1 : 2,
    colorScheme: theme,
  });
  await ctx.addInitScript((t) => {
    try {
      localStorage.setItem("nf-theme", t);
      localStorage.setItem("theme", t);
    } catch {}
    document.documentElement.setAttribute("data-theme", t);
  }, theme);
  const page = await ctx.newPage();
  const res = await page.goto(url, { waitUntil: "networkidle" });
  if (!res || res.status() !== 200) throw new Error(`${url} answered ${res?.status()}`);
  await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
  await page.waitForTimeout(400);
  await page.screenshot({ path: out, fullPage: true, type: "jpeg", quality: 80 });
  await ctx.close();
}

let shots = 0;
for (const desk of DESKS) {
  for (const state of ["full", "live"]) {
    for (const width of [1440, 390]) {
      for (const theme of ["dark", "light"]) {
        await shoot(`${BASE}/preview/session-b/admin-money/${desk}?state=${state}`, `${OUT}/${desk}-${state}-${width}-${theme}.jpg`, width, theme);
        shots += 1;
      }
    }
  }
}

for (const [name, render, x, y, w, h, built, caption] of SIDES) {
  const page = await browser.newPage({ viewport: { width: 2000, height: 1200 } });
  const r = `data:image/png;base64,${readFileSync(render).toString("base64")}`;
  const bi = `data:image/jpeg;base64,${readFileSync(`${OUT}/${built}`).toString("base64")}`;
  await page.setContent(`<html><body style="margin:0;background:#0b0f1a;font:600 20px sans-serif;color:#fff">
<div style="display:flex;gap:24px;padding:24px;align-items:flex-start">
<div><div style="margin-bottom:8px">Render (${caption})</div><canvas id="c"></canvas></div>
<div><div style="margin-bottom:8px">Built, 1440 dark, full page (fixture-backed harness)</div><img src="${bi}" style="width:960px"></div></div>
<script>const im=new Image();im.onload=()=>{const c=document.getElementById('c');const s=960/${w};c.width=960;c.height=${h}*s;c.getContext('2d').drawImage(im,${x},${y},${w},${h},0,0,960,${h}*s);document.title='ok'};im.src="${r}";</script></body></html>`);
  await page.waitForFunction(() => document.title === "ok");
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/${name}`, fullPage: true, type: "jpeg", quality: 78 });
  await page.close();
}

await browser.close();
console.log(`${shots} proofs and ${SIDES.length} side-by-sides written to ${OUT}`);
