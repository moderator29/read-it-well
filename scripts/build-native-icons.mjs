/**
 * Build the plain navy launch images (no mark: see `plainSplash`).
 *
 * Run from the repository root:
 *
 *   node scripts/build-native-icons.mjs
 *
 * THE NATIVE ICONS MOVED OUT OF THIS FILE (D81, 8 October 2026). They were
 * composed from `brand/vallo-icon.png`, the old glass tile, which was an opaque
 * render with no alpha to recover, so the Android adaptive foreground had to
 * be navy on navy. The new logo is a vector: `scripts/build-brand-logo.mjs`
 * draws `apps/web/assets/icon-*.png`, every `mipmap-* /ic_launcher*.png` and the
 * iOS `AppIcon` from it, with a transparent adaptive foreground. This file
 * keeps the launch images, which carry no brand at all (D68c).
 */

import { mkdir, readdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "apps/web/assets");

/** Sampled brand anchor. `tokens.css` layer 1 is the authority. */
const NAVY = { r: 1, g: 1, b: 24, alpha: 1 };

await mkdir(OUT, { recursive: true });
console.log("Native launch images:");

/*
 * THE LAUNCH IMAGE IS A PLAIN NAVY FIELD, AND NOTHING ELSE (D68c, A.2 of the
 * build handoff, 7 October 2026).
 *
 * The founder's ruling is absolute: the logo never appears by itself on app
 * open. The native launch image is the one frame the web layer cannot time,
 * because it stays up for as long as the slowest thing on the critical path
 * (a cold Lagos 4G start can be eight seconds), so it must carry no brand at
 * all. A flat `#010118`, identical to the app's background and to the status
 * bar, makes the hand-off from the operating system to the page invisible and
 * makes its duration stop mattering.
 *
 * It used to centre the tile at 0.2 of the canvas, and `@capacitor/assets`
 * fanned that out. The fan-out is now done here, straight into the native
 * projects, so nobody has to run a second tool to remove the mark: every
 * `splash.png` under the Android `res/drawable*` folders (day and night,
 * every density and orientation) and every image in the iOS
 * `Splash.imageset` is rewritten as a flat field at its own existing size.
 * `lib/native/native-splash.test.ts` fails if any of them carries a pixel of
 * anything else.
 */
async function plainSplash(file, width, height) {
  await sharp({ create: { width, height, channels: 3, background: NAVY } })
    .png({ compressionLevel: 9, palette: true, colours: 2 })
    .toFile(file);
}

await plainSplash(path.join(OUT, "splash.png"), 2732, 2732);
await plainSplash(path.join(OUT, "splash-dark.png"), 2732, 2732);
console.log(`  ${"splash.png, splash-dark.png".padEnd(24)} 2732x2732  flat navy, no mark`);

const ANDROID_RES = path.join(ROOT, "apps/web/android/app/src/main/res");
const IOS_SPLASH = path.join(ROOT, "apps/web/ios/App/App/Assets.xcassets/Splash.imageset");
const nativeSplashes = [];
for (const dir of await readdir(ANDROID_RES)) {
  if (!dir.startsWith("drawable")) continue;
  const file = path.join(ANDROID_RES, dir, "splash.png");
  if (await stat(file).catch(() => null)) nativeSplashes.push(file);
}
for (const name of await readdir(IOS_SPLASH)) {
  if (name.endsWith(".png")) nativeSplashes.push(path.join(IOS_SPLASH, name));
}
for (const file of nativeSplashes) {
  const { width, height } = await sharp(file).metadata();
  await plainSplash(file, width, height);
}
console.log(`  ${"native launch images".padEnd(24)} ${nativeSplashes.length} files rewritten as flat navy`);

await writeFile(
  path.join(OUT, "README.md"),
  [
    "# Native icon and splash sources",
    "",
    "Generated. Do not hand edit.",
    "",
    "`node scripts/build-brand-logo.mjs` draws the icon sources here",
    "(`icon-only.png`, `icon-foreground.png`, `icon-background.png`) from the",
    "vector logo in `scripts/brand/logo-art.mjs`, and writes the Android",
    "`mipmap-*` launcher icons and the iOS `AppIcon` directly.",
    "",
    "`node scripts/build-native-icons.mjs` writes the launch images",
    "(`splash.png`, `splash-dark.png` and every native `splash.png`): a plain",
    "navy field with no mark (D68c).",
    "",
  ].join("\n"),
  "utf8",
);

console.log("\nDone.");
