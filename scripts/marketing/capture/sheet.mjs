/* A labelled contact sheet of captures: node capture/sheet.mjs <dir> <out.png> [m|d] [tile width] [columns] */
import sharp from "sharp";
import { readdirSync } from "node:fs";
const [dir, out, filter = "", w = "180", cols = "10"] = process.argv.slice(2);
const W = Number(w), C = Number(cols);
const files = readdirSync(dir).filter((f) => f.endsWith(".webp") && !f.includes("-full") && (filter === "d" ? f.startsWith("d-") : !f.startsWith("d-"))).sort();
const tiles = [];
for (const f of files) {
  const img = sharp(`${dir}/${f}`).resize({ width: W });
  const buf = await img.png().toBuffer();
  const meta = await sharp(buf).metadata();
  const label = Buffer.from(`<svg width="${W}" height="22"><rect width="${W}" height="22" fill="#000"/><text x="4" y="16" font-family="sans-serif" font-size="13" fill="#ff0">${f.replace(".webp", "")}</text></svg>`);
  tiles.push({ buf: await sharp(buf).extend({ bottom: 22, background: "#000" }).composite([{ input: label, left: 0, top: meta.height }]).png().toBuffer(), h: meta.height + 22 });
}
const H = Math.max(...tiles.map((t) => t.h));
const rows = Math.ceil(tiles.length / C);
await sharp({ create: { width: C * (W + 4), height: rows * (H + 4), channels: 3, background: "#333" } })
  .composite(tiles.map((t, k) => ({ input: t.buf, left: (k % C) * (W + 4), top: Math.floor(k / C) * (H + 4) })))
  .png().toFile(out);
console.log(out, files.length);
