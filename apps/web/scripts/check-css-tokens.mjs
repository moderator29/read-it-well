/**
 * Layer-1 guard for the stylesheets.
 *
 * ESLint cannot see CSS, and the component stylesheets are where half the
 * platform's colour actually lives: `src/app/css/*.css` is nineteen partials
 * and `globals.css` states in its own header that nothing below it may
 * introduce a raw colour. Nothing had ever checked that claim.
 *
 * WHAT THIS CHECKS, AND WHY IT IS ONLY THIS.
 *
 * One thing: a layer-1 palette token being read from a stylesheet that is not
 * the token file itself.
 *
 * It is FATAL for `src/app/css/**`, the nineteen design-system partials, which
 * are at zero as of this commit, so the check holds a real line and the next
 * `var(--nf-electric-300)` in a partial fails the build. It is a COUNTED
 * WARNING for the four stylesheets that sit loose in `src/app` (side-nav,
 * social, social-feed, settings-rows), which are owned by other workstreams
 * and still carry one between them. Move that one and promote them: the only
 * change needed is deleting the `SOFT` list below.
 *
 * It deliberately does NOT check raw rgb() and hex in these files. There are
 * several hundred of them, almost all white and black at an alpha (the rims,
 * the floors, the hover washes), and a check that fails on a clean checkout is
 * a check somebody deletes rather than obeys. That is the same reasoning the
 * React Compiler rules in eslint.config.mjs are held at warn for. Those
 * literals are a real debt and they are counted rather than enforced, so the
 * number is visible and can only go down.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const ROOTS = ["src/app"];

/**
 * Stylesheets whose violations are reported but do not fail the build, because
 * they belong to other workstreams. Everything under src/app/css is fatal.
 */
const SOFT = (path) => path.startsWith("src/app/") && !path.startsWith("src/app/css/");

const LAYER_ONE =
  /--nf-(?:ink|mist|royal|electric|cyan|crimson|emerald|rose|sky)-\d{2,3}\b/g;
const RAW_COLOUR = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|\b(?:rgba?|hsla?)\s*\(/g;

/** Strip /* … *\/ comments, so a note explaining a literal is not a literal. */
function withoutComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "");
}

function cssFiles(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) cssFiles(path, found);
    else if (entry.endsWith(".css")) found.push(path);
  }
  return found;
}

const failures = [];
const soft = [];
let rawColours = 0;

for (const dir of ROOTS) {
  for (const file of cssFiles(join(ROOT, dir))) {
    const source = withoutComments(readFileSync(file, "utf8"));
    const where = relative(ROOT, file);

    source.split("\n").forEach((line, index) => {
      for (const hit of line.matchAll(LAYER_ONE)) {
        (SOFT(where) ? soft : failures).push(`${where}:${index + 1}  ${hit[0]}`);
      }
    });

    rawColours += [...source.matchAll(RAW_COLOUR)].length;
  }
}

if (soft.length > 0) {
  console.warn(
    `\ncss tokens: ${soft.length} layer-1 reference(s) in stylesheets outside ` +
      "src/app/css. Reported, not enforced, because those files belong to other " +
      "workstreams:",
  );
  for (const entry of soft) console.warn(`  ${entry}`);
  console.warn("");
}

if (failures.length > 0) {
  console.error(
    "\nLayer-1 palette tokens in a stylesheet (ADR-002). Stylesheets read the\n" +
      "layer-2 semantic tokens, exactly as components do. The raw ramps exist so\n" +
      "the semantic layer has somewhere to resolve to, not so surfaces can read\n" +
      "them directly.\n",
  );
  for (const failure of failures) console.error(`  ${failure}`);
  console.error(`\n${failures.length} violation(s).\n`);
  process.exit(1);
}

console.log(
  `css tokens: 0 layer-1 references under src/app/css. ${rawColours} raw colour ` +
    "literals remain across the stylesheets (counted, not yet enforced).",
);
