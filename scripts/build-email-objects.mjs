#!/usr/bin/env node
/**
 * Builds the PNG pictures every email carries, under `apps/web/public/brand/email/`
 * (the email half of Session 3 W9; D23 and D29):
 *
 *   objects/<name>.png and <name>@2x.png   the Tier B object in each email's
 *                                          header, 128px and 256px, resized
 *                                          from `public/brand/tier-b/<name>@2x.webp`
 *                                          with no change to the drawing. The
 *                                          names are `EMAIL_OBJECTS` in
 *                                          `apps/web/src/lib/email/icons.ts`.
 *   glyphs/<key>.png                       the line glyph beside each label in
 *                                          a key-value row, 48px (drawn at 16,
 *                                          so 3x), from the product's own
 *                                          UiIcon, stroked in the family blue.
 *                                          The keys and icons are `EMAIL_GLYPHS`
 *                                          in the same file.
 *
 * WHY PNG. Tier B ships as webp, which classic Outlook, older Apple Mail and
 * several webmails do not draw.
 *
 * HOW TO RUN. From the repository root, whenever a tier-b source, a UiIcon
 * glyph or either list changes (the outputs are committed, and it rewrites
 * them):
 *
 *     node scripts/build-email-objects.mjs
 *
 * It needs `sharp` and `esbuild` from the repo's node_modules. The glyphs are
 * UiIcon React components, so `scripts/email-glyph-entry.tsx` is bundled with
 * esbuild into a temporary file, run once with node to print the object names
 * and the glyphs' SVG, and the temporary file is removed. Both lists are read
 * from `apps/web/src/lib/email/icons.ts`, so nothing is passed in by hand.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const esbuild = require("esbuild");

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WEB_SRC = join(ROOT, "apps", "web", "src");
const BRAND = join(ROOT, "apps", "web", "public", "brand");
const OUT_OBJECTS = join(BRAND, "email", "objects");
const OUT_GLYPHS = join(BRAND, "email", "glyphs");

/* The family blue the line glyphs are stroked in. */
const GLYPH_BLUE = "#0C6AEF";

/** Runs a bundled TypeScript entry once with node and returns what it printed. */
function runBundled(entry, alias) {
  const dir = mkdtempSync(join(tmpdir(), "vallo-email-assets-"));
  const out = join(dir, "entry.cjs");
  try {
    esbuild.buildSync({
      entryPoints: [entry],
      outfile: out,
      bundle: true,
      platform: "node",
      format: "cjs",
      jsx: "automatic",
      alias,
      define: { "process.env.NODE_ENV": '"production"' },
      logLevel: "error",
    });
    return execFileSync(process.execPath, [out], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const { objects: objectNames, glyphs: svgs } = JSON.parse(runBundled(join(ROOT, "scripts", "email-glyph-entry.tsx"), { "@": WEB_SRC }));

mkdirSync(OUT_OBJECTS, { recursive: true });
mkdirSync(OUT_GLYPHS, { recursive: true });

for (const name of objectNames) {
  const src = join(BRAND, "tier-b", `${name}@2x.webp`);
  await sharp(src)
    .resize(256, 256)
    .png({ compressionLevel: 9, palette: false })
    .toFile(join(OUT_OBJECTS, `${name}@2x.png`));
  await sharp(src)
    .resize(128, 128)
    .png({ compressionLevel: 9 })
    .toFile(join(OUT_OBJECTS, `${name}.png`));
}

for (const [key, svg] of Object.entries(svgs)) {
  const coloured = svg
    .replace(/currentColor/g, GLYPH_BLUE)
    .replace(/<svg /, '<svg xmlns="http://www.w3.org/2000/svg" ');
  await sharp(Buffer.from(coloured), { density: 72 * 3 })
    .resize(48, 48)
    .png({ compressionLevel: 9 })
    .toFile(join(OUT_GLYPHS, `${key}.png`));
}

console.log(`email assets: ${objectNames.length} objects, ${Object.keys(svgs).length} glyphs`);
