/**
 * Where the map's imagery comes from, and who gets credited for it.
 *
 *   node apps/web/tests/map-tiles.spec.mjs
 *
 * Self-contained: no runner, no dev server, no database. It imports the REAL
 * provider module and drives it both ways, because this is a LICENSING rule
 * before it is a rendering one and a licensing rule is worth a guard.
 *
 * CARTO's public basemaps are free and non-commercial use only. A marketplace
 * taking a booking fee is a commercial use, so the platform must be able to
 * move off them with one environment variable - and when it does, the credit
 * line has to move with it, because both providers require attribution and
 * they require different attribution. A provider swap that silently kept the
 * old credit replaces one licence breach with another.
 *
 * Node strips the TypeScript itself (22.6+).
 */

import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODULE = pathToFileURL(path.join(HERE, "..", "src", "lib", "maps", "tiles.ts")).href;

let failures = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}${detail ? `\n          ${detail}` : ""}`);
  }
}

/* ------------------------------------------------- with no key: CARTO, flagged */

delete process.env.NEXT_PUBLIC_MAPTILER_KEY;
const free = await import(`${MODULE}?free`);

for (const theme of ["light", "dark"]) {
  const p = free.tileProvider(theme);
  check(`${theme}: falls back to CARTO`, p.id === "carto", p.url);
  check(`${theme}: the URL is a real tile template`, /\{z\}\/\{x\}\/\{y\}/.test(p.url), p.url);
  check(`${theme}: it is flagged as non-commercial`, p.nonCommercial === true);
  check(
    `${theme}: CARTO and OpenStreetMap are both credited`,
    p.credits.some((c) => c.label === "CARTO") &&
      p.credits.some((c) => c.label === "OpenStreetMap"),
    JSON.stringify(p.credits.map((c) => c.label)),
  );
  check(
    `${theme}: every credit carries a link somebody can follow`,
    p.credits.every((c) => /^https:\/\//.test(c.href)),
  );
}
check("with no key, hasCommercialTiles() is false", free.hasCommercialTiles() === false);
check(
  "the light and dark styles differ",
  free.tileProvider("light").url !== free.tileProvider("dark").url,
);

/* ------------------------------------------ with a key: MapTiler, credited right */

process.env.NEXT_PUBLIC_MAPTILER_KEY = "test-key-not-a-real-one";
const paid = await import(`${MODULE}?paid`);

for (const theme of ["light", "dark"]) {
  const p = paid.tileProvider(theme);
  check(`${theme}: a key moves the map to MapTiler`, p.id === "maptiler", p.url);
  check(`${theme}: the key reaches the URL`, p.url.includes("test-key-not-a-real-one"));
  check(`${theme}: it is no longer flagged non-commercial`, p.nonCommercial === false);
  check(
    `${theme}: the credit moves to MapTiler, with OpenStreetMap kept`,
    p.credits[0].label === "MapTiler" && p.credits.some((c) => c.label === "OpenStreetMap"),
    JSON.stringify(p.credits.map((c) => c.label)),
  );
  check(`${theme}: CARTO is no longer credited`, !p.credits.some((c) => c.label === "CARTO"));
  check(`${theme}: no CARTO host is left in the URL`, !p.url.includes("cartocdn"));
}
check("with a key, hasCommercialTiles() is true", paid.hasCommercialTiles() === true);

/* --------------------------------------------------------- the component is wired */

const { readFileSync } = await import("node:fs");
const canvas = readFileSync(path.join(HERE, "..", "src/components/app/search/MapCanvas.tsx"), "utf8");
check(
  "the map reads the provider rather than a hard-coded URL",
  /tileProvider\(/.test(canvas) && !/cartocdn/.test(canvas),
  "a literal CARTO host is still in MapCanvas.tsx",
);
check(
  "the credit line is rendered from the provider, not hard-coded",
  /credits\.map\(/.test(canvas),
);
check(
  "the non-commercial state is said out loud to whoever runs the build",
  /warnIfNonCommercialTiles\(\)/.test(canvas),
);

console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
