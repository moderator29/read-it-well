/**
 * Build the Open Graph card: the image a Vallo link shows when it is pasted
 * into WhatsApp, X, iMessage or anywhere else that unfurls links.
 *
 * Run from the repository root:
 *
 *   node scripts/build-og-image.mjs
 *
 * WHY A STATIC FILE AND NOT AN `opengraph-image.tsx` ROUTE. Next can render one
 * at request time with ImageResponse, and for a card that never changes that
 * buys nothing and costs a cold render on the first share, a font bundle, and
 * one more thing that can fail in production. The card is brand, not data. A
 * PNG in the app directory is served as-is, cached forever, and cannot break.
 *
 * WHY IT MATTERS THIS MUCH. In a WhatsApp-first market the unfurled card is the
 * first impression for most visitors, before the landing page and before the
 * app. Until 16 September 2026 the product had NO Open Graph image at all:
 * every shared link rendered as a blank grey rectangle.
 *
 * 1200x630 is the one size that every unfurler accepts. The safe area matters
 * more than the canvas: WhatsApp crops toward a square on some surfaces, so
 * everything meaningful sits in the middle 60 per cent horizontally.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const BRAND = path.join(ROOT, "apps/web/public/brand");
const OUT = path.join(ROOT, "apps/web/src/app/opengraph-image.png");

const W = 1200, H = 630;

/* The night canvas, with one bloom low centre so the ground has dimension, the
   way the logo's own tile is lit. Colours are the brand anchors from
   packages/design-tokens/src/tokens.css. */
const ground = Buffer.from(`<svg width="${W}" height="${H}">
  <defs>
    <radialGradient id="bloom" cx="50%" cy="105%" r="85%">
      <stop offset="0%" stop-color="#0C39EF" stop-opacity="0.55"/>
      <stop offset="45%" stop-color="#000F98" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#010118" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="base" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#010118"/>
      <stop offset="100%" stop-color="#000010"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#base)"/>
  <rect width="${W}" height="${H}" fill="url(#bloom)"/>
</svg>`);

/*
 * The slogan is set as text here rather than taken from the wordmark render,
 * because it is a sentence and not a logo. It is the founder's slogan verbatim,
 * exclamation mark included: the card is the one surface that is allowed to be
 * the poster.
 */
const line = Buffer.from(`<svg width="${W}" height="120">
  <text x="${W / 2}" y="48" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
        font-size="40" font-weight="600" fill="#E6ECFF" letter-spacing="0.5">Real Estate reimagined!</text>
  <text x="${W / 2}" y="98" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
        font-size="24" fill="#8FA6D9">Rent, buy or sell across Nigeria. The move-in total, printed.</text>
</svg>`);

const mark = await sharp(path.join(BRAND, "vallo-mark.png"))
  .resize(300, 300, { fit: "inside" })
  .png().toBuffer();
const word = await sharp(path.join(BRAND, "vallo-wordmark.png"))
  .resize(360, 90, { fit: "inside" })
  .png().toBuffer();

const markMeta = await sharp(mark).metadata();
const wordMeta = await sharp(word).metadata();

const info = await sharp(ground)
  .composite([
    { input: mark, left: Math.round(W / 2 - markMeta.width / 2), top: 78 },
    { input: word, left: Math.round(W / 2 - wordMeta.width / 2), top: 372 },
    { input: line, left: 0, top: 478 },
  ])
  .png({ compressionLevel: 9, palette: true, quality: 92 })
  .toFile(OUT);

console.log(`opengraph-image.png ${info.width}x${info.height} ${(info.size / 1024).toFixed(0)}kB`);
