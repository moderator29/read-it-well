/*
 * The review desks' proof shots, re-runnable (lead ruling R-G).
 *
 * Serve a production build with the preview harness open, then run from the
 * repo root:
 *   (cd apps/web && npx next build && VALLO_PREVIEW_HARNESS=1 npx next start -p 3176)
 *   node scripts/design/session-b-shots/admin-review-shots.mjs [--base http://127.0.0.1:3176]
 *
 * It shoots every desk of `/preview/session-b/admin-review/<desk>` (fixture
 * props, no database) at 1440 and 390, dark only, the empty and failure
 * states, then builds the render-beside-built side-by-sides into
 * `docs/design/proofs/session-b/admin-review/`.
 *
 * MAP TILES ARE A STAND-IN. The sandbox's egress proxy refuses the tile hosts,
 * so any request to them is answered with `admin-review-standin-tile.png`, a
 * plain navy grid. The pin, its position and the credit line are the page's
 * own; street detail on a live page comes from the provider. Pass
 * `--real-tiles` on a machine that can reach the provider.
 */
import { chromium } from "playwright-core";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../../..");
const OUT = join(REPO, "docs/design/proofs/session-b/admin-review");
const TILE = join(HERE, "admin-review-standin-tile.png");
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const BASE = arg("base", "http://127.0.0.1:3176");
const REAL_TILES = process.argv.includes("--real-tiles");
const H = "/preview/session-b/admin-review";

const jobs = [];
for (const desk of ["listings", "review", "moderation", "kyc"]) {
  /* Dark only: light mode was removed by the founder on 23 September. */
  for (const theme of ["dark"]) {
    jobs.push({ name: `${desk}-1440-${theme}`, url: `${H}/${desk}`, w: 1440, h: 900, theme, full: true });
    jobs.push({ name: `${desk}-390-${theme}`, url: `${H}/${desk}`, w: 390, h: 844, theme, dpr: 2, full: false });
  }
}
jobs.push(
  { name: "listings-empty-1440-dark", url: `${H}/listings?empty=1`, w: 1440, h: 900, theme: "dark", full: true },
  { name: "moderation-empty-1440-dark", url: `${H}/moderation?empty=1`, w: 1440, h: 900, theme: "dark", full: true },
  { name: "kyc-empty-1440-dark", url: `${H}/kyc?empty=1`, w: 1440, h: 900, theme: "dark", full: true },
  { name: "review-failure-states-1440-dark", url: `${H}/review?fail=1`, w: 1440, h: 900, theme: "dark", full: true },
  { name: "listings-1536-dark", url: `${H}/listings`, w: 1536, h: 1024, theme: "dark", full: false },
);

const only = arg("only", null);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
});
for (const job of jobs) {
  if (only && !only.split(",").some((prefix) => job.name.startsWith(prefix))) continue;
  const page = await browser.newPage({
    viewport: { width: job.w, height: job.h },
    deviceScaleFactor: job.dpr ?? 1,
    colorScheme: job.theme,
  });
  if (!REAL_TILES) {
    await page.route(/basemaps\.cartocdn\.com|api\.maptiler\.com/, (route) =>
      route.fulfill({ path: TILE, contentType: "image/png" }),
    );
  }
  await page.addInitScript((t) => {
    try {
      localStorage.setItem("nf_theme", t);
    } catch {}
  }, job.theme);
  const response = await page.goto(BASE + job.url, { waitUntil: "networkidle", timeout: 90_000 });
  if (!response || response.status() !== 200) throw new Error(`${job.url} answered ${response?.status()}`);
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, `${job.name}.jpg`), type: "jpeg", quality: 80, fullPage: job.full, timeout: 180_000 });
  console.log(job.name, response.status());
  await page.close();
}
await browser.close();

/* Render (left) beside built (right). Panel boxes in image px, measured once. */
const renders = {
  listings: ["C1D98B3C-D7B7-4B2D-9182-79E0F89ED287.png", 18, 68, 497, 830, 1100],
  review: ["C1D98B3C-D7B7-4B2D-9182-79E0F89ED287.png", 530, 68, 487, 830, 1400],
  moderation: ["01F7DFC7-65F8-4EAB-B051-421B6AEA1214.png", 12, 93, 497, 797, 1100],
  kyc: ["8E9602E2-0E75-4623-8813-A10D2165CE27.png", 520, 95, 497, 790, 1100],
};
for (const [desk, [file, x, y, w, h, height]] of Object.entries(renders)) {
  if (only && !only.split(",").some((prefix) => desk.startsWith(prefix))) continue;
  const source = join(REPO, file);
  const left = await sharp(source).extract({ left: x, top: y, width: w, height: h }).resize({ height }).toBuffer();
  const right = await sharp(join(OUT, `${desk}-1440-dark.jpg`)).resize({ height }).toBuffer();
  const lm = await sharp(left).metadata();
  const rm = await sharp(right).metadata();
  await sharp({ create: { width: lm.width + rm.width + 24, height, channels: 3, background: { r: 0, g: 6, b: 18 } } })
    .composite([
      { input: left, left: 0, top: 0 },
      { input: right, left: lm.width + 24, top: 0 },
    ])
    .jpeg({ quality: 80 })
    .toFile(join(OUT, `sbs-${desk}.jpg`));
  console.log(`sbs-${desk}`);
}
