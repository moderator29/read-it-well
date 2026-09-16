/**
 * Layer-1 guard, raw-literal guard and unresolved-token guard for the
 * stylesheets.
 *
 * ESLint cannot see CSS, and the component stylesheets are where half the
 * platform's colour actually lives: `src/app/css/*.css` is nineteen partials
 * and `globals.css` states in its own header that nothing below it may
 * introduce a raw colour. Nothing had ever checked that claim.
 *
 * THREE CHECKS. The first two are about where a value came from. The third is
 * about whether a value exists at all, and it is here rather than in ESLint for
 * a reason given in full below.
 *
 * ---------------------------------------------------------------------------
 * 1. A LAYER-1 PALETTE TOKEN read from a stylesheet that is not the token file.
 *
 * FATAL for `src/app/css/**`, the nineteen design-system partials, which are at
 * zero. A COUNTED WARNING for the four stylesheets that sit loose in `src/app`
 * (side-nav, social, social-feed, settings-rows), which are owned by other
 * workstreams. Promote them by deleting the `SOFT` predicate below.
 *
 * ---------------------------------------------------------------------------
 * 2. A RAW COLOUR LITERAL, `#0C39EF` or `rgb(...)`, in a stylesheet.
 *
 * FATAL for `src/app/css/**` AS OF THIS COMMIT, and this is a change.
 *
 * It used to be counted and not enforced anywhere, and the reasoning was
 * written here at some length: there were several hundred of them, almost all
 * white and black at an alpha, and "a check that fails on a clean checkout is a
 * check somebody deletes rather than obeys". That was correct while the number
 * was several hundred. The number under `src/app/css` is now ZERO - the rims,
 * the floors, the hover washes and the scrims all went onto the wash, shade,
 * well, inverse and on-paper token families - so the argument has run out. A
 * guard that could hold a real line and does not is just a number in a log.
 *
 * The four loose stylesheets stay COUNTED, because their 74 literals belong to
 * another workstream and failing their build on this one's behalf is how the
 * check gets deleted. Same predicate, same promotion path, same reasoning as
 * check 1. The count is printed either way so it can only go down.
 *
 * ---------------------------------------------------------------------------
 * 3. A `var(--nf-...)` REFERENCING A PROPERTY THAT IS DEFINED NOWHERE, with no
 *    fallback. FATAL for `src/app/css/**`.
 *
 * THIS IS THE CHECK THAT WOULD HAVE CAUGHT `.nf-feedtabs`, and it is worth
 * setting out what happened, because the failure mode is the point.
 *
 * `chips.css` drew the feed's segmented tab track like this:
 *
 *     background: var(--nf-surface-glass);
 *     backdrop-filter: blur(var(--nf-blur-sm));
 *
 * Neither token exists. There is no `--nf-surface-glass` and no `--nf-blur-sm`
 * in `packages/design-tokens/src/tokens.css`, and there never has been; the
 * fill is `--nf-glass-fill` and the blur ladder is `--nf-glass-blur-thin`,
 * `--nf-glass-blur` and `--nf-glass-blur-strong`. Somebody typed two plausible
 * names.
 *
 * What CSS does with an undefined custom property and no fallback is the whole
 * problem: the `var()` resolves to the guaranteed-invalid value, which makes
 * the ENTIRE DECLARATION invalid at computed-value time, which for `background`
 * means it falls back to the initial value. So the track painted TRANSPARENT
 * and the backdrop filter was dropped outright. Directly above the rule sat a
 * long comment describing "one track, three equal segments, and the live one
 * carries a solid brand pill that moves along the track". There was no track.
 * Three bare labels and a pill.
 *
 * Nothing reported it, and nothing could have. The stylesheet parses. The page
 * renders. No console warning exists for this in any browser, because an
 * unknown custom property is legal CSS - it might be set later by script, by an
 * inline style, or by a class that has not applied yet. The only signal is a
 * control that looks slightly wrong to somebody who already knew what it was
 * supposed to look like. It was found by an audit that was looking for
 * something else entirely.
 *
 * WHY THIS IS A SCRIPT CHECK AND NOT AN ESLINT RULE, which is what was
 * originally asked for.
 *
 * Two reasons, and the first is decisive on its own.
 *
 * ESLINT DOES NOT SEE CSS. The bug was in a stylesheet. An `nf/` rule walking
 * string literals in TS and TSX would not have caught this one, nor the next
 * one, because every glass surface, every chrome bar and every elevation rung
 * in this product is declared in `src/app/css/*.css`. Writing the rule where it
 * cannot look at the file the bug was in would be doing the reassuring half of
 * the job, which is the same shape of mistake as a lint rule that was named in
 * three documents and never written.
 *
 * AND RESOLUTION IS WHOLE-TREE, WHICH IS THE WRONG SHAPE FOR A LINTER. Whether
 * `var(--nf-x)` is safe cannot be answered from the file containing it. The
 * property may be defined in `tokens.css`, or declared by an `@property` block
 * in another partial, or written onto an element at runtime by a component -
 * `--nf-sheet-y` comes from `Sheet.tsx`, `--nf-rise-i` from a `home/page.tsx`
 * style prop, `--nf-tab-i` from `MobileTabBar.tsx`. ESLint lints one file at a
 * time and caches per file; a rule that reads the rest of the repository at
 * module load is a rule whose result depends on state it did not declare and
 * which goes stale the moment a token is added. This script already walks the
 * whole tree, so the answer is a set lookup rather than an architecture.
 *
 * WHAT COUNTS AS DEFINED, deliberately generously, because a false positive
 * here fails the build on working code:
 *   - a declaration anywhere in `packages/design-tokens/**\/*.css`
 *   - a declaration in any stylesheet under `src/app`
 *   - an `@property --nf-x` block in any of those
 *   - the name appearing as a quoted string anywhere in `src/**\/*.{ts,tsx}`,
 *     which covers `style={{ "--nf-x": v }}` and `el.style.setProperty("--nf-x")`
 *
 * A `var(--nf-x, something)` with a fallback is never reported, whether or not
 * `--nf-x` resolves. That is the documented way to say "this may not be set",
 * and it is what makes the declaration survive either way.
 *
 * AND IT CHECKS THE TOKEN PACKAGE ITSELF, which is where it matters most.
 *
 * Two surfaces there can go stale in silence and both are checked:
 *
 * `tokens.css` defines tokens IN TERMS OF other tokens -
 * `--nf-glass-shadow: var(--nf-elev-2)`, `--nf-font-display:
 * var(--nf-font-poppins), ...`. A typo in one of those breaks every rule
 * downstream of it and the stylesheet still parses.
 *
 * `index.ts` is a TypeScript MIRROR of the token names, as strings:
 * `contentInverse: "var(--nf-content-inverse)"`. TypeScript cannot check a
 * string against a CSS file, so deleting a token leaves the mirror compiling
 * happily and exporting a `var()` that resolves to nothing. That file's own
 * comments record it having drifted before - eight inks and five mists left
 * holding pre-rebrand purple-tinted greys, so anything drawing an SVG from it
 * painted the old brand - which is precisely this failure with a different
 * cause. This sweep would have caught the deletions the same day.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const TOKENS = fileURLToPath(new URL("../../../packages/design-tokens/src", import.meta.url));
const ROOTS = ["src/app"];

/**
 * Stylesheets whose violations are reported but do not fail the build, because
 * they belong to other workstreams. Everything under src/app/css is fatal.
 */
const SOFT = (path) => path.startsWith("src/app/") && !path.startsWith("src/app/css/");

const LAYER_ONE =
  /--nf-(?:ink|mist|royal|electric|cyan|crimson|emerald|rose|sky)-\d{2,3}\b/g;
const RAW_COLOUR = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|\b(?:rgba?|hsla?)\s*\(/g;

/** A custom property being DEFINED: `--nf-x:` or `@property --nf-x`. */
const DEFINITION = /(?:@property\s+)?(--nf-[a-z0-9-]+)\s*[:{]/g;
/** The same name written as a quoted string, which is how JS sets one. */
const JS_DEFINITION = /["'`](--nf-[a-z0-9-]+)["'`]/g;
/** `var(--nf-x` plus whatever comes next, so the fallback can be detected. */
const REFERENCE = /var\(\s*(--nf-[a-z0-9-]+)\s*([,)])/g;

/** Strip /* … *\/ comments, so a note explaining a literal is not a literal. */
function withoutComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "");
}

function filesUnder(dir, extensions, found = []) {
  if (!existsSync(dir)) return found;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".next")) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) filesUnder(path, extensions, found);
    else if (extensions.some((e) => entry.endsWith(e))) found.push(path);
  }
  return found;
}

/* ------------------------------------------------------- what is defined */

const defined = new Set();

for (const file of filesUnder(TOKENS, [".css"])) {
  const source = withoutComments(readFileSync(file, "utf8"));
  for (const hit of source.matchAll(DEFINITION)) defined.add(hit[1]);
}
for (const dir of ROOTS) {
  for (const file of filesUnder(join(ROOT, dir), [".css"])) {
    const source = withoutComments(readFileSync(file, "utf8"));
    for (const hit of source.matchAll(DEFINITION)) defined.add(hit[1]);
  }
}
/* Components write custom properties onto elements. `--nf-sheet-y`,
   `--nf-rise-i`, `--nf-tab-i`, `--nf-undo-window` and `--nf-moment-color` all
   arrive this way and are correct; the stylesheet is the consumer, not the
   owner. Comments are not stripped here because a name inside a comment in a
   component file is still evidence the name is real. */
for (const file of filesUnder(join(ROOT, "src"), [".ts", ".tsx"])) {
  const source = readFileSync(file, "utf8");
  for (const hit of source.matchAll(JS_DEFINITION)) defined.add(hit[1]);
}

/* ------------------------------------------------------------ the checks */

const failures = [];
const soft = [];
const unresolved = [];
const unresolvedSoft = [];
let rawColoursFatal = 0;
let rawColoursSoft = 0;

for (const dir of ROOTS) {
  for (const file of filesUnder(join(ROOT, dir), [".css"])) {
    const source = withoutComments(readFileSync(file, "utf8"));
    const where = relative(ROOT, file);
    const isSoft = SOFT(where);

    source.split("\n").forEach((line, index) => {
      for (const hit of line.matchAll(LAYER_ONE)) {
        (isSoft ? soft : failures).push(`${where}:${index + 1}  ${hit[0]}`);
      }
      for (const hit of line.matchAll(REFERENCE)) {
        /* A fallback is the documented way to say "this may not be set", and it
           keeps the declaration valid either way, so it is never reported. */
        if (hit[2] === ",") continue;
        if (defined.has(hit[1])) continue;
        (isSoft ? unresolvedSoft : unresolved).push(`${where}:${index + 1}  var(${hit[1]})`);
      }
    });

    const raw = [...source.matchAll(RAW_COLOUR)].length;
    if (isSoft) rawColoursSoft += raw;
    else rawColoursFatal += raw;
  }
}

/*
 * The token package's own two surfaces. Fatal without exception: this IS the
 * design system, and a token that resolves to nothing here is wrong everywhere
 * downstream at once. `index.ts` is scanned WITHOUT stripping comments, because
 * a token name quoted in a comment there is still a claim about what exists.
 */
for (const file of filesUnder(TOKENS, [".css", ".ts"])) {
  const isCss = file.endsWith(".css");
  const source = isCss ? withoutComments(readFileSync(file, "utf8")) : readFileSync(file, "utf8");
  const where = relative(ROOT, file);
  source.split("\n").forEach((line, index) => {
    for (const hit of line.matchAll(REFERENCE)) {
      if (hit[2] === ",") continue;
      if (defined.has(hit[1])) continue;
      unresolved.push(`${where}:${index + 1}  var(${hit[1]})`);
    }
  });
}

/* ------------------------------------------------------------ the report */

if (soft.length > 0 || unresolvedSoft.length > 0 || rawColoursSoft > 0) {
  console.warn(
    "\ncss tokens: reported, not enforced, because these stylesheets belong to " +
      "other workstreams:",
  );
  for (const entry of soft) console.warn(`  layer-1        ${entry}`);
  for (const entry of unresolvedSoft) console.warn(`  unresolved     ${entry}`);
  if (rawColoursSoft > 0) {
    console.warn(`  raw colour     ${rawColoursSoft} literal(s) across src/app/*.css`);
  }
  console.warn("");
}

let failed = false;

if (failures.length > 0) {
  failed = true;
  console.error(
    "\nLayer-1 palette tokens in a stylesheet (ADR-002). Stylesheets read the\n" +
      "layer-2 semantic tokens, exactly as components do. The raw ramps exist so\n" +
      "the semantic layer has somewhere to resolve to, not so surfaces can read\n" +
      "them directly.\n",
  );
  for (const failure of failures) console.error(`  ${failure}`);
  console.error(`\n${failures.length} violation(s).\n`);
}

if (unresolved.length > 0) {
  failed = true;
  console.error(
    "\nA var() reading a custom property that is defined NOWHERE, with no\n" +
      "fallback. This does not degrade: an unresolved var() with no fallback\n" +
      "makes the whole declaration invalid at computed-value time, so the\n" +
      "property falls back to its initial value and the rule silently draws\n" +
      "nothing. No browser warns about it. `.nf-feedtabs` painted a transparent\n" +
      "track with no blur this way, under a comment describing the track.\n\n" +
      "Either the name is a typo - check it against\n" +
      "packages/design-tokens/src/tokens.css - or the property is genuinely set\n" +
      "at runtime, in which case give it a fallback so the declaration survives\n" +
      "when it is not: var(--nf-thing, <sensible default>).\n",
  );
  for (const entry of unresolved) console.error(`  ${entry}`);
  console.error(`\n${unresolved.length} unresolved reference(s).\n`);
}

if (rawColoursFatal > 0) {
  failed = true;
  console.error(
    "\nRaw colour literal under src/app/css. This directory reached zero and is\n" +
      "enforced from that point: a literal cannot follow the theme, and dark is\n" +
      "the default theme rather than the only one. Use a layer-2 token, or add\n" +
      "one to packages/design-tokens and answer it in BOTH theme blocks.\n" +
      `\n${rawColoursFatal} literal(s).\n`,
  );
}

if (failed) process.exit(1);

console.log(
  `css tokens: src/app/css is clean - 0 layer-1 references, 0 raw colour ` +
    `literals, 0 unresolved var() references. ${rawColoursSoft} raw colour ` +
    "literal(s) remain in the four stylesheets outside it (counted, not yet " +
    "enforced).",
);
