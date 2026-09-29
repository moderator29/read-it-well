/**
 * Composes the store images from the captured screens.
 *
 *   node scripts/store-screenshots/compose.mjs [--only 16,22,25] [--device iphone-6.9]
 *
 * For every shot whose screens exist in docs/store/screenshots/source/, and
 * for every committed target in targets.mjs (`--device iphone-6.5` for the
 * other), it renders templates.mjs in Chromium at twice the target's size,
 * brings it down to the exact pixel size with a Lanczos filter, and writes an
 * RGB PNG with no alpha channel (Apple refuses screenshots that carry one;
 * Play asks for 24-bit PNG):
 *
 *   docs/store/screenshots/<store>/<device>/<dark|light>/<NN>-<slug>.png
 *
 * plus Play's 1024 x 500 feature graphic from the closing brand card. A shot
 * missing any of its screens is skipped and named, never drawn with a stand
 * in: every phone in these images shows the live product.
 */
import { chromium } from "playwright-core";
import sharp from "sharp";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SHOTS, shotName, sourceName } from "./shots.mjs";
import { TARGETS, FEATURE_GRAPHIC } from "./targets.mjs";
import { renderShot, renderBrand } from "./templates.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const SOURCE = join(REPO, "docs", "store", "screenshots", "source");
const OUT = join(REPO, "docs", "store", "screenshots");
const BRAND = join(REPO, "apps", "web", "public", "brand");
const FONTS = join(REPO, "apps", "web", "public", "fonts");
const FRAMES = join(HERE, "frames");

const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const ONLY = arg("--only")?.split(",").map(Number);
const DEVICE = arg("--device");
/* --proof DIR renders into DIR instead of the store folders: for design
   review, never for upload. */
const PROOF = arg("--proof");

/* Apple's official bezels, when they have been placed in frames/ with the
   measurement JSON beside them (frames/README.md). */
function loadBezel(name) {
  const json = join(FRAMES, `${name}.json`);
  if (!existsSync(json)) return null;
  const meta = JSON.parse(readFileSync(json, "utf8"));
  return { ...meta, file: join(FRAMES, meta.file) };
}
const bezels = { dynamicIsland: loadBezel("apple-dynamic-island"), standard: loadBezel("apple-standard") };

const CHROMIUM = [process.env.CHROMIUM_PATH, "/opt/pw-browsers/chromium"].find((p) => p && existsSync(p));
const browser = await chromium.launch(CHROMIUM ? { executablePath: CHROMIUM } : {});
const tmp = join(OUT, ".compose-tmp");
mkdirSync(tmp, { recursive: true });

async function render(html, width, height, file) {
  /* Drawn at twice the size and brought down with a Lanczos filter: the
     screens stay sharp where the browser would otherwise shrink them in one
     bilinear step, and every edge is supersampled. */
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  const htmlFile = join(tmp, "page.html");
  writeFileSync(htmlFile, html);
  await page.goto(`file://${htmlFile}`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  const png = await page.screenshot({ type: "png" });
  await page.close();
  mkdirSync(dirname(file), { recursive: true });
  await sharp(png)
    .resize(width, height, { kernel: "lanczos3" })
    .flatten({ background: "#010118" })
    .removeAlpha()
    .toColourspace("srgb")
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(file);
  const meta = await sharp(file).metadata();
  if (meta.width !== width || meta.height !== height || meta.hasAlpha) {
    throw new Error(`${file}: ${meta.width}x${meta.height} alpha=${meta.hasAlpha}, expected ${width}x${height} and no alpha`);
  }
}

const made = [];
const skipped = [];
for (const shot of SHOTS) {
  if (ONLY && !ONLY.includes(shot.n)) continue;
  const captures = shot.screens.map((_, k) => join(SOURCE, sourceName(shot, k + 1)));
  const missing = captures.filter((c) => !existsSync(c));
  if (missing.length) {
    skipped.push({ n: shot.n, missing: missing.map((m) => m.replace(`${REPO}/`, "")) });
    continue;
  }
  for (const target of TARGETS) {
    if (DEVICE ? target.device !== DEVICE : target.committed === false) continue;
    const html =
      shot.layout === "brand"
        ? renderBrand({ shot, target, brandDir: BRAND, fontsDir: FONTS })
        : renderShot({ shot, target, captures, bezels, brandDir: BRAND, fontsDir: FONTS });
    const file = PROOF
      ? join(PROOF, `${target.device}-${shotName(shot)}.png`)
      : join(OUT, target.store, target.device, shot.mode, `${shotName(shot)}.png`);
    await render(html, target.width, target.height, file);
    made.push(file.replace(`${REPO}/`, ""));
  }
  if (shot.layout === "brand" && (!DEVICE || DEVICE === FEATURE_GRAPHIC.device)) {
    const file = PROOF
      ? join(PROOF, "feature-graphic.png")
      : join(OUT, FEATURE_GRAPHIC.store, FEATURE_GRAPHIC.device, "feature-graphic.png");
    await render(renderBrand({ shot, target: FEATURE_GRAPHIC, brandDir: BRAND, fontsDir: FONTS }), FEATURE_GRAPHIC.width, FEATURE_GRAPHIC.height, file);
    made.push(file.replace(`${REPO}/`, ""));
  }
}
await browser.close();
rmSync(tmp, { recursive: true, force: true });

console.log(`made ${made.length}:`);
for (const m of made) console.log(`  ${m}`);
if (skipped.length) {
  console.log(`\nskipped ${skipped.length} (screens not captured yet):`);
  for (const s of skipped) console.log(`  ${String(s.n).padStart(2)}  ${s.missing.join(", ")}`);
}
console.log(`\nApple bezels: dynamic island ${bezels.dynamicIsland ? "official" : "not present, neutral frame used"}, standard ${bezels.standard ? "official" : "not present, neutral frame used"}`);
