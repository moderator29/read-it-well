// Emit the stroked UiIcon set as standalone SVG files.
//
// WHY THIS EXISTS. The stroked set is real vector artwork, but it lived only as
// JSX inside `apps/web/src/design-system/icons/UiIcon.tsx`, which no design tool
// can open. The next person who needs "the search glyph, but bigger" or who
// wants to hand the set to an illustrator has nothing to give them, so they
// trace a PNG screenshot and the platform quietly grows a second, slightly wrong
// copy of its own icon. That is the failure R-19 is about.
//
// The TSX stays the single source of truth. This script derives the files from
// it, so the checked-in SVGs can never disagree with what ships: re-run it and
// diff. The JSX children are already valid SVG markup (path, circle, rect with
// the same attribute names), so nothing is redrawn here, only wrapped.
//
// Usage: node scripts/build-icon-vectors.mjs [--check]
//   --check  writes nothing and exits non-zero if the checked-in files drifted.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const source = join(root, "apps/web/src/design-system/icons/UiIcon.tsx");
const outDir = join(root, "assets/icons/ui");

const src = readFileSync(source, "utf8");

// The stroke weight and the grid come from the component, never from a guess
// here, so a change to either lands in the exported files on the next run.
const strokePx = Number(/UI_ICON_STROKE_PX = ([\d.]+)/.exec(src)?.[1]);
if (!Number.isFinite(strokePx)) {
  console.error("Could not read UI_ICON_STROKE_PX from UiIcon.tsx.");
  process.exit(1);
}

// The export renders at the top of the scale, where the grid number and the
// rendered pixel weight coincide most closely.
const EDGE = 24;
const strokeWidth = Number(((strokePx * 24) / EDGE).toFixed(3));

const bodyStart = src.indexOf("const PATHS");
const bodyEnd = src.indexOf("\n};", bodyStart);
if (bodyStart < 0 || bodyEnd < 0) {
  console.error("Could not locate the PATHS table in UiIcon.tsx.");
  process.exit(1);
}
// Comments come out BEFORE the split, not after. Two of them carry a comma at
// bracket depth zero ("Drawn for the rail and tab bar: quiet, organic
// geometry"), which split their own entry in half and silently dropped the
// `home` and `sliders` glyphs from the export.
const table = src
  .slice(src.indexOf("{", bodyStart) + 1, bodyEnd)
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/[^\n]*$/gm, "");

/*
 * Split the table on its top-level `key: value,` entries. Depth counting rather
 * than a regex, because several entries are fragments holding multiple elements
 * and one contains a ternary-free but comma-bearing `d` attribute.
 */
const entries = [];
let depth = 0;
let start = 0;
for (let i = 0; i < table.length; i += 1) {
  const ch = table[i];
  if (ch === "(" || ch === "<" || ch === "{") depth += 1;
  else if (ch === ")" || ch === "}") depth -= 1;
  else if (ch === ">") depth -= 1;
  else if (ch === "," && depth === 0) {
    entries.push(table.slice(start, i));
    start = i + 1;
  }
}
entries.push(table.slice(start));

const icons = [];
for (const raw of entries) {
  const chunk = raw.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const colon = chunk.indexOf(":");
  if (colon < 0) continue;
  const key = chunk
    .slice(0, colon)
    .trim()
    .replace(/^["']|["']$/g, "");
  if (!key || /[^a-z-]/.test(key)) continue;
  let value = chunk.slice(colon + 1).trim();
  if (value.startsWith("(")) value = value.slice(1, value.lastIndexOf(")")).trim();
  value = value.replace(/^<>/, "").replace(/<\/>$/, "").trim();
  const body = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `  ${line}`)
    .join("\n");
  if (!body) continue;
  icons.push({ key, body });
}

if (icons.length === 0) {
  console.error("Parsed zero icons. Refusing to write an empty set.");
  process.exit(1);
}

const check = process.argv.includes("--check");
mkdirSync(outDir, { recursive: true });

let drift = 0;
for (const { key, body } of icons) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${EDGE}" height="${EDGE}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
${body.replace(/strokeWidth=/g, "stroke-width=").replace(/strokeLinecap=/g, "stroke-linecap=")}
</svg>
`;
  const file = join(outDir, `${key}.svg`);
  const existing = existsSync(file) ? readFileSync(file, "utf8") : null;
  if (existing === svg) continue;
  drift += 1;
  if (check) {
    console.error(`drifted: assets/icons/ui/${key}.svg`);
  } else {
    writeFileSync(file, svg);
  }
}

if (check) {
  if (drift > 0) {
    console.error(`${drift} vector source(s) no longer match UiIcon.tsx.`);
    process.exit(1);
  }
  console.log(`${icons.length} vector sources match UiIcon.tsx.`);
} else {
  console.log(`wrote ${icons.length} vector sources to assets/icons/ui (${drift} changed)`);
}
