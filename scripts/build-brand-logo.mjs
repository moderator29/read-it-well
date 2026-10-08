#!/usr/bin/env node
/**
 * Builds every Vallo logo file on the platform from the vector drawing in
 * `scripts/brand/logo-art.mjs` (D81, 8 October 2026: the new mark and
 * wordmark replace every old one).
 *
 * Run from the repository root:
 *
 *     node scripts/build-brand-logo.mjs
 *     node scripts/build-email-lockup.mjs   # the email band, from the PNGs below
 *     node scripts/build-og-image.mjs       # the default share card
 *
 * WHAT IT WRITES, AND WHO READS IT.
 *
 * apps/web/public/brand/
 *   vallo-mark.svg, vallo-mark-light.svg            the mark, night and day palettes (the app draws these)
 *   vallo-wordmark.svg, vallo-wordmark-light.svg    the wordmark, night and day
 *   vallo-mark-reverse.svg, vallo-wordmark-reverse.svg   white and ice with the orange kept, for the brand blue
 *   vallo-mark.png, vallo-mark-light.png            1024 wide, transparent (emails, share cards, scripts)
 *   vallo-wordmark.png, vallo-wordmark-light.png    1664 by 352, transparent
 *   vallo-logo.png                                  1024 square: mark over wordmark on brand navy
 *                                                   (structured data, the lockup)
 *   vallo-icon.png                                  1024 square app icon: the mark on brand navy
 *   startup/vallo-mark.webp, startup/vallo-wordmark.webp, session-b/signin/lockup.webp
 *                                                   the older startup and sign-in cuts, redrawn
 * apps/web/public/favicon.ico                       a real ICO: 16, 32 and 48
 * apps/web/public/pwa/icon-{16,32,48,64,192,512}.png, apple-touch-icon.png, icon-maskable-512.png
 * apps/web/assets/icon-only.png, icon-foreground.png, icon-background.png   (@capacitor/assets sources)
 * apps/web/android/app/src/main/res/mipmap-* /ic_launcher*.png              every density, at its existing size
 * apps/web/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png
 *
 * The launch images stay a plain navy field with no mark (D68c);
 * `scripts/build-native-icons.mjs` owns them.
 *
 * THE ICON GROUND. Every icon is the mark on the brand navy (`#010118`,
 * `--nf-ink-950` in `packages/design-tokens/src/tokens.css`), lifted by a soft
 * navy light behind the towers the way the founder's render is lit. The
 * Android adaptive foreground is now TRANSPARENT (the mark alone), which the
 * old opaque glass render could never be, so the launcher's parallax works.
 */

import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

import { MARK_VIEWBOX, PALETTE, WORDMARK_VIEWBOX, markGradients, markParts, markSvg, wordmarkSvg } from "./brand/logo-art.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB = path.join(ROOT, "apps/web");
const BRAND = path.join(WEB, "public/brand");
const PWA = path.join(WEB, "public/pwa");
const NATIVE = path.join(WEB, "assets");
const ANDROID_RES = path.join(WEB, "android/app/src/main/res");
const IOS_ICON = path.join(WEB, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png");

const NAVY = "#010118";
const NAVY_LIFT = "#0B1C5C";

const svg = {
  markNight: markSvg({ theme: "night" }),
  markDay: markSvg({ theme: "day" }),
  wordNight: wordmarkSvg({ theme: "night" }),
  wordDay: wordmarkSvg({ theme: "day" }),
  markReverse: markSvg({ theme: "reverse" }),
  wordReverse: wordmarkSvg({ theme: "reverse" }),
};

const MARK_ASPECT = MARK_VIEWBOX.w / MARK_VIEWBOX.h;
const WORD_ASPECT = WORDMARK_VIEWBOX.w / WORDMARK_VIEWBOX.h;

/** Rasterise an SVG string to a given width (height follows the aspect). */
async function raster(source, width) {
  /* librsvg renders at the SVG's own size times density/72; ask for enough
     density that the resize below is always a downscale. */
  const density = Math.max(72, Math.ceil((72 * width * 2) / MARK_VIEWBOX.w));
  return sharp(Buffer.from(source), { density }).resize({ width, kernel: "lanczos3" }).png().toBuffer();
}

const written = [];
async function out(file, buffer) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, buffer);
  const { size } = await stat(file);
  written.push(`${path.relative(ROOT, file)}  ${Math.round(size / 1024)}kB`);
}
const png = (b) => sharp(b).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();

/** A navy square (or rounded square, or circle) with the mark centred at `scale` of its width. */
async function iconOn(size, { scale = 0.7, shape = "square", lift = true, transparent = false, dy = 0.03 } = {}) {
  const r = shape === "circle" ? size / 2 : shape === "rounded" ? Math.round(size * 0.225) : 0;
  const ground = transparent
    ? ""
    : `<defs><radialGradient id="g" cx="50%" cy="44%" r="62%"><stop offset="0" stop-color="${lift ? NAVY_LIFT : NAVY}"/><stop offset="1" stop-color="${NAVY}"/></radialGradient></defs>` +
      `<rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="url(#g)"/>`;
  const base = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${ground}</svg>`);
  if (scale <= 0) return png(await sharp(base).png().toBuffer());
  const w = Math.round(size * scale);
  const mark = await raster(svg.markNight, w);
  const { height: h } = await sharp(mark).metadata();
  return png(
    await sharp(base)
      .composite([{ input: mark, left: Math.round((size - w) / 2), top: Math.round((size - h) / 2 - size * dy) }])
      .png()
      .toBuffer(),
  );
}

/** A Windows ICO holding PNG images (supported by every browser that reads favicons). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const dir = Buffer.alloc(16 * images.length);
  let offset = 6 + dir.length;
  images.forEach(({ size, data }, i) => {
    const o = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, o);
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1);
    dir.writeUInt8(0, o + 2);
    dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(data.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += data.length;
  });
  return Buffer.concat([header, dir, ...images.map((i) => i.data)]);
}

/* ---------- the geometry the app draws inline (the animated mark) ---------- */
{
  const parts = markParts();
  const body = [
    "/**",
    " * GENERATED by `node scripts/build-brand-logo.mjs` from `scripts/brand/logo-art.mjs`.",
    " * Do not hand edit. The same drawing as `public/brand/vallo-mark.svg`, in parts,",
    " * so `LogoMarkLive` can raise the towers and sweep the ring (D81).",
    " *",
    " * The colours are the artwork's own, as they are inside the SVG files: the",
    " * logo is a drawing, not a surface, and it does not follow the theme by",
    " * token (it carries a night and a day palette, chosen by `light.css`).",
    " */",
    "/* eslint-disable nf/no-raw-colour -- the logo artwork's own palette (D81), generated */",
    "",
    `export const MARK_VIEWBOX = ${JSON.stringify(parts.viewBox)} as const;`,
    `export const WORDMARK_VIEWBOX = ${JSON.stringify(WORDMARK_VIEWBOX)} as const;`,
    `export const MARK_RING = ${JSON.stringify(parts.ring)};`,
    `export const MARK_RING_CENTRE = ${JSON.stringify(parts.ringCentre)};`,
    `export const MARK_ABOVE_RING = ${JSON.stringify(parts.above)};`,
    `export const MARK_TOWERS = ${JSON.stringify(parts.towers, null, 2)} as const;`,
    `export const MARK_SIDE = ${JSON.stringify({ night: PALETTE.night.side, day: PALETTE.day.side })};`,
    `export const MARK_GRADIENTS = ${JSON.stringify({ night: markGradients("night"), day: markGradients("day") }, null, 2)} as const;`,
    "",
  ].join("\n");
  await out(path.join(WEB, "src/lib/brand/logo-geometry.ts"), Buffer.from(body));
}

/* ---------- the logo for share cards (Satori draws images, not CSS) ---------- */
{
  const uri = (text) => `data:image/svg+xml;base64,${Buffer.from(text).toString("base64")}`;
  const body = [
    "/**",
    " * GENERATED by `node scripts/build-brand-logo.mjs`. Do not hand edit.",
    " *",
    " * The new mark and wordmark (D81) as data URIs, night palette, for the share",
    " * cards and OG images that `next/og` draws: Satori has no stylesheet and no",
    " * public folder to read, so the artwork travels inside the module. Server",
    " * only: nothing on a page imports this.",
    " */",
    "",
    `export const OG_MARK_URI = ${JSON.stringify(uri(svg.markNight))};`,
    `export const OG_MARK_ASPECT = ${(MARK_ASPECT).toFixed(4)};`,
    `export const OG_WORDMARK_URI = ${JSON.stringify(uri(svg.wordNight))};`,
    `export const OG_WORDMARK_ASPECT = ${(WORD_ASPECT).toFixed(4)};`,
    "",
  ].join("\n");
  await out(path.join(WEB, "src/lib/brand/og-logo.ts"), Buffer.from(body));
}

/* ---------- the vectors ---------- */
await out(path.join(BRAND, "vallo-mark.svg"), Buffer.from(svg.markNight));
await out(path.join(BRAND, "vallo-mark-light.svg"), Buffer.from(svg.markDay));
await out(path.join(BRAND, "vallo-wordmark.svg"), Buffer.from(svg.wordNight));
await out(path.join(BRAND, "vallo-wordmark-light.svg"), Buffer.from(svg.wordDay));
await out(path.join(BRAND, "vallo-mark-reverse.svg"), Buffer.from(svg.markReverse));
await out(path.join(BRAND, "vallo-wordmark-reverse.svg"), Buffer.from(svg.wordReverse));

/* ---------- transparent PNGs ---------- */
await out(path.join(BRAND, "vallo-mark.png"), await png(await raster(svg.markNight, 1024)));
await out(path.join(BRAND, "vallo-mark-light.png"), await png(await raster(svg.markDay, 1024)));
await out(path.join(BRAND, "vallo-wordmark.png"), await png(await raster(svg.wordNight, WORDMARK_VIEWBOX.w)));
await out(path.join(BRAND, "vallo-wordmark-light.png"), await png(await raster(svg.wordDay, WORDMARK_VIEWBOX.w)));

/* ---------- the square lockup and the app icon ---------- */
{
  const size = 1024;
  const markW = 560;
  const wordW = 600;
  const mark = await raster(svg.markNight, markW);
  const word = await raster(svg.wordNight, wordW);
  const markH = Math.round(markW / MARK_ASPECT);
  const wordH = Math.round(wordW / WORD_ASPECT);
  const gap = 64;
  const top = Math.round((size - (markH + gap + wordH)) / 2);
  const ground = await iconOn(size, { scale: 0 });
  await out(
    path.join(BRAND, "vallo-logo.png"),
    await png(
      await sharp(ground)
        .composite([
          { input: mark, left: Math.round((size - markW) / 2), top },
          { input: word, left: Math.round((size - wordW) / 2), top: top + markH + gap },
        ])
        .png()
        .toBuffer(),
    ),
  );
}
await out(path.join(BRAND, "vallo-icon.png"), await iconOn(1024, { scale: 0.72 }));

/* ---------- the older cuts, redrawn under their names ---------- */
await out(path.join(BRAND, "startup/vallo-mark.webp"), await sharp(await raster(svg.markNight, 280)).webp({ quality: 92, alphaQuality: 100 }).toBuffer());
await out(path.join(BRAND, "startup/vallo-wordmark.webp"), await sharp(await raster(svg.wordNight, 312)).webp({ quality: 92, alphaQuality: 100 }).toBuffer());
{
  const W = 464;
  const H = 452;
  const mark = await raster(svg.markNight, 300);
  const word = await raster(svg.wordNight, 330);
  const mh = Math.round(300 / MARK_ASPECT);
  const wh = Math.round(330 / WORD_ASPECT);
  const top = Math.round((H - (mh + 40 + wh)) / 2);
  const canvas = sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  await out(
    path.join(BRAND, "session-b/signin/lockup.webp"),
    await sharp(
      await canvas
        .composite([
          { input: mark, left: Math.round((W - 300) / 2), top },
          { input: word, left: Math.round((W - 330) / 2), top: top + mh + 40 },
        ])
        .png()
        .toBuffer(),
    )
      .webp({ quality: 92, alphaQuality: 100 })
      .toBuffer(),
  );
}

/* ---------- favicon and PWA ---------- */
/* Tab-sized icons are a rounded tile, so a tab or a bookmark bar shows a
   shape rather than a hard navy square; the mark sits larger at the
   smallest sizes, where every pixel of it counts. */
const tab = async (size) => iconOn(size, { scale: size <= 32 ? 0.86 : 0.8, shape: "rounded", dy: 0.02 });
await out(
  path.join(WEB, "public/favicon.ico"),
  ico([
    { size: 16, data: await tab(16) },
    { size: 32, data: await tab(32) },
    { size: 48, data: await tab(48) },
  ]),
);
for (const size of [16, 32, 48, 64]) await out(path.join(PWA, `icon-${size}.png`), await tab(size));
/* Install icons stay full-bleed squares: the platform applies its own mask. */
for (const size of [192, 512]) await out(path.join(PWA, `icon-${size}.png`), await iconOn(size, { scale: 0.72 }));
await out(path.join(PWA, "apple-touch-icon.png"), await iconOn(180, { scale: 0.72 }));
/* Maskable: everything meaningful inside the middle 80 per cent (the safe
   circle is 40 per cent of the width in radius). The mark's half-diagonal
   at 0.56 of the width is 0.37 of it, inside that circle. */
await out(path.join(PWA, "icon-maskable-512.png"), await iconOn(512, { scale: 0.56, dy: 0.02 }));

/* ---------- native ---------- */
await out(path.join(NATIVE, "icon-only.png"), await iconOn(1024, { scale: 0.7 }));
/* The adaptive foreground: the mark alone, on transparency. Capacitor wraps
   it in a 16.7 per cent inset, so it is drawn in the inner 72 of 108 units
   and must fit the guaranteed 66-unit circle: 0.62 of the file's width keeps
   the mark's half-diagonal at 29 units. */
await out(path.join(NATIVE, "icon-foreground.png"), await iconOn(1024, { scale: 0.62, transparent: true, dy: 0.02 }));
await out(path.join(NATIVE, "icon-background.png"), await iconOn(1024, { scale: 0 }));
for (const dir of await readdir(ANDROID_RES)) {
  if (!dir.startsWith("mipmap-") || dir.includes("anydpi")) continue;
  const base = path.join(ANDROID_RES, dir);
  const { width: size } = await sharp(path.join(base, "ic_launcher.png")).metadata();
  await out(path.join(base, "ic_launcher.png"), await iconOn(size, { scale: 0.7, shape: "rounded" }));
  await out(path.join(base, "ic_launcher_round.png"), await iconOn(size, { scale: 0.64, shape: "circle", dy: 0.02 }));
  await out(path.join(base, "ic_launcher_foreground.png"), await iconOn(size, { scale: 0.62, transparent: true, dy: 0.02 }));
  await out(path.join(base, "ic_launcher_background.png"), await iconOn(size, { scale: 0 }));
}
await out(IOS_ICON, await sharp(await iconOn(1024, { scale: 0.7 })).flatten({ background: NAVY }).png().toBuffer());

console.log(written.join("\n"));
console.log(`\n${written.length} files. Now run build-email-lockup.mjs and build-og-image.mjs.`);
