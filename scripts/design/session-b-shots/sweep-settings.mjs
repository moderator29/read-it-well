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
