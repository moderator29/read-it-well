/**
 * File the founder's reference photography as product assets.
 *
 * The plates in `docs/design/references/` are multi-megabyte PNG renders. The
 * product never ships one raw:
 * this script writes each keeper photograph, named per the catalogue, as a
 * compressed JPEG and a WebP under `apps/web/public/brand/photos/`, capped at
 * 1920px on the long edge, plus a 640px twin for cards, and copies the eight
 * scene plates under the names `build-scene-manifest.mjs` accepts so
 * `MediaFrame` wires them without a code change.
 *
 *   node scripts/build-reference-plates.mjs
 *
 * Idempotent: a target that already exists and is newer than its source is
 * skipped. It never fails the build and it never touches the references.
 */
import sharp from "sharp";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const REFS = path.join(ROOT, "docs/design/references");
const PHOTOS = path.join(ROOT, "apps/web/public/brand/photos");
const SCENES = path.join(ROOT, "apps/web/public/brand/scenes");

/** Catalogue section 3 keepers, canonical names without the photo-/asset- prefix. */
const PLATES = {
  "bg-blue-wave": "0F25E224-53E5-42FD-9F0F-60836CEFBE51",
  "tower-entrance-dusk": "09A476D8-E963-4950-B2B9-8EE2A741DFBF",
  "villa-pool-skyline-01": "0AE47CBC-9077-4916-A74F-593572E05AB3",
  "skyline-waterfront-dusk": "0CC96E00-82D2-4DEC-897C-B6FAC4A2E489",
  "villa-pool-skyline-02": "1362BF36-CD60-42F9-BD75-8F9CF4695986",
  "villa-exterior-sunset": "2298F702-D31B-4CA4-9D38-813E6248F8F3",
  "villa-pool-terrace": "2A0FAC02-08EA-4D04-88C7-DE1BB18626AF",
  "resort-pool-deck": "30C3ADA1-92CB-4520-9110-E1A9326A17CF",
  "bedroom-01": "337771A2-AAEF-41BB-97FD-3B9C86100B7A",
  "villa-pool-portrait": "34695B18-30CA-42F1-BF00-ECD9C03F32A4",
  "bedroom-02": "5195AC07-1FB4-4F5F-8671-32744C4F72B7",
  "bathroom-01": "56087700-7424-4B67-AFEB-B3DAEF6BDBA2",
  "living-room-dusk": "710CD2DE-10F0-4BD7-AFB1-BDA561C910C5",
  "restaurant-01": "82AC015B-DC21-4E35-B5D5-241753DC0370",
  "living-room-day": "A379C6E6-8211-40E9-B4BA-27066187D6FB",
  "skyline-bridge-dusk": "BD5F3AE7-9A56-4E99-974D-52BFB26A22D1",
  "villa-exterior-gate": "C1A62A8D-65EC-45B9-9355-4F0EB60AB8C7",
  "restaurant-02-lounge": "DD8EFFA8-F0A8-4F54-A9FA-68FD802EE722",
  "terrace-lounge-night": "E108E610-17E5-4D49-B740-98C7683A9569",
  "restaurant-03-bar": "EBC8FC19-8486-465F-A573-CDCDA08EF5F9",
};

/** Scene name to plate, the eight `build-scene-manifest.mjs` accepts. */
const SCENE_PLATES = {
  house: "villa-exterior-gate",
  villa: "villa-pool-skyline-02",
  terrace: "villa-exterior-sunset",
  shortlet: "villa-pool-terrace",
  flats: "tower-entrance-dusk",
  tower: "skyline-waterfront-dusk",
  hotel: "resort-pool-deck",
  shop: "restaurant-03-bar",
};

async function fresh(target, source) {
  try {
    const [t, s] = await Promise.all([stat(target), stat(source)]);
    return t.mtimeMs >= s.mtimeMs;
  } catch {
    return false;
  }
}

async function write(source, target, width, format) {
  if (await fresh(target, source)) return "kept";
  const image = sharp(source).resize({ width, withoutEnlargement: true });
  if (format === "jpg") await image.jpeg({ quality: 78, mozjpeg: true }).toFile(target);
  else await image.webp({ quality: 74 }).toFile(target);
  return "wrote";
}

await mkdir(PHOTOS, { recursive: true });
await mkdir(SCENES, { recursive: true });

for (const [name, uuid] of Object.entries(PLATES)) {
  const source = path.join(REFS, `${uuid}.png`);
  try {
    await stat(source);
  } catch {
    console.warn(`plates: missing ${uuid}.png for ${name}, skipped`);
    continue;
  }
  const results = await Promise.all([
    write(source, path.join(PHOTOS, `${name}.jpg`), 1920, "jpg"),
    write(source, path.join(PHOTOS, `${name}.webp`), 1920, "webp"),
    write(source, path.join(PHOTOS, `${name}-640.jpg`), 640, "jpg"),
  ]);
  console.log(`plates: ${name} ${results.join("/")}`);
}

for (const [scene, name] of Object.entries(SCENE_PLATES)) {
  const source = path.join(REFS, `${PLATES[name]}.png`);
  const r = await write(source, path.join(SCENES, `${scene}.jpg`), 1600, "jpg");
  console.log(`scenes: ${scene} <- ${name} ${r}`);
}
