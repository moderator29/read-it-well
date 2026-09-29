/**
 * One contact sheet of the finished App Store set, for review at a glance:
 *
 *   node scripts/store-screenshots/overview.mjs
 *
 * Writes docs/store/screenshots/overview.jpg, every 6.9" image in shot order,
 * five to a row. It is for people, not for either store.
 */
import sharp from "sharp";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SHOTS, shotName } from "./shots.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "docs", "store", "screenshots");
const W = 330;
const H = Math.round((W * 2868) / 1320);
const GAP = 24;
const COLS = 5;

const tiles = [...SHOTS].sort((a, b) => a.n - b.n).map((shot) => join(ROOT, "app-store", "iphone-6.9", shot.mode, `${shotName(shot)}.png`)).filter(existsSync);
const rows = Math.ceil(tiles.length / COLS);
const composite = await Promise.all(
  tiles.map(async (file, i) => ({
    input: await sharp(file).resize(W, H).toBuffer(),
    left: GAP + (i % COLS) * (W + GAP),
    top: GAP + Math.floor(i / COLS) * (H + GAP),
  })),
);
await sharp({
  create: { width: GAP + COLS * (W + GAP), height: GAP + rows * (H + GAP), channels: 3, background: "#0B0D14" },
})
  .composite(composite)
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(join(ROOT, "overview.jpg"));
console.log(`overview.jpg: ${tiles.length} images`);
