/**
 * Wire dropped-in property photography into the product, by filename.
 *
 * Run from the repository root, and `apps/web` runs it automatically before
 * every build through its `prebuild` script:
 *
 *   node scripts/build-scene-manifest.mjs
 *
 * WHY THIS EXISTS.
 *
 * `MediaFrame.tsx` paints every listing photograph on the platform, and every
 * published listing in the catalogue has zero rows in `listing_photos`, so what
 * it falls back to is not an edge case, it is what the entire product looks
 * like. Today two images carry eight scene types: `vallo-villa.png` for
 * anything somebody lives in and `vallo-city.png` for a block, a hotel or an
 * office floor. That is the weakest part of the visual product.
 *
 * The obvious fix is one excellent photograph per scene. **This environment
 * cannot download one**: the network policy answers 403 to every image host, so
 * no session can fetch photography however much it would like to. The
 * deliverable is therefore a shortlist the founder can pull in one sitting,
 * which is `docs/IMAGERY.md`, plus this, which is the wiring that makes
 * dropping the files in the only remaining step.
 *
 * HOW TO USE IT.
 *
 *   1. Read `docs/IMAGERY.md`. It names a specific image per scene, with a
 *      direct URL and the licence it carries.
 *   2. Download each one and save it into `apps/web/public/brand/scenes/` under
 *      the scene's own name: `house.jpg`, `terrace.jpg`, `flats.jpg` and so on.
 *      The list of names this script accepts is `SCENES` below, and it is the
 *      same list `MediaFrame` uses.
 *   3. Build. This script runs first, sees what is there, and writes the
 *      manifest that `MediaFrame` imports.
 *
 * There is no third step and no code to edit. A scene with no file keeps the
 * stand-in it has today, so the product is never broken by a missing image and
 * the eight scenes can be filled in one at a time.
 *
 * WHAT THIS SCRIPT WILL NOT DO.
 *
 * It does not resize, re-encode or optimise. That is deliberate: `next/image`
 * already serves these through its optimiser at the size each surface asks for,
 * and a build step that silently re-encoded the founder's chosen photograph
 * would make the file in the repository not the file he chose. It does warn
 * when one is large enough to matter on a Nigerian mobile network, which is the
 * target and not a laptop on fibre.
 *
 * IT NEVER FAILS THE BUILD. A missing directory, an unreadable file or an
 * unrecognised name is reported and skipped. A brand asset pipeline that can
 * break a deploy is worse than one that occasionally ships the old picture.
 */

import { mkdir, readdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCENES_DIR = path.join(ROOT, "apps/web/public/brand/scenes");
const OUT = path.join(ROOT, "apps/web/src/lib/listings/scene-photographs.generated.ts");

/**
 * The scenes that can carry a photograph.
 *
 * `land` is absent on purpose and must stay absent. A plot has nothing built on
 * it, so a photograph of a building on a land listing would be the picture
 * contradicting the listing. `MediaFrame` draws land instead, and that drawing
 * is a statement rather than a fallback.
 */
const SCENES = ["house", "villa", "terrace", "shortlet", "flats", "tower", "hotel", "shop"];

/** Extensions worth serving. AVIF and WebP first, because bytes are the point. */
const EXTENSIONS = [".avif", ".webp", ".jpg", ".jpeg", ".png"];

/** Above this, a single image is a real cost on the target network. */
const WARN_BYTES = 400 * 1024;

await mkdir(SCENES_DIR, { recursive: true });

let entries = [];
try {
  entries = await readdir(SCENES_DIR);
} catch (error) {
  console.warn(`scene manifest: could not read ${SCENES_DIR}, writing an empty manifest.`, error);
}

const found = new Map();
const ignored = [];

for (const entry of entries) {
  const ext = path.extname(entry).toLowerCase();
  const base = path.basename(entry, ext).toLowerCase();
  if (entry.startsWith(".") || entry.toLowerCase() === "readme.md") continue;
  if (!SCENES.includes(base) || !EXTENSIONS.includes(ext)) {
    ignored.push(entry);
    continue;
  }
  /* Two files for one scene: the earlier extension in EXTENSIONS wins, so
     dropping in an AVIF beside a JPG upgrades the scene without a deletion. */
  const existing = found.get(base);
  if (existing && EXTENSIONS.indexOf(existing.ext) <= EXTENSIONS.indexOf(ext)) continue;
  let bytes = 0;
  try {
    ({ size: bytes } = await stat(path.join(SCENES_DIR, entry)));
  } catch {
    ignored.push(entry);
    continue;
  }
  found.set(base, { ext, file: entry, bytes });
}

const lines = [
  "/**",
  " * GENERATED FILE. DO NOT EDIT.",
  " *",
  " * Written by `node scripts/build-scene-manifest.mjs`, which `apps/web` runs",
  " * before every build. It lists the property photographs that are actually",
  " * present in `public/brand/scenes/`.",
  " *",
  " * To add one, drop the file in under the scene's name and build. Do not add",
  " * an entry here by hand: the next build overwrites it, and an entry naming a",
  " * file that is not there ships a broken image.",
  " *",
  " * `docs/IMAGERY.md` names a specific, correctly licensed image per scene.",
  " */",
  "",
  "/** Scene name to public path, for scenes that have their own photograph. */",
  "export const SCENE_PHOTOGRAPHS: Readonly<Record<string, string>> = {",
  ...[...found.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([scene, { file }]) => `  ${scene}: "/brand/scenes/${file}",`),
  "};",
  "",
];

await writeFile(OUT, lines.join("\n"), "utf8");

if (found.size === 0) {
  console.log(
    "Scene photographs: none present yet. Every scene keeps its stand-in.\n" +
      `  Drop files into apps/web/public/brand/scenes/ named: ${SCENES.join(", ")}\n` +
      "  docs/IMAGERY.md names a specific licensed image for each one.",
  );
} else {
  console.log(`Scene photographs: ${found.size} of ${SCENES.length} present.`);
  for (const [scene, { file, bytes }] of [...found.entries()].sort()) {
    const kb = Math.round(bytes / 1024);
    const flag = bytes > WARN_BYTES ? "  <- large for a mobile network, consider AVIF" : "";
    console.log(`  ${scene.padEnd(10)} ${file.padEnd(18)} ${String(kb).padStart(5)}kB${flag}`);
  }
  const missing = SCENES.filter((s) => !found.has(s));
  if (missing.length > 0) console.log(`  still on the stand-in: ${missing.join(", ")}`);
}

if (ignored.length > 0) {
  console.log(
    `  ignored (name or extension not recognised): ${ignored.join(", ")}\n` +
      `  accepted names: ${SCENES.join(", ")}; accepted extensions: ${EXTENSIONS.join(", ")}`,
  );
}
