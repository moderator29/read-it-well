/**
 * Overview sheets of the finished store images.
 *
 *   node scripts/marketing/store/overview.mjs [--dir DIR] [--out DIR] [--height 560] [--grid]
 *
 * Writes docs/store/screenshots/<store>-overview.jpg: all 35 side by side in
 * store order, with rounded corners and the gap the store leaves between
 * screenshots, on the store's white page, so the set can be read as the
 * strip it is. --grid also writes <store>-overview-grid.jpg, seven to a row
 * with the file names, for review.
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
const TH = Number(arg("--height", "560"));
const GRID = args.includes("--grid");

async function thumb(file, w, h, radius) {
  const img = await sharp(file).resize(w, h, { kernel: "lanczos3" }).toBuffer();
  const mask = Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${radius}" ry="${radius}"/></svg>`);
  return sharp(img).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}

for (const store of Object.keys(STORES)) {
  const dir = join(DIR, store);
  if (!existsSync(dir)) continue;
  const files = readdirSync(dir).filter((f) => /^\d\d-.*\.(png|jpe?g)$/.test(f)).sort();
  if (!files.length) continue;
  const { W, H } = STORES[store];

  /* The strip. */
  const th = TH;
  const tw = Math.round((th * W) / H);
  const gap = Math.round(th * 0.03);
  const pad = Math.round(th * 0.08);
  const radius = Math.round(tw * 0.075);
  const comps = [];
  for (let i = 0; i < files.length; i += 1) {
    comps.push({ input: await thumb(join(dir, files[i]), tw, th, radius), left: pad + i * (tw + gap), top: pad });
  }
  const stripW = pad * 2 + files.length * tw + (files.length - 1) * gap;
  const out = join(DEST, `${store}-overview.jpg`);
  await sharp({ create: { width: stripW, height: th + pad * 2, channels: 3, background: "#FFFFFF" } })
    .composite(comps)
    .jpeg({ quality: 90, chromaSubsampling: "4:4:4" })
    .toFile(out);
  console.log(`${out}  ${files.length} images, ${stripW} x ${th + pad * 2}`);

  if (!GRID) continue;
  /* The review grid: seven to a row, named. */
  const COLS = 7;
  const gw = 300;
  const gh = Math.round((gw * H) / W);
  const LABEL = 44;
  const G = 24;
  const rows = Math.ceil(files.length / COLS);
  const g = [];
  for (let i = 0; i < files.length; i += 1) {
    const x = G + (i % COLS) * (gw + G);
    const y = G + Math.floor(i / COLS) * (gh + LABEL + G);
    g.push({ input: await thumb(join(dir, files[i]), gw, gh, Math.round(gw * 0.06)), left: x, top: y });
    g.push({ input: Buffer.from(`<svg width="${gw}" height="${LABEL}"><text x="4" y="30" font-family="DejaVu Sans, sans-serif" font-size="20" fill="#C9CEDD">${files[i].replace(/\.(png|jpe?g)$/, "")}</text></svg>`), left: x, top: y + gh + 4 });
  }
  const gout = join(DEST, `${store}-overview-grid.jpg`);
  await sharp({ create: { width: COLS * gw + (COLS + 1) * G, height: rows * (gh + LABEL) + (rows + 1) * G, channels: 3, background: "#15171F" } })
    .composite(g)
    .jpeg({ quality: 88, chromaSubsampling: "4:4:4" })
    .toFile(gout);
  console.log(`${gout}`);
}
