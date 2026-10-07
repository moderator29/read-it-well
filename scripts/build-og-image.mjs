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
 * THE COMPOSITION, from the governing landing hero and the sign-in render: the
 * dusk villa plate as the ground, tinted to the brand navy so the photograph
 * is atmosphere rather than subject; the lockup centred, mark above wordmark,
 * the way the sign-in screen stacks it, on a dark halo so it reads over the
 * house; the slogan beneath as live text in the card, never baked into the
 * wordmark. Everything meaningful sits in the
 * middle 60 per cent horizontally, because WhatsApp crops toward a square on
 * some surfaces and 1200x630 is the one size every unfurler accepts.
 *
 * THE BUDGET. Under 300KB, because the card is fetched by every unfurler on
 * every share and a photograph at 1200x630 is easily twice that as a PNG. The
 * navy tint and the calm vignette are what make the budget possible: they
 * take the colour count down to where an 8-bit palette holds the plate
 * without banding across the sky.
 */

import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ImageResponse } from "next/og.js";
import sharp from "sharp";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const BRAND = path.join(ROOT, "apps/web/public/brand");
const PLATE = path.join(BRAND, "photos/villa-pool-skyline-02.jpg");
const OUT = path.join(ROOT, "apps/web/src/app/opengraph-image.jpg");

const W = 1200, H = 630;
/* OPS-16: a JPEG. The palette PNG this used to write was 294KB, a hair under
   the roughly 300KB some unfurlers drop previews above; a photograph ground is
   what JPEG is for. W3 (round 5): under 100KB, the budget every share card now
   keeps (`apps/web/src/lib/share/og-encode.ts`); it was 117KB. */
const BUDGET = 95 * 1024;

/* The brand anchors from packages/design-tokens/src/tokens.css. Hex is
   correct here for the same reason it is correct in an email: this is a
   bitmap, and there is no stylesheet for a token to live in. */
const INK_950 = "#010118";
const ELECTRIC_400 = "#0C39EF";
const ELECTRIC_700 = "#000F98";
const TEXT = "#FFFFFF";
const BODY = "#C6CDF2";

/* The plate, cropped to the card's ratio from its left 1400px so the villa
   sits to the right of the stack, the way the landing hero puts the headline
   on the water and the house beside it, then covered to the canvas. */
const plate = await sharp(PLATE)
  .extract({ left: 0, top: 150, width: 1400, height: 735 })
  .resize(W, H, { fit: "cover", position: "centre" })
  .modulate({ saturation: 0.72 })
  .png()
  .toBuffer();

/*
 * The tint: the brand navy laid over the photograph, heavier at the top and
 * the foot so the lockup sits on a calm ground, and a blue bloom low centre
 * the way the logo's own tile is lit. This is the calm-left-third rule from
 * the landing brief turned into a calm centre, because the card is centred.
 */
const tint = Buffer.from(`<svg width="${W}" height="${H}">
  <defs>
    <linearGradient id="veil" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${INK_950}" stop-opacity="0.80"/>
      <stop offset="45%" stop-color="${INK_950}" stop-opacity="0.62"/>
      <stop offset="100%" stop-color="${INK_950}" stop-opacity="0.92"/>
    </linearGradient>
    <radialGradient id="bloom" cx="50%" cy="108%" r="70%">
      <stop offset="0%" stop-color="${ELECTRIC_400}" stop-opacity="0.42"/>
      <stop offset="50%" stop-color="${ELECTRIC_700}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${INK_950}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="halo" cx="50%" cy="40%" r="42%">
      <stop offset="0%" stop-color="${INK_950}" stop-opacity="0.72"/>
      <stop offset="55%" stop-color="${INK_950}" stop-opacity="0.40"/>
      <stop offset="100%" stop-color="${INK_950}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#veil)"/>
  <rect width="${W}" height="${H}" fill="url(#bloom)"/>
  <rect width="${W}" height="${H}" fill="url(#halo)"/>
</svg>`);

/*
 * THE SLOGAN, D1 (locked): "Space, without the runaround." It replaced
 * "Real Estate reimagined!", which this card still carried, exclamation mark
 * and all, on every link anybody pasted (W3, round 5). The sub-line is the
 * share description's first clause, so the picture and the words under it say
 * one thing.
 *
 * SET IN THE BRAND'S FACES, by the same renderer as every other card: the
 * slogan in Poppins 600, the sub-line in Inter 400, from the files the share
 * door's image route reads. It was Helvetica, by way of whatever font the
 * build machine had.
 */
const FONTS = path.join(ROOT, "apps/web/src/app/s/[token]");
const font = (file) => {
  const bytes = readFileSync(path.join(FONTS, file));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
};
const lineImage = new ImageResponse(
  {
    type: "div",
    props: {
      style: { width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center" },
      children: [
        {
          type: "div",
          props: {
            style: { display: "flex", color: TEXT, fontFamily: "Poppins", fontWeight: 600, fontSize: 40, letterSpacing: -0.5 },
            children: "Space, without the runaround.",
          },
        },
        {
          type: "div",
          props: {
            style: { display: "flex", marginTop: 14, color: BODY, fontFamily: "Inter", fontSize: 25 },
            children: "Homes, land, hotels and shortlets across Nigeria.",
          },
        },
      ],
    },
  },
  {
    width: W,
    height: 130,
    fonts: [
      { name: "Inter", data: font("Inter-Regular.woff"), weight: 400, style: "normal" },
      { name: "Poppins", data: font("Poppins-SemiBold.ttf"), weight: 600, style: "normal" },
    ],
  },
);
const line = Buffer.from(await lineImage.arrayBuffer());

const mark = await sharp(path.join(BRAND, "vallo-mark.png"))
  .resize(230, 230, { fit: "inside" })
  .png().toBuffer();
const word = await sharp(path.join(BRAND, "vallo-wordmark.png"))
  .resize(330, 80, { fit: "inside" })
  .png().toBuffer();

const markMeta = await sharp(mark).metadata();
const wordMeta = await sharp(word).metadata();

/* Vertical rhythm: mark, 28px, wordmark, 34px, slogan block. Centred on the
   canvas as one stack, sitting a little above the middle so the bloom reads
   as ground beneath it. */
const MARK_TOP = 96;
const WORD_TOP = MARK_TOP + markMeta.height + 28;
const LINE_TOP = WORD_TOP + wordMeta.height + 34;

const composed = sharp(plate)
  .composite([
    { input: tint, left: 0, top: 0 },
    { input: mark, left: Math.round(W / 2 - markMeta.width / 2), top: MARK_TOP },
    { input: word, left: Math.round(W / 2 - wordMeta.width / 2), top: WORD_TOP },
    { input: line, left: 0, top: LINE_TOP },
  ]);

/*
 * Written as an 8-bit palette PNG. The colour count steps down until the file
 * fits the budget, and the first attempt is the richest, so the card is as
 * good as the budget allows rather than as small as it could be.
 */
const raw = await composed.png().toBuffer();
let written = null;
for (const quality of [86, 82, 78, 74, 70, 66, 62]) {
  const info = await sharp(raw)
    .flatten({ background: "#010118" })
    .jpeg({ quality, mozjpeg: true, chromaSubsampling: "4:4:4" })
    .toFile(OUT);
  written = { quality, size: statSync(OUT).size, width: info.width, height: info.height };
  if (written.size <= BUDGET) break;
}

if (written === null || written.size > BUDGET) {
  console.error(`opengraph-image.jpg is ${written?.size ?? 0} bytes, over the ${BUDGET} byte budget`);
  process.exit(1);
}

console.log(
  `opengraph-image.jpg ${written.width}x${written.height} ${(written.size / 1024).toFixed(0)}kB (quality ${written.quality})`,
);
