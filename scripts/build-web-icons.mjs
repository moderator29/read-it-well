/**
 * Build the Android long-press shortcut icons under `apps/web/public/pwa`.
 *
 * Run from the repository root:
 *
 *   node scripts/build-web-icons.mjs
 *
 * THE APP ICONS AND THE FAVICON MOVED OUT OF THIS FILE (D81, 8 October 2026).
 * They used to be cut from `brand/vallo-icon.png`, the old glass tile. The new
 * logo is a vector, and `scripts/build-brand-logo.mjs` now draws every logo
 * file from it: the favicon (a real 16, 32 and 48 ICO), `pwa/icon-*.png`,
 * `apple-touch-icon.png`, the maskable icon and the native icons. This file
 * keeps only the shortcut icons, which are commissioned objects, not the logo.
 */

import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const BRAND = path.join(ROOT, "apps/web/public/brand");
const PWA = path.join(ROOT, "apps/web/public/pwa");

/**
 * The Android long-press shortcut icons, and why they are generated here now.
 *
 * These three were missed by the brand sweep and by the first version of this
 * script, and they were the worst offenders on the platform: `shortcut-wallet`
 * was a PURPLE tile with a CORAL wallet, `shortcut-search` was purple, and
 * `shortcut-bookings` was violet with BAKED-IN ENGLISH TEXT on a document. All
 * three are banned hues under the brand rules, all three are declared live in
 * `app/manifest.ts`, and all three appear in the Android long-press menu.
 *
 * They survived because `pwa.spec.mjs` checks that a manifest icon returns 200
 * and never looks at what is in it, and because a hue scan of the app icons
 * would not reach `public/pwa/shortcut-*`. They are generated from the
 * commissioned brand objects now, so they cannot drift again.
 */
const SHORTCUTS = [
  { name: "shortcut-search", object: "home-search" },
  { name: "shortcut-bookings", object: "calendar-check" },
  { name: "shortcut-wallet", object: "wallet-secure" },
];

/** Where the 87 commissioned objects live. */
const OBJECTS = path.join(BRAND, "icons");

async function write(name, buffer) {
  const target = path.join(PWA, name);
  await sharp(buffer).png({ compressionLevel: 9, palette: true }).toFile(target);
  const { size } = await stat(target);
  return { name, size };
}

await mkdir(PWA, { recursive: true });

const written = [];

/*
 * The three shortcut icons. 96px is the size the manifest declares and the size
 * Android actually reads.
 *
 * THESE ARE THE ONE PLACE A WHITE GROUND IS RIGHT, and it is worth saying why,
 * because everything else in this file is composed on navy on purpose. The 87
 * commissioned objects are lit on a white studio ground and are opaque, so
 * there is no alpha to recover and compositing one on navy leaves a white
 * square inside a navy border, which reads as a mistake rather than a design.
 * A shortcut also appears inside the launcher's own long-press menu rather
 * than on the home screen, where a light tile sits correctly beside the
 * system's own entries. So the object is rendered full bleed on the ground it
 * was lit on.
 */
for (const { name, object } of SHORTCUTS) {
  const source = path.join(OBJECTS, `${object}.png`);
  const art = await sharp(source)
    .resize(96, 96, { kernel: "lanczos3" })
    .flatten({ background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer();
  written.push(await write(`${name}.png`, art));
}

console.log("Shortcut icons:");
for (const { name, size } of written) {
  console.log(`  pwa/${name.padEnd(24)} ${String(size).padStart(7)} bytes`);
}
