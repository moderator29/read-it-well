/**
 * The contact sheet: every social image, in posting order, on one page.
 *
 *   node scripts/marketing/social/overview.mjs [folder] [out.jpg]
 *
 * Default: docs/marketing/social/*.png -> docs/marketing/social/overview.jpg.
 * Each image keeps its own shape inside a row of equal height; the three
 * carousel panels sit edge to edge so their seams can be checked at a glance.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { OUT } from "./lib/paths.mjs";

const dir = process.argv[2] || OUT;
const out = process.argv[3] || join(OUT, "overview.jpg");
const files = readdirSync(dir).filter((f) => f.endsWith(".png")).sort((a, b) => {
  const k = (f) => (f.startsWith("x-") ? "99" : f);
  return k(a).localeCompare(k(b));
});

const ROW_H = 420;
const GAP = 24;
const PAD = 48;
const MAX_W = 3300;
const LABEL = 34;
const BG = "#3A3F4B";

const items = [];
for (const f of files) {
  const m = await sharp(join(dir, f)).metadata();
  const w = Math.round((m.width / m.height) * ROW_H);
  items.push({ f, w, h: ROW_H, seam: /^1[5-7]-carousel/.test(f) });
}

/* pack into rows; carousel panels are kept together with no gap between them */
const rows = [];
let row = [];
let rw = 0;
for (let i = 0; i < items.length; i += 1) {
  const it = items[i];
  const gap = row.length && !(it.seam && row[row.length - 1].seam) ? GAP : 0;
  const groupW = it.seam && !(row.length && row[row.length - 1].seam) ? items.slice(i, i + 3).reduce((s, x) => s + x.w, 0) : it.w;
  if (row.length && rw + gap + groupW > MAX_W - PAD * 2) {
    rows.push(row);
    row = [];
    rw = 0;
  }
  const g = row.length && !(it.seam && row[row.length - 1].seam) ? GAP : 0;
  it.x = rw + g;
  rw = it.x + it.w;
  row.push(it);
}
if (row.length) rows.push(row);

const width = MAX_W;
const height = PAD * 2 + rows.length * (ROW_H + LABEL + GAP) - GAP;
const composite = [];
rows.forEach((r, ri) => {
  const used = r[r.length - 1].x + r[r.length - 1].w;
  const off = Math.round((width - used) / 2);
  const y = PAD + ri * (ROW_H + LABEL + GAP);
  for (const it of r) {
    composite.push({ file: join(dir, it.f), left: off + it.x, top: y, w: it.w, h: it.h, label: it.f.replace(/\.png$/, "") });
  }
});

const layers = [];
for (const c of composite) {
  layers.push({ input: await sharp(c.file).resize(c.w, c.h, { kernel: "lanczos3" }).toBuffer(), left: c.left, top: c.top });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${c.w}" height="${LABEL}"><text x="0" y="24" font-family="Inter, DejaVu Sans, sans-serif" font-size="17" fill="#AEB8D8">${c.label}</text></svg>`;
  layers.push({ input: Buffer.from(svg), left: c.left, top: c.top + c.h + 4 });
}
await sharp({ create: { width, height, channels: 3, background: BG } }).composite(layers).jpeg({ quality: 86, mozjpeg: true }).toFile(out);
console.log(`overview: ${composite.length} images, ${width}x${height} -> ${out}`);
