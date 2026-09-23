/**
 * Give the cut glass objects their names and write the set the product will use.
 *
 * Run from the repository root, after the other two:
 *
 *   node scripts/slice-icon-sheets.mjs
 *   node scripts/cut-icon-ground.mjs
 *   node scripts/name-icon-objects.mjs
 *
 * WHAT COMES OUT, AND WHY IT IS THREE DIRECTORIES RATHER THAN ONE.
 *
 *   apps/web/public/brand/glass/<name>.png         the objects, 256px square
 *   apps/web/public/brand/glass/light/<name>.png   the 24 light twins
 *   apps/web/public/brand/glass/hero/<name>.png    the 12 wide scenes, unresized
 *
 * A hero scene is not an icon and is kept where a call site cannot reach for it
 * by accident. The light twins share their names with their dark counterparts
 * ON PURPOSE, so a theme-aware component is a directory swap and not a lookup
 * table: `light/badge-pending.png` is the same object as `badge-pending.png`.
 *
 * NOTHING IS WIRED UP HERE. These land beside `brand/icons`, the 87 objects the
 * product draws today, and not on top of them. Until a call site is changed the
 * product renders exactly what it rendered before, which is the point: the
 * artwork can be reviewed in place, at the real sizes, before anything moves.
 *
 * 256 PIXELS, AND WHY THAT IS NOT ARBITRARY.
 *
 * `BrandIcon` defaults to 56px and its largest use is `fill`, which requests
 * 160px. 256 is comfortably above twice the largest real size, so a 2x screen
 * never upscales, and it is well below the 265 to 270px the slices come out at,
 * so the resize is always a reduction. The existing clay objects are 384px,
 * which was already more than anything asks for.
 *
 * THE ALTERNATES ARE NOT WRITTEN HERE AND NOT COMMITTED.
 *
 * Most names are drawn on more than one sheet. The others stay in
 * `assets/brand-cut`, which is derived and ignored by git, because they are one
 * command away from existing again and 14MB is a real cost in a repository
 * somebody clones over a Nigerian connection. `scripts/icon-manifest.mjs` names
 * every one of the 210, so changing which drawing wins is an edit to that file
 * and a rerun.
 */

import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { SHEETS, CANONICAL, WITHHELD, LIGHT_SHEET, HERO_SHEETS } from "./icon-manifest.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CUT = path.join(ROOT, "assets/brand-cut");
const OUT = path.join(ROOT, "apps/web/public/brand/glass");
const CLAY = path.join(ROOT, "apps/web/public/brand/icons");

/** Edge of a delivered object. See the note above; this is a reduction, never a stretch. */
const EDGE = 256;

/* Every slice must be accounted for before anything is written. */
for (const [sheet, names] of Object.entries(SHEETS)) {
  const files = (await readdir(path.join(CUT, sheet))).filter((f) => f.endsWith(".png"));
  if (files.length !== names.length) {
    throw new Error(
      `${sheet} has ${files.length} cut objects and the manifest names ${names.length}. ` +
        "The manifest is a statement about the artwork, so fix whichever one is wrong rather than trimming.",
    );
  }
}

await rm(OUT, { recursive: true, force: true });
await mkdir(path.join(OUT, "light"), { recursive: true });
await mkdir(path.join(OUT, "hero"), { recursive: true });

/** name -> [{ sheet, index }], every drawing of it. */
const drawings = new Map();
for (const [sheet, names] of Object.entries(SHEETS)) {
  if (sheet === LIGHT_SHEET) continue;
  names.forEach((name, i) => {
    if (!drawings.has(name)) drawings.set(name, []);
    drawings.get(name).push({ sheet, index: i });
  });
}

const written = { object: [], light: [], hero: [] };
/** name -> where the delivered file was cut from, so the map in the docs is generated. */
const sources = new Map();
const withheld = [];
let bytes = 0;

async function emit(kind, name, sheet, index, { resize = true } = {}) {
  const src = path.join(CUT, sheet, `${String(index + 1).padStart(2, "0")}.png`);
  const dir = kind === "object" ? OUT : path.join(OUT, kind);
  const dest = path.join(dir, `${name}.png`);
  let pipe = sharp(src);
  if (resize) pipe = pipe.resize(EDGE, EDGE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });
  /*
   * PALETTE PNG, WHICH IS A THIRD OF THE BYTES AND LOOKS THE SAME.
   *
   * These objects are one hue. A full-colour PNG spends 64kB per object storing
   * a truecolour ramp that runs from navy to cyan to white and nothing else,
   * and quantising it to a palette costs 18kB instead. Rendered at 256px on the
   * night canvas and compared side by side against the truecolour original,
   * there is no visible difference in the glow, the rim or the alpha ramp.
   *
   * It stays PNG rather than becoming WebP deliberately. WebP at the same
   * quality is slightly LARGER here, and more to the point `next/image` already
   * re-encodes whatever is on disk into WebP or AVIF at serve time, so the
   * format in the repository only decides how big a clone is. Changing the
   * extension would also change every `src` in BrandIcon, which is a call site
   * change outside this script.
   */
  const info = await pipe.png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(dest);
  bytes += info.size;
  written[kind].push(name);
  sources.set(`${kind}:${name}`, { kind, name, sheet, index: index + 1 });
}

for (const [name, drawn] of [...drawings].sort(([a], [b]) => a.localeCompare(b))) {
  if (WITHHELD.has(name)) {
    withheld.push(name);
    continue;
  }
  if (HERO_SHEETS.has(drawn[0].sheet)) {
    await emit("hero", name, drawn[0].sheet, drawn[0].index, { resize: false });
    continue;
  }
  const preferred = CANONICAL[name];
  if (drawn.length > 1 && !preferred) {
    throw new Error(
      `${name} is drawn on ${drawn.map((d) => d.sheet).join(", ")} and CANONICAL does not say which wins. ` +
        "That choice belongs in scripts/icon-manifest.mjs, not in whichever sheet happens to be read last.",
    );
  }
  const chosen = preferred ? drawn.find((d) => d.sheet === preferred) : drawn[0];
  if (!chosen) throw new Error(`CANONICAL sends ${name} to ${preferred}, which does not draw it.`);
  await emit("object", name, chosen.sheet, chosen.index);
}

for (const [i, name] of SHEETS[LIGHT_SHEET].entries()) {
  await emit("light", name, LIGHT_SHEET, i);
}

/* How much of what the product draws today this set can actually replace. */
const clay = (await readdir(CLAY)).filter((f) => f.endsWith(".png")).map((f) => f.slice(0, -4)).sort();
const delivered = new Set(written.object);
const heroOnly = new Set(written.hero.map((n) => n.replace(/^hero-/, "")));
const replaced = clay.filter((n) => delivered.has(n));
const unreplaced = clay.filter((n) => !delivered.has(n));
const brandNew = written.object.filter((n) => !clay.includes(n));

const report = {
  generated: "node scripts/name-icon-objects.mjs",
  objects: written.object.length,
  lightTwins: written.light.length,
  heroScenes: written.hero.length,
  megabytes: Number((bytes / 1024 / 1024).toFixed(2)),
  currentObjects: clay.length,
  replaced,
  unreplaced,
  brandNew,
  withheld,
  heroOnly: [...heroOnly],
  sources: Object.fromEntries([...sources].sort(([a], [b]) => a.localeCompare(b))),
  alternates: Object.fromEntries(
    [...drawings]
      .filter(([name, d]) => d.length > 1 && !WITHHELD.has(name))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, d]) => [name, d.map((x) => `${x.sheet}/${String(x.index + 1).padStart(2, "0")}`)]),
  ),
};
await writeFile(path.join(ROOT, "assets/icon-replacement.json"), JSON.stringify(report, null, 1), "utf8");

console.log(`objects      ${written.object.length}`);
console.log(`light twins  ${written.light.length}`);
console.log(`hero scenes  ${written.hero.length}`);
console.log(`total size   ${report.megabytes} MB`);
console.log(`\nof the ${clay.length} objects the product draws today:`);
console.log(`  ${replaced.length} have a like-for-like glass replacement`);
console.log(`  ${unreplaced.length} do not: ${unreplaced.join(", ")}`);
console.log(`\n${brandNew.length} glass objects have no current equivalent:`);
console.log(`  ${brandNew.join(", ")}`);
if (withheld.length > 0) console.log(`\nwithheld: ${withheld.join(", ")}`);
