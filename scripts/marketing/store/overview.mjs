/**
 * Contact sheets of the finished store images, in store order, seven to a
 * row with a gap between them the way the stores show them.
 *
 *   node scripts/marketing/store/overview.mjs [--dir DIR] [--out DIR] [--thumb 300]
 *
 * Writes docs/store/screenshots/app-store-overview.jpg and
 * google-play-overview.jpg (or the same names in --out).
 */
import sharp from "sharp";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { OUT, STORES } from "./lib.mjs";

const args = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
};
const DIR = arg("--dir", OUT);
const DEST = arg("--out", OUT);
const THUMB = Number(arg("--thumb", "300"));
const COLS = 7;
const GAP = 24;
const LABEL = 44;

for (const store of Object.keys(STORES)) {
  const dir = join(DIR, store);
  if (!existsSync(dir)) continue;
  const files = readdirSync(dir).filter((f) => /^\d\d-.*\.(png|jpe?g)$/.test(f)).sort();
  if (!files.length) continue;
  const { W, H } = STORES[store];
  const tw = THUMB;
  const th = Math.round((THUMB * H) / W);
  const rows = Math.ceil(files.length / COLS);
  const sheetW = COLS * tw + (COLS + 1) * GAP;
  const sheetH = rows * (th + LABEL) + (rows + 1) * GAP;
  const comps = [];
  for (let i = 0; i < files.length; i += 1) {
    const x = GAP + (i % COLS) * (tw + GAP);
    const y = GAP + Math.floor(i / COLS) * (th + LABEL + GAP);
    const thumb = await sharp(join(dir, files[i])).resize(tw, th, { kernel: "lanczos3" }).toBuffer();
    const rounded = Buffer.from(`<svg width="${tw}" height="${th}"><rect width="${tw}" height="${th}" rx="${tw * 0.06}" ry="${tw * 0.06}"/></svg>`);
    comps.push({ input: await sharp(thumb).composite([{ input: rounded, blend: "dest-in" }]).png().toBuffer(), left: x, top: y });
    const label = Buffer.from(`<svg width="${tw}" height="${LABEL}"><text x="4" y="30" font-family="DejaVu Sans, sans-serif" font-size="20" fill="#C9CEDD">${files[i].replace(/\.(png|jpe?g)$/, "")}</text></svg>`);
    comps.push({ input: label, left: x, top: y + th + 4 });
  }
  const out = join(DEST, `${store}-overview.jpg`);
  await sharp({ create: { width: sheetW, height: sheetH, channels: 3, background: "#15171F" } })
    .composite(comps)
    .jpeg({ quality: 88, chromaSubsampling: "4:4:4" })
    .toFile(out);
  console.log(`${out}  ${files.length} images`);
}
