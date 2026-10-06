/**
 * A contact sheet of every named part (lib/parts.mjs), to check each crop.
 *   node scripts/marketing/social/parts-sheet.mjs [out.png]
 */
import { join } from "node:path";
import sharp from "sharp";
import { CACHE, SOURCE } from "./lib/paths.mjs";
import { PARTS } from "./lib/parts.mjs";

const out = process.argv[2] || join(CACHE, "parts-sheet.png");
const TW = 420;
const cols = 4;
const tiles = [];
for (const [name, p] of Object.entries(PARTS)) {
  const buf = await sharp(join(SOURCE, `${p.id}.webp`)).extract({ left: p.x, top: p.y, width: p.w, height: p.h }).resize(TW - 20).png().toBuffer();
  const m = await sharp(buf).metadata();
  const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="26"><text x="10" y="18" font-family="DejaVu Sans" font-size="14" fill="#ff0">${name}</text></svg>`);
  tiles.push({ buf, h: m.height, label });
}
const rows = [];
for (let i = 0; i < tiles.length; i += cols) rows.push(tiles.slice(i, i + cols));
const heights = rows.map((r) => Math.max(...r.map((t) => t.h)) + 40);
const H = heights.reduce((a, b) => a + b, 0);
const comp = [];
let y = 0;
rows.forEach((r, ri) => {
  r.forEach((t, ci) => {
    comp.push({ input: t.label, left: ci * TW, top: y });
    comp.push({ input: t.buf, left: ci * TW + 10, top: y + 28 });
  });
  y += heights[ri];
});
await sharp({ create: { width: cols * TW, height: H, channels: 3, background: "#555" } }).composite(comp).png().toFile(out);
console.log(out);
