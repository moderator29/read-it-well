/**
 * Contact sheets for the light-mode acceptance check (D15, D29, north star 14.7).
 *
 *   node scripts/contact-tiered-assets.mjs <out-dir> [--scale 2]
 *
 * For every sliced asset in `slice-report.json` it renders, per group of sheet:
 *
 *   <group>-paper.png   390 CSS px wide on #F4F4F1, each object on the specified
 *                       ground plate: radius 14, about 4 percent brand fill, and a
 *                       soft blue contact shadow beneath so it never floats on white
 *   <group>-night.png   the same grid on #010118 with no plate, because on night the
 *                       object sits directly on the surface
 *   <group>-loupeN.png  the paper render at 2 columns and 2.5x the size, for edge scrutiny
 *   <group>-nloupeN.png the same on night, where a white fringe from a bad key shows
 *
 * The rule it enforces is the one that made the glass set unusable: NO ASSET IS
 * ACCEPTED UNTIL IT HAS BEEN VIEWED ON PAPER AT 390px AS WELL AS ON NIGHT. An object
 * approved only on navy fails on white.
 *
 * The plate, the shadow and the two grounds are drawn here with literal numbers
 * because this is a review tool that writes pictures into a scratch directory. It is
 * not product CSS, and `check-css-tokens.mjs` does not read `scripts/`. The product
 * values live in the `--nf-*` tokens and in the rule reported alongside this work.
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { OUT_DIR, RAW_DIR, TIERS } from "./tiered-sheet-manifest.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = process.argv[2];
if (!out) throw new Error("usage: node scripts/contact-tiered-assets.mjs <out-dir> [--scale 2]");
const scaleArg = process.argv.indexOf("--scale");
const SCALE = scaleArg > 0 ? Number(process.argv[scaleArg + 1]) : 2;

const PAPER = { r: 0xf4, g: 0xf4, b: 0xf1 };
const NIGHT = { r: 0x01, g: 0x01, b: 0x18 };
const BRAND = { r: 0x2b, g: 0x3f, b: 0xe0 };
const mix = (a, b, t) => ({ r: Math.round(a.r + (b.r - a.r) * t), g: Math.round(a.g + (b.g - a.g) * t), b: Math.round(a.b + (b.b - a.b) * t) });
const hex = (c) => `rgb(${c.r},${c.g},${c.b})`;
const PLATE = mix(PAPER, BRAND, 0.04);

const report = JSON.parse(await readFile(path.join(ROOT, RAW_DIR, "slice-report.json"), "utf8"));
await mkdir(out, { recursive: true });

/** One tile: plate (paper only), contact shadow, object, label. */
async function tile({ item, cell, object, ground, label }) {
  const S = SCALE;
  const W = cell * S;
  const H = (cell + 14) * S;
  const layers = [];
  const px = (v) => Math.round(v * S);
  if (ground === "paper") {
    const plate = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${px(cell)}"><rect width="${W}" height="${px(cell)}" rx="${px(14)}" fill="${hex(PLATE)}"/></svg>`,
    );
    layers.push({ input: plate, left: 0, top: 0 });
    /* The contact shadow: a blue ellipse under the object's foot, blurred. */
    /* The foot of the object, from the slicer's own box, so the shadow touches it. */
    const footFraction = (item.box.top + item.box.h) / (item.edge2x ?? TIERS[item.tier].edge2x);
    /* Its width follows the object's own foot, so a wide building does not grow a blue halo either side. */
    const sw = px((object * (item.box.w / (item.edge2x ?? TIERS[item.tier].edge2x)) * 0.42));
    const sh = px(object * 0.07);
    const shadow = await sharp(
      Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${sw * 2}" height="${sh * 4}"><ellipse cx="${sw}" cy="${sh * 2}" rx="${sw * 0.9}" ry="${sh}" fill="rgb(${BRAND.r},${BRAND.g},${BRAND.b})" fill-opacity="0.22"/></svg>`,
      ),
    )
      .blur(Math.max(1, px(3)))
      .png()
      .toBuffer();
    layers.push({ input: shadow, left: Math.round(W / 2 - sw), top: Math.round(px((cell - object) / 2) + px(object) * footFraction - sh * 2 - px(object) * 0.01) });
  }
  const file = path.join(ROOT, item.root ?? OUT_DIR, `${item.path}@2x.webp`);
  const obj = await sharp(file).resize(px(object), px(object), { kernel: "lanczos3" }).png().toBuffer();
  layers.push({ input: obj, left: Math.round((W - px(object)) / 2), top: Math.round((px(cell) - px(object)) / 2) });
  const text = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${px(14)}"><text x="${W / 2}" y="${px(10)}" font-size="${px(7.5)}" font-family="DejaVu Sans, Arial, sans-serif" text-anchor="middle" fill="${ground === "paper" ? "rgb(70,70,90)" : "rgb(170,170,200)"}">${label}</text></svg>`,
  );
  layers.push({ input: text, left: 0, top: px(cell) });
  return { buffer: await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(layers).png().toBuffer(), W, H };
}

async function sheet({ items, cols, ground, objectSize, cell, name }) {
  const gap = 8;
  const pad = ground === "paper" && cols === 4 ? 15 : 15;
  const tiles = [];
  for (const [i, item] of items.entries()) {
    if (!item.path || !existsSync(path.join(ROOT, item.root ?? OUT_DIR, `${item.path}@2x.webp`))) continue;
    const label = `${String(item.index).padStart(2, "0")} ${item.name}${item.rejected ? " (REJECT)" : ""}`.replace(/&/g, "and");
    tiles.push(await tile({ item, cell, object: objectSize, ground, label }));
    void i;
  }
  const rows = Math.ceil(tiles.length / cols);
  const tileW = cell;
  const tileH = cell + 14;
  const width = 390;
  const innerGap = cols > 1 ? Math.floor((width - 2 * pad - cols * tileW) / (cols - 1)) : 0;
  const S = SCALE;
  const height = pad * 2 + rows * tileH + (rows - 1) * gap;
  const base = ground === "paper" ? PAPER : NIGHT;
  const layers = tiles.map((t, i) => ({
    input: t.buffer,
    left: Math.round((pad + (i % cols) * (tileW + innerGap)) * S),
    top: Math.round((pad + Math.floor(i / cols) * (tileH + gap)) * S),
  }));
  await sharp({ create: { width: width * S, height: height * S, channels: 4, background: { ...base, alpha: 1 } } })
    .composite(layers)
    .png()
    .toFile(path.join(out, name));
}

for (const sh of report.sheets) {
  const slug = sh.group.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  /* 4 columns at 390: 4 x 84 + 3 gaps + 15 gutters. The object is 64, so the plate has 10px of air. */
  const items = sh.objects;
  const chunks = [];
  for (let i = 0; i < items.length; i += 16) chunks.push(items.slice(i, i + 16));
  for (const [k, chunk] of chunks.entries()) {
    const suffix = chunks.length > 1 ? `-${k + 1}` : "";
    await sheet({ items: chunk, cols: 4, ground: "paper", objectSize: 64, cell: 84, name: `${slug}${suffix}-paper.png` });
    await sheet({ items: chunk, cols: 4, ground: "night", objectSize: 64, cell: 84, name: `${slug}${suffix}-night.png` });
    /* The loupe is 8 to a page so it can be read without scaling it down. */
    for (let j = 0; j < chunk.length; j += 8) {
      const page = chunk.slice(j, j + 8);
      await sheet({ items: page, cols: 2, ground: "paper", objectSize: 160, cell: 176, name: `${slug}${suffix}-loupe${j / 8 + 1}.png` });
      await sheet({ items: page, cols: 2, ground: "night", objectSize: 160, cell: 176, name: `${slug}${suffix}-nloupe${j / 8 + 1}.png` });
    }
  }
  console.log(`${slug}: ${items.length} objects, ${chunks.length} page(s)`);
}
await writeFile(path.join(out, "README.txt"), "Contact sheets for the light-mode acceptance check. See scripts/contact-tiered-assets.mjs.\n", "utf8");
