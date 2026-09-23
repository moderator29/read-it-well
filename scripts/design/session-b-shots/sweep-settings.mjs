/**
 * The settings group of the platform sweep: every route and inner state, before
 * and after, from the committed harness and the real signed-out routes.
 *
 *   cd apps/web && npx next build && VALLO_PREVIEW_HARNESS=1 npx next start -p 3188
 *   node scripts/design/session-b-shots/sweep-settings.mjs --phase before [--base http://127.0.0.1:3188] [--only name,name]
 *
 * Dark only (light mode was removed on 23 September). 390x844 at 2x and 1440
 * at 1x, full page, JPEG q80, into docs/design/proofs/session-b/sweep-settings/<phase>/.
 * Run from the repository root.
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const BASE = arg("base", "http://127.0.0.1:3188");
const PHASE = arg("phase", "before");
const ONLY = arg("only", "");
const OUT = `docs/design/proofs/session-b/sweep-settings/${PHASE}`;
const H = "/preview/session-b/sweep-settings?v=";

/** [name, path, status, action] ; action runs before the shot. */
const SHOTS = [
  ["hub", `${H}hub`, 200],
  ["account", `${H}account`, 200],
  ["delete-sheet", `${H}account`, 200, async (p) => {
    await p.getByTestId("delete-open").click();
    await p.getByTestId("delete-drawer").waitFor();
  }],
  ["delete-scheduled", `${H}deleting`, 200],
  ["notification-prefs", `${H}notifications`, 200],
  ["privacy", `${H}privacy`, 200],
  ["payments", `${H}payments`, 200],
  ["help", `${H}help`, 200],
  ["appearance", `${H}appearance`, 200],
  ["devices", `${H}devices`, 200],
  ["place", `${H}place`, 200],
  ["interests", `${H}interests`, 200],
  ["inbox", `${H}inbox`, 200],
  ["inbox-empty", `${H}inbox-empty`, 200],
  ["terms", `${H}terms`, 200],
  ["error", `${H}error`, 200],
  ["loading-settings", `${H}loading-settings`, 200],
  ["loading-payments", `${H}loading-payments`, 200],
  ["loading-place", `${H}loading-place`, 200],
  ["loading-interests", `${H}loading-interests`, 200],
  ["loading-inbox", `${H}loading-inbox`, 200],
  ["drawer", `${H}hub&drawer=1`, 200, async () => {}],
  ["rows-sheet-add", `${H}payments`, 200, async (p) => {
    await p.getByTestId("payments-add").click();
    await p.locator(".nf-rows-sheet").waitFor();
  }],
  ["rows-sheet-card", `${H}payments`, 200, async (p) => {
    await p.getByTestId("payments-card-row").click();
    await p.locator(".nf-rows-sheet").waitFor();
  }],
  ["sheet-rows", `${H}sheet-rows`, 200, async (p) => {
    await p.locator(".nf-rows-sheet").waitFor();
  }],
  ["sheet-bottom", `${H}sheet-bottom`, 200, async (p) => {
    await p.locator('.nf-sheet[data-open="true"]').waitFor();
  }],
  ["offline", "/offline", 200],
  ["not-found", "/preview/session-b/sweep-settings/missing", 404],
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });

async function shoot([name, path, status, action], width) {
  const ctx = await browser.newContext({
    viewport: { width, height: width > 800 ? 900 : 844 },
    deviceScaleFactor: width > 800 ? 1 : 2,
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  const res = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  if (!res || res.status() !== status) throw new Error(`${path} answered ${res?.status()}`);
  await page.waitForTimeout(500);
  if (action) {
    await action(page);
    await page.waitForTimeout(500);
  }
  await page.screenshot({
    path: `${OUT}/${name}-${width}.jpg`,
    fullPage: !action,
    type: "jpeg",
    quality: 80,
  });
  await ctx.close();
}

/*
 * `--sides`: after the after proofs exist, draw each route's before, after and
 * the reference side by side (390, top of page): the console overview proof as
 * the anatomy reference for every route, and for the hub and the inbox their
 * governing render as well.
 */
if (process.argv.includes("--sides")) {
  const { readFileSync, existsSync } = await import("node:fs");
  const D = "docs/design/proofs/session-b/sweep-settings";
  const REF = "docs/design/proofs/session-b/admin/overview-390-dark-fixture.jpg";
  const GOV = {
    hub: ["docs/design/references/7F96BE6C-BF8C-4413-BD58-25531B27D549.png", 183, 60, 658, 1300],
    inbox: ["docs/design/references/roles/GOVERNING-12-review-desk-notification-search-by-id.png", 795, 90, 342, 790],
  };
  const img = (f) => `data:image/${f.endsWith(".png") ? "png" : "jpeg"};base64,${readFileSync(f).toString("base64")}`;
  let made = 0;
  for (const [name] of SHOTS) {
    const before = `${D}/before/${name}-390.jpg`;
    const after = `${D}/after/${name}-390.jpg`;
    if (!existsSync(after)) continue;
    const page = await browser.newPage({ viewport: { width: 1640, height: 900 } });
    const gov = GOV[name];
    const col = (label, src) => `<div><div style="margin-bottom:8px">${label}</div><div style="width:390px;height:844px;overflow:hidden;background:#000"><img src="${src}" style="width:390px"></div></div>`;
    const govCol = gov
      ? `<div><div style="margin-bottom:8px">Governing render (crop)</div><canvas id="g" width="390" height="844"></canvas></div>`
      : "";
    await page.setContent(`<html><body style="margin:0;background:#0b0f1a;font:600 16px sans-serif;color:#fff"><div style="display:flex;gap:16px;padding:16px">
${existsSync(before) ? col("Before (" + name + ")", img(before)) : col("Before: not shot (state added in the audit passes)", "")}
${col("After, 390 dark", img(after))}
${col("Reference anatomy: console overview", img(REF))}
${govCol}</div>
<script>${gov ? `const im=new Image();im.onload=()=>{const c=document.getElementById('g');const s=390/${gov[3]};c.getContext('2d').drawImage(im,${gov[1]},${gov[2]},${gov[3]},${gov[4]},0,0,390,${gov[4]}*s);document.title='ok'};im.src="${img(gov[0])}";` : "document.title='ok'"}</script></body></html>`);
    await page.waitForFunction(() => document.title === "ok");
    await page.screenshot({ path: `${D}/side-by-side-${name}.jpg`, type: "jpeg", quality: 78, fullPage: true });
    await page.close();
    made += 1;
  }
  await browser.close();
  console.log(`${made} side-by-sides in ${D}`);
  process.exit(0);
}

let n = 0;
for (const shot of SHOTS) {
  if (ONLY && !ONLY.split(",").includes(shot[0])) continue;
  for (const width of [390, 1440]) {
    await shoot(shot, width);
    n += 1;
  }
}
await browser.close();
console.log(`${n} shots in ${OUT}`);
