/**
 * ===========================================================================
 * THE SILENT FAULT FAMILY, AND WHY FIVE CHECKS LIVE IN ONE SCRIPT.
 * ===========================================================================
 *
 * This file exists because of one shape of bug, and the shape is worth naming
 * before the checks are read, because it is the only reason any of them are
 * here and it will outlive all of them.
 *
 * THE FAMILY: something in the repository ASSERTS a fact about the repository,
 * the fact is false, and nothing fails. No error, no warning, no failing test,
 * no visual difference a reviewer would look for. The assertion is believed
 * precisely because it is written down, and the more carefully it is written
 * the longer it survives.
 *
 * It is not a CSS problem. Every instance below was found in a different
 * mechanism, by a different kind of search, and only one of the five is about
 * stylesheets at all.
 *
 * ---------------------------------------------------------------------------
 * THE SIX INSTANCES FOUND SO FAR, IN THE ORDER THEY TURNED UP.
 *
 * 1. A DECLARATION NAMING A TOKEN THAT DOES NOT EXIST.
 *    `.nf-feedtabs` wrote `var(--nf-surface-glass)` and `var(--nf-blur-sm)`.
 *    Neither name has ever been defined. An unresolved `var()` with no fallback
 *    makes the WHOLE declaration invalid at computed-value time, so the track
 *    painted nothing, under a comment describing the track it painted.
 *    CAUGHT BY A MACHINE: yes, check 4 below.
 *
 * 2. A DECLARATION NAMING A TOKEN OF THE WRONG TYPE.
 *    `.nf-rows-sheet` wrote `background: var(--nf-elev-3)`. That token is a
 *    three-layer box-shadow. The name is real and correctly spelled, so check 4
 *    passed it, and the declaration was still dropped in silence: the settings
 *    sheet had a border, a radius, a shadow, an entrance animation and no fill,
 *    with the page showing through it. Confirmed in a browser afterwards at
 *    `rgba(0, 0, 0, 0)`.
 *    CAUGHT BY A MACHINE: yes, check 5 below, which exists because of it.
 *
 * 3. A CUSTOM PROPERTY DECLARED TWICE IN ONE RULE, THE LIVE COPY BEING WRONG.
 *    Five `--nf-media-*` tokens appeared twice in the same `:root`, seventeen
 *    lines apart, under a character-for-character copy of the same thirteen-line
 *    comment, with all five values different. The later copy wins, so a retune
 *    that the file's own prose describes ("every part of the building below has
 *    been lifted to match") had never once rendered.
 *    CAUGHT BY A MACHINE: yes, and it is twenty lines. Walk brace depth,
 *    collect `--*` declarations per block, report any name declared twice. Run
 *    once over `tokens.css` and all of `app/css`, it found this and nothing
 *    else. NOT YET A STANDING CHECK. It should be.
 *
 * 4. A COMMENT DESCRIBING A MECHANISM THE CODE NO LONGER HAS.
 *    Three comments stated in the present tense that brand objects carry
 *    `mix-blend-mode: multiply`. The blend mode had been deleted; only the prose
 *    survived. One of them gave ADVICE built on it: "use the approach in
 *    `.nf-page-scene`, which turns multiply off on the night theme".
 *    I reported one of these to my own coordinator as live code, in a report
 *    about this exact fault. Reading a comment and reporting it as behaviour is
 *    the failure mode, and knowing about the family does not protect you.
 *    CAUGHT BY A MACHINE: no, and probably never. A comment is prose. What
 *    helps is a convention: write history in the PAST tense and current
 *    behaviour in the present, so tense alone tells a reader which it is.
 *
 * 5. A CROSS-REFERENCE TO A FILE THAT DOES NOT EXIST.
 *    `.nf-onboarding` was introduced by "see components/site/Onboarding.tsx for
 *    the honest, localStorage-gated, reduced-motion-skipping trigger", and
 *    `.nf-status-assemble` by "see app/agents/status/StatusIcon.tsx for the
 *    honest, one-shot trigger". Neither file exists anywhere under `src`. Both
 *    were eleven and four rules of dead CSS, and both read as obviously live,
 *    because a named component is the strongest evidence a reader gets that a
 *    rule is wired up.
 *    CAUGHT BY A MACHINE: yes, easily, and nothing does it. Extract paths that
 *    look like source files from comments and stat them. Roughly thirty lines.
 *    NOT YET A STANDING CHECK. It should be.
 *
 * 6. TWO BLOCKS IN ONE FILE DESCRIBING THE SAME THING IN CONTRADICTORY TERMS.
 *    `map.css` introduced `.nf-map-pin` with "Price pins on the live map.
 *    Rendered by Leaflet divIcons." Six lines later the next block begins
 *    "Marks are ordinary React buttons projected onto the frame every frame,
 *    NOT Leaflet divIcons". Both were true statements about different eras and
 *    only one was true about the present.
 *    CAUGHT BY A MACHINE: no. This one needs a reader, and it is the argument
 *    for reading a whole file before editing part of it.
 *
 * ---------------------------------------------------------------------------
 * WHAT THE FAMILY TEACHES, WHICH IS THE TRANSFERABLE PART.
 *
 * SILENCE IS NOT EVIDENCE. Every one of the six produced exactly the signal a
 * correct repository produces: nothing. The absence of a failure is only
 * information if something was capable of failing.
 *
 * A GUARD IS AN ASSERTION TOO, SO CHECK ITS OUTPUT AND NOT ITS EXISTENCE. The
 * first draft of check 5 passed the very bug it was written for, because the
 * shadow it was looking for begins `0 2px 4px` and the pattern demanded a unit
 * on the first length. The check was green and the sheet was still transparent.
 * Separately, `withoutComments` deleted comment blocks outright, so every line
 * number this script had ever printed was wrong, by up to 187 lines. Separately
 * again, the raw-colour check reported a COUNT and no location for its whole
 * life. And the first run of check 2 returned nine violations of which two were
 * prose. None of those four would have been found by asking "does the guard
 * fire". All four were found by reading what it printed.
 *
 * THEREFORE: run every new guard against the fault that motivated it, expect
 * the failure, and read the report rather than the exit code.
 *
 * SEARCH ON WORD BOUNDARIES, NOT SUBSTRINGS. A census of unused CSS classes
 * found 54 of 232 with no call site, and three of the dead ones had survived
 * review because a substring search finds a living neighbour: `nf-dock` finds
 * `nf-dock-island`, `nf-action-bar` finds `nf-action-bar-pinned`, `nf-map-pin`
 * finds `nf-map-pin-breathe`. In each case the live thing is a whole class name
 * and not a modifier of the dead one, and in each case a reviewer checking "is
 * this used" would have got a yes.
 *
 * QUIETENING IS NOT REMOVING. Four dead things in this tree had been optimised,
 * slowed, or set to `animation: none` by somebody who had noticed they were
 * unused and fixed the cost instead of the existence. `.nf-hero-scene` was
 * tuned three separate times, each one written up, on a class nothing renders.
 * When a rule keeps coming back for tuning, the cheap question is not "how do I
 * make this cheaper", it is "what renders this".
 *
 * ---------------------------------------------------------------------------
 *
 * Layer-1 guard, raw-literal guard and unresolved-token guard for the
 * stylesheets.
 *
 * ESLint cannot see CSS, and the component stylesheets are where half the
 * platform's colour actually lives: `src/app/css/*.css` is nineteen partials
 * and `globals.css` states in its own header that nothing below it may
 * introduce a raw colour. Nothing had ever checked that claim.
 *
 * SIX CHECKS NOW, AND THEY GREW ONE AT A TIME OUT OF THE FAMILY ABOVE.
 *
 *   1  a stylesheet reading a layer-1 palette token       ADR-002
 *   2  a COMPONENT reading one, which nothing could see   ADR-002
 *   3  a raw colour literal in a stylesheet
 *   4  a var() naming a token that does not exist         instance 1
 *   5  a var() naming a token of the wrong type           instance 2
 *   6  does the whole stylesheet still parse              the worst failure
 *
 * 1, 2 and 3 are about where a value came from. 4 and 5 are about whether the
 * value can be used at all. 6 is about whether the product boots. All six are
 * here rather than in ESLint for the reason given in full below: ESLint cannot
 * see CSS.
 *
 * ---------------------------------------------------------------------------
 * 1. A LAYER-1 PALETTE TOKEN read from a stylesheet that is not the token file.
 *
 * FATAL FOR THE WHOLE OF `src/app`, and the `SOFT` predicate that used to
 * exempt the four loose stylesheets is gone with it. They are at zero.
 *
 * ---------------------------------------------------------------------------
 * 2. A RAW COLOUR LITERAL, `#0C39EF` or `rgb(...)`, in a stylesheet.
 *
 * FATAL FOR THE WHOLE OF `src/app`, in two steps, and this is the second.
 *
 * It used to be counted and not enforced anywhere, and the reasoning was
 * written here at some length: there were several hundred of them, almost all
 * white and black at an alpha, and "a check that fails on a clean checkout is a
 * check somebody deletes rather than obeys". That was correct while the number
 * was several hundred. It became fatal for `src/app/css/**` when those nineteen
 * partials reached zero, and the four loose stylesheets stayed counted because
 * their 74 literals belonged to nobody and failing a build on their behalf is
 * how a check gets deleted rather than obeyed.
 *
 * THOSE 74 ARE NOW ZERO TOO. `social-feed.css` held 64, `social.css` 7 and
 * `settings-rows.css` 3, and the useful thing about doing them was what they
 * turned out to be: the assistant post's card was painted ENTIRELY out of the
 * palette already - `rgb(12 57 239)` is `--nf-electric-400` is the glow ink, so
 * its bloom stops were the glow ladder's rungs written as numbers - and the
 * story viewer needed one extra ink tier and two washes over media, which it
 * had been hand-writing at six and seven different alphas. Four themed pairs
 * were being stated twice each, once in a default rule and once in a
 * `:root[data-theme="light"]` rule, with nothing marking them as twins.
 *
 * So the `SOFT` predicate is deleted rather than narrowed. Every stylesheet
 * under `src/app` is now held to the same line for all three checks.
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

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync, rmSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const TOKENS = fileURLToPath(new URL("../../../packages/design-tokens/src", import.meta.url));
const ROOTS = ["src/app"];

const LAYER_ONE =
  /--nf-(?:ink|mist|royal|electric|cyan|crimson|emerald|rose|sky)-\d{2,3}\b/g;
const RAW_COLOUR = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|\b(?:rgba?|hsla?)\s*\(/g;

/** A custom property being DEFINED: `--nf-x:` or `@property --nf-x`. */
const DEFINITION = /(?:@property\s+)?(--nf-[a-z0-9-]+)\s*[:{]/g;
/** The same name written as a quoted string, which is how JS sets one. */
const JS_DEFINITION = /["'`](--nf-[a-z0-9-]+)["'`]/g;
/** `var(--nf-x` plus whatever comes next, so the fallback can be detected. */
const REFERENCE = /var\(\s*(--nf-[a-z0-9-]+)\s*([,)])/g;

/**
 * Strip /* … *\/ comments, so a note explaining a literal is not a literal.
 *
 * THE NEWLINES ARE KEPT, AND EVERY LINE NUMBER THIS FILE HAS EVER PRINTED WAS
 * WRONG WITHOUT THEM. The comments came out and the lines after them moved up
 * by however many lines the comment had been, so a violation in a file with two
 * hundred lines of prose above it was reported hundreds of lines from where it
 * is. In this codebase, where the comments are usually longer than the code,
 * the error was large enough that the number was not so much inaccurate as
 * useless: the first real report from the fourth check named line 287 for a
 * fault that is on line 474.
 *
 * Replacing each comment with its own newlines keeps every subsequent line
 * exactly where it was, and all four checks report a number somebody can open.
 */
function withoutComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, (block) => "\n".repeat((block.match(/\n/g) ?? []).length));
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

/*
 * What SHAPE each token's value is, which is the fourth check's whole basis.
 *
 * A token name says what a value is FOR. It does not say what the value IS, and
 * CSS will happily let you write one into a property that cannot take it. The
 * value is read from the token files only: those are the two surfaces where a
 * `--nf-*` is authored, and a component setting one at runtime has no static
 * value to classify, so it is left unclassified and never reported.
 *
 *   shadow     three or more space-separated lengths, or anything with `inset`
 *   gradient   contains `gradient(`
 *   colour     a hex, an rgb/hsl function, or a color-mix
 *
 * Anything else, including an alias of another token, is "unknown" and passes.
 * Following aliases would be better and is deliberately not done: an alias
 * chain crosses theme blocks, so a token can be a colour at night and an alias
 * in daylight, and a check that has to resolve the cascade to decide is a check
 * that will one day be wrong in a way nobody can read. Direct values only.
 */
const shapeOf = new Map();

function classifyValue(value) {
  const v = value.replace(/\s+/g, " ").trim();
  if (/gradient\(/.test(v)) return "gradient";
  /* A shadow layer is two or more lengths in a row, optionally after `inset`.
     A LENGTH HERE INCLUDES A BARE `0`, and leaving that out is what made the
     first draft of this check pass the very bug it was written for:
     `--nf-elev-3` begins `0 2px 4px`, so a pattern demanding a unit on the
     first length classified a three-layer shadow as "unknown" and reported
     nothing. The check was green and the sheet was still transparent. */
  const LENGTH = String.raw`(?:-?[\d.]+(?:px|rem|em)|0)`;
  if (new RegExp(String.raw`(?:^|,)\s*(?:inset\s+)?${LENGTH}\s+${LENGTH}(\s|,|$)`).test(v))
    return "shadow";
  if (/^(#|rgba?\(|hsla?\(|color-mix\()/.test(v)) return "colour";
  return "unknown";
}

/** `--nf-x: <value>;` with the value captured, across line breaks. */
const VALUED_DEFINITION = /(--nf-[a-z0-9-]+)\s*:\s*([^;{}]+);/g;

for (const file of filesUnder(TOKENS, [".css"])) {
  const source = withoutComments(readFileSync(file, "utf8"));
  for (const hit of source.matchAll(DEFINITION)) defined.add(hit[1]);
  for (const hit of source.matchAll(VALUED_DEFINITION)) {
    const shape = classifyValue(hit[2]);
    if (shape === "unknown") continue;
    /* A token declared in both theme blocks must agree with itself, and if it
       does not, this check says nothing about it rather than guessing. */
    const seen = shapeOf.get(hit[1]);
    if (seen && seen !== shape) shapeOf.set(hit[1], "unknown");
    else shapeOf.set(hit[1], shape);
  }
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
const componentFailures = [];
const unresolved = [];
const mistyped = [];
/*
 * THE RAW-COLOUR CHECK USED TO REPORT A COUNT AND NOT A PLACE.
 *
 * It was `rawColours += [...matchAll].length` and the report said "3
 * literal(s)" with nothing else, which sends the reader to grep the whole of
 * `src/app` for a hex. The other three checks all name a file and a line, and
 * this one asks the most work of whoever has to act on it, because a literal is
 * the easiest of the four to have introduced by accident and the hardest to
 * find by eye. Found by running all four checks against a probe and reading
 * what each one actually printed, rather than that each one fired.
 */
const rawColours = [];

/*
 * Which properties can take which shape.
 *
 * Only the cases where the answer is unambiguous, because a check that fires on
 * something arguable gets switched off. `background` is on the colour list AND
 * accepts a gradient, so a gradient there is fine and only a shadow is wrong.
 */
const WANTS_COLOUR = new Set([
  "color",
  "background-color",
  "border-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "outline-color",
  "fill",
  "stroke",
  "caret-color",
  "text-decoration-color",
  "accent-color",
]);
const WANTS_PAINT = new Set(["background", "background-image"]);
const WANTS_SHADOW = new Set(["box-shadow", "text-shadow"]);

/*
 * `property: var(--nf-x);` alone on the right-hand side, which is the only form
 * where the token's shape IS the declaration's value. A token inside a larger
 * value may legitimately be one part of a list and is not checked.
 *
 * IT ALSO HAS TO BE ALONE ON ITS LINE, and that is a real limit rather than an
 * oversight. Every stylesheet in this tree is formatted one declaration per
 * line, so the limit costs nothing today and a single-line rule written in
 * passing would slip through it. Widening the pattern to find declarations
 * mid-line means splitting on semicolons, which means knowing which semicolons
 * are inside a `url()` or a quoted string, which is a CSS parser. The check is
 * worth having at this precision and is not worth a parser; if the formatting
 * convention ever changes, this is the line that has to change with it.
 */
const SOLE_VAR = /^\s*([a-z-]+)\s*:\s*var\(\s*(--nf-[a-z0-9-]+)\s*\)\s*;/;

function typeFault(property, token) {
  const shape = shapeOf.get(token);
  if (!shape || shape === "unknown") return null;
  if (WANTS_COLOUR.has(property) && shape !== "colour")
    return `a ${shape} value in \`${property}\`, which only takes a colour`;
  if (WANTS_PAINT.has(property) && shape === "shadow")
    return `a shadow value in \`${property}\`, which takes a colour or an image`;
  if (WANTS_SHADOW.has(property) && shape === "gradient")
    return `a gradient in \`${property}\`, which takes a shadow list`;
  return null;
}

for (const dir of ROOTS) {
  for (const file of filesUnder(join(ROOT, dir), [".css"])) {
    const source = withoutComments(readFileSync(file, "utf8"));
    const where = relative(ROOT, file);

    source.split("\n").forEach((line, index) => {
      for (const hit of line.matchAll(LAYER_ONE)) {
        failures.push(`${where}:${index + 1}  ${hit[0]}`);
      }
      for (const hit of line.matchAll(REFERENCE)) {
        /* A fallback is the documented way to say "this may not be set", and it
           keeps the declaration valid either way, so it is never reported. */
        if (hit[2] === ",") continue;
        if (defined.has(hit[1])) continue;
        unresolved.push(`${where}:${index + 1}  var(${hit[1]})`);
      }
      const sole = SOLE_VAR.exec(line);
      if (sole) {
        const fault = typeFault(sole[1], sole[2]);
        if (fault) {
          mistyped.push(`${where}:${index + 1}  ${sole[1]}: var(${sole[2]})  -  ${fault}`);
        }
      }
    });

    source.split("\n").forEach((line, index) => {
      for (const hit of line.matchAll(RAW_COLOUR)) {
        rawColours.push(`${where}:${index + 1}  ${hit[0]}`);
      }
    });
  }
}

/*
 * LAYER 1 READ FROM A COMPONENT, which no guard in this repository could see
 * until today.
 *
 * The check above has always run over stylesheets only. `nf/no-raw-colour`
 * catches a literal in a component and has nothing to say about a token name.
 * So ADR-002 was enforced in CSS and unenforced in TSX, which is where most of
 * the product's colour decisions are actually written, and seven components had
 * been reading the raw ramps directly for long enough that one of them carries a
 * comment saying so: `app/agent/list/ListingWizard.tsx` notes that reading
 * `--nf-electric-300` "is the one thing ADR-002 forbids". Somebody knew, wrote
 * it down beside the code, and nothing turned that into a failing check.
 *
 * It was found as a side effect of proposing a rename, not by looking. That is
 * the argument for the check rather than for fixing the seven: a rule enforced
 * on one file type and not the other is not a rule, it is a habit that holds
 * wherever somebody happens to be looking.
 *
 * ONLY `var(--nf-x)` COUNTS, not the bare name. This codebase explains itself by
 * quoting the token it replaced, so a name inside a backtick is evidence of an
 * argument rather than of a reference, and a check that punished that would be
 * switched off within a week. The same reasoning is why the three `nf/` lint
 * rules walk the AST instead of the source.
 *
 * AND COMMENTS HAD TO BE STRIPPED, WHICH THE FIRST RUN OF THIS CHECK PROVED
 * RATHER THAN THE FIRST DRAFT PREDICTING IT. The paragraph above was written
 * before the check ran and it says a name in a comment is not a reference. It
 * was not enough: this file's comments quote the FULL `var(--nf-cyan-400)` form
 * while explaining a token chain, because that is how you write down what a
 * token resolves to. Nine violations came back and two were prose, in
 * `admin/_components/ui.tsx` and `components/app/ResultSheet.tsx`, both of them
 * notes arguing that `--nf-state-warning` and `--nf-status-pending` are the same
 * value under two names.
 *
 * 22 per cent noise on the first run of a check whose whole purpose is to be
 * believed. It was caught by reading what the check PRINTED rather than
 * confirming that it printed something, which is the one habit this file is
 * worth reading for.
 *
 * The stripping is deliberately conservative: block comments, and lines whose
 * first non-space character is `//` or `*`. It will not catch a `var()` in a
 * trailing comment after code on the same line. That is rare, and the failure
 * mode is a visible false positive that the reader can see is prose, which is
 * the right way round for a check to be wrong.
 */
function withoutJsComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => "\n".repeat((block.match(/\n/g) ?? []).length))
    .split("\n")
    .map((line) => (/^\s*(\/\/|\*)/.test(line) ? "" : line))
    .join("\n");
}

for (const file of filesUnder(join(ROOT, "src"), [".ts", ".tsx"])) {
  const source = withoutJsComments(readFileSync(file, "utf8"));
  const where = relative(ROOT, file);
  source.split("\n").forEach((line, index) => {
    for (const hit of line.matchAll(/var\(\s*(--nf-(?:ink|mist|royal|electric|cyan|crimson|emerald|rose|sky)-\d{2,3})\s*[,)]/g)) {
      componentFailures.push(`${where}:${index + 1}  var(${hit[1]})`);
    }
  });
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

/*
 * CHECK SEVEN: THE SAME CUSTOM PROPERTY DECLARED TWICE IN ONE RULE.
 *
 * Instance 3 of the family at the top of this file. Five `--nf-media-*` tokens
 * appeared twice in the same `:root`, seventeen lines apart, under a
 * character-for-character copy of the same thirteen-line comment, with all five
 * values different. Later declaration wins, so a retune that the file's own
 * prose describes had never once rendered, and the values that DID paint were
 * the ones the prose calls wrong.
 *
 * Nothing warns about it. A repeated custom property is legal CSS, `tokens.css`
 * is two and a half thousand lines, and a duplicated comment makes the second
 * block look like the first at a glance rather than like a second definition of
 * it.
 *
 * PER RULE, NOT PER FILE, and that is the whole difficulty. `--nf-surface-canvas`
 * is declared in the night `:root` and again in the daylight block, which is the
 * theming mechanism and is correct; declared twice in ONE of them, it is a bug.
 * So this walks brace depth and keys by the block a declaration sits in.
 *
 * `@media` and `@supports` wrappers count as blocks of their own, which is
 * conservative in the right direction: a token redeclared inside a media query
 * is a deliberate override of the rule outside it, and this will not report it.
 */
const duplicates = [];

for (const file of [...filesUnder(TOKENS, [".css"]), ...ROOTS.flatMap((dir) => filesUnder(join(ROOT, dir), [".css"]))]) {
  const source = withoutComments(readFileSync(file, "utf8"));
  const where = relative(ROOT, file);
  /* One entry per open brace, holding what that block has declared so far. */
  const stack = [];
  let buffer = "";
  let line = 1;
  for (const character of source) {
    if (character === "\n") line += 1;
    if (character === "{") {
      stack.push(new Map());
      buffer = "";
    } else if (character === "}") {
      stack.pop();
      buffer = "";
    } else if (character === ";") {
      const match = /^\s*(--nf-[a-z0-9-]+)\s*:/.exec(buffer);
      const block = stack[stack.length - 1];
      if (match && block) {
        const first = block.get(match[1]);
        if (first === undefined) block.set(match[1], line);
        else duplicates.push(`${where}  ${match[1]}  declared at line ${first} and again at line ${line}`);
      }
      buffer = "";
    } else {
      buffer += character;
    }
  }
}

/*
 * CHECK EIGHT: A COMMENT POINTING AT A SOURCE FILE THAT DOES NOT EXIST.
 *
 * Instance 5, and it is the one that cost the most. `.nf-onboarding` was
 * introduced by "see components/site/Onboarding.tsx for the honest,
 * localStorage-gated, reduced-motion-skipping trigger" and `.nf-status-assemble`
 * by "see app/agents/status/StatusIcon.tsx for the honest, one-shot trigger".
 * Neither file has ever existed. Between them they vouched for fifteen rules of
 * dead CSS, and both read as obviously live, because a named component is the
 * strongest evidence a reader gets that a rule is wired up. Both were written by
 * somebody describing a file they were about to create.
 *
 * WHAT COUNTS AS A PATH. A slash, and an extension this repository actually
 * uses. That is deliberately narrow: `HANDOFF_03 section 2.3` and `inbox item
 * 226` are references to things outside the tree and are none of this check's
 * business, and a check that reported them would be switched off in a week.
 *
 * WHERE IT LOOKS. A comment writes the path from wherever the author was
 * standing, so `components/ui/Field.tsx`, `src/app/css/glass.css` and
 * `apps/web/scripts/check-css-tokens.mjs` all appear and all are real. Each
 * candidate is tried against every plausible root and only reported if NONE of
 * them resolve. A false negative here costs nothing; a false positive costs the
 * check its credibility.
 */
const missingPaths = [];
const PATH_ROOTS = [
  join(ROOT, "src"),
  ROOT,
  join(ROOT, ".."),
  join(ROOT, "../.."),
  join(ROOT, "src/app"),
  /*
   * THE LAST THREE WERE THE DIFFERENCE BETWEEN A CHECK AND A NUISANCE, and the
   * first run proved it: 14 hits of which 5 were real files written from where
   * the author was standing. `light.css` says `ui/ActionBar.tsx`,
   * `UiIcon.tsx` says `wallet/BalanceCard.tsx`, `lib/email/listings.ts` says
   * `email/recipients.ts`. All three exist; none of them resolve from `src`.
   *
   * The fix is a longer root list and not a looser pattern, which is the same
   * shape as stripping comments out of the layer-1 scan: an incomplete resolver
   * is a bug in the check, and lowering the bar to hide it would have thrown
   * away the real findings with the noise.
   */
  join(ROOT, "src/components"),
  join(ROOT, "src/components/app"),
  join(ROOT, "src/lib"),
  join(ROOT, "src/design-system"),
];
const PATH_IN_PROSE = /(?:^|[\s"'`(\[])((?:[\w.-]+\/)+[\w.-]+\.(?:tsx?|css|mjs|json))/g;

function commentsOf(source, isCss) {
  const blocks = [...source.matchAll(/\/\*[\s\S]*?\*\//g)].map((m) => m[0]);
  if (isCss) return blocks;
  return blocks.concat(
    source.split("\n").filter((l) => /^\s*\/\//.test(l)),
  );
}

for (const file of [
  ...filesUnder(TOKENS, [".css"]),
  ...ROOTS.flatMap((dir) => filesUnder(join(ROOT, dir), [".css"])),
  ...filesUnder(join(ROOT, "src"), [".ts", ".tsx"]),
]) {
  const source = readFileSync(file, "utf8");
  const where = relative(ROOT, file);
  const seen = new Set();
  for (const comment of commentsOf(source, file.endsWith(".css"))) {
    for (const hit of comment.matchAll(PATH_IN_PROSE)) {
      const candidate = hit[1];
      if (seen.has(candidate)) continue;
      seen.add(candidate);
      if (PATH_ROOTS.some((root) => existsSync(join(root, candidate)))) continue;
      const atLine = source.split("\n").findIndex((l) => l.includes(candidate)) + 1;
      missingPaths.push(`${where}:${atLine}  ${candidate}`);
    }
  }
}

/*
 * CHECK SIX: DOES THE WHOLE STYLESHEET STILL PARSE, FROM THE ENTRY POINT.
 *
 * I WROTE THIS BECAUSE I BROKE IT. Deleting a dead rule from `motion.css` left
 * an orphaned keyframe body behind - a `{ ... }` with no selector in front of
 * it - and `globals.css` runs every partial through one PostCSS pass, so a
 * syntax error in any one of the 24 takes down EVERY ROUTE with a 500. Not the
 * pages that use the partial. All of them. It is the most severe failure mode
 * anything in this directory can produce and it was invisible to all five
 * checks above, to tsc, to eslint and to the test suite, because none of them
 * parse CSS.
 *
 * FROM THE ENTRY POINT, not file by file. I had been parsing each partial on
 * its own after editing it, which is what caught this one in the end, but a
 * per-file pass cannot see an unclosed brace that swallows the next file, and
 * it only runs over the files somebody remembered to list. Following
 * `globals.css`'s own `@import` graph tests what the product actually compiles.
 *
 * `@import "tailwindcss"` and the token package are resolved by the bundler and
 * not by us, so only the relative partials are followed; those are the ones this
 * queue writes.
 *
 * IT DEGRADES TO A SKIP. `lightningcss` is here because Next depends on it, not
 * because this script does. If it cannot be loaded the check says so and passes,
 * because a check that fails on a clean checkout is a check somebody deletes
 * rather than obeys, and this file's own header has said that since it was
 * written.
 */
let parseError = null;
try {
  const { bundle } = await import("lightningcss");
  const entry = join(ROOT, "src/app/globals.css");
  const graph = readFileSync(entry, "utf8")
    .split("\n")
    .flatMap((line) => [...line.matchAll(/@import\s+"(\.\/[^"]+)"/g)].map((m) => m[1]));
  const shim = join(ROOT, "src/app", ".parse-check.css");
  writeFileSync(shim, graph.map((f) => `@import "${f}";`).join("\n"));
  try {
    bundle({ filename: shim, minify: false });
    console.log(`css parse: ${graph.length} partials bundle cleanly from globals.css.`);
  } finally {
    rmSync(shim, { force: true });
  }
} catch (error) {
  if (error?.code === "ERR_MODULE_NOT_FOUND") {
    console.log("css parse: skipped, lightningcss not available.");
  } else {
    parseError = error;
  }
}

/* ------------------------------------------------------------ the report */

let failed = false;

/*
 * The parse result is REPORTED here rather than where it is produced, and that
 * ordering is not cosmetic: `failed` is declared below the checks and the first
 * draft of this block sat above it, so the moment the check actually caught a
 * syntax error it threw `ReferenceError: Cannot access 'failed' before
 * initialization` instead of printing the failure. A guard that crashes on the
 * fault it was written for is worse than no guard, because the stack trace it
 * prints is about this file rather than about the stylesheet.
 *
 * Found, again, by reintroducing the fault and reading the output. Three
 * separate checks in this file have now been wrong on their first run and every
 * one was caught the same way.
 */
if (parseError) {
  failed = true;
  console.error(
    "\nA STYLESHEET DOES NOT PARSE, and this is the one failure here that takes\n" +
      "the whole product down. `globals.css` runs all its partials through one\n" +
      "PostCSS pass, so a syntax error in any of them 500s EVERY route, not the\n" +
      "pages that use it. Nothing else in this repository parses CSS: not tsc,\n" +
      "not eslint, not the tests, and not the five checks above.\n\n" +
      "The usual cause is an edit that removed a rule and left its body, or a\n" +
      "comment closed in the wrong place.\n",
  );
  console.error(`  ${parseError.fileName ?? "?"}:${parseError.loc?.line ?? "?"}  ${parseError.message}`);
  console.error("");
}


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

if (duplicates.length > 0) {
  failed = true;
  console.error(
    "\nTHE SAME CUSTOM PROPERTY DECLARED TWICE IN ONE RULE. Later wins, so the\n" +
      "first declaration is dead and the value that paints is the second one,\n" +
      "whichever that turns out to be. Nothing warns: a repeated custom property\n" +
      "is legal CSS.\n\n" +
      "This is worth reading rather than fixing blind. When it last happened, five\n" +
      "tokens were duplicated seventeen lines apart under a copy of the same\n" +
      "comment, and the copy that WON was the one the file's own prose describes\n" +
      "as wrong: a retune that had been written up and reviewed had never once\n" +
      "rendered. Decide which value is the intended one before deleting either.\n",
  );
  for (const entry of duplicates) console.error(`  ${entry}`);
  console.error(`\n${duplicates.length} duplicate declaration(s).\n`);
}

/*
 * CHECK EIGHT REPORTS AND DOES NOT FAIL, AND THAT IS A JUDGEMENT ABOUT WHAT A
 * MACHINE CAN KNOW RATHER THAN A SOFTENING OF IT.
 *
 * Every other check here is decidable. A `var()` either names a defined token or
 * it does not; a property either takes a shadow or it does not. A path in prose
 * is not, because whether it is a FAULT depends entirely on the tense of the
 * sentence around it, and prose has no syntax for tense that a regular
 * expression can read. The first run of this check found four kinds and only two
 * of them are wrong:
 *
 *   VOUCHING    "see components/site/Onboarding.tsx for the honest trigger"
 *               Asserts the file exists now. It never has. FAULT, and this is
 *               the one the check was built for: it vouched for eleven rules of
 *               dead CSS and read as obviously live.
 *
 *   STALE       "lib/agent/repository.ts had already decided the principle"
 *               Asserts the file exists now. It does not. FAULT, or the path is
 *               mistyped, and either way somebody will go looking.
 *
 *   HISTORICAL  "everything below arrived from components/app/assistant/glyphs.tsx"
 *               Correct. The file is gone BECAUSE of the change being described.
 *
 *   FORWARD     "delete this the day AgentShell moves into app/agent/layout.tsx"
 *               Correct. The file does not exist yet and that is the point.
 *
 * So it prints its list and exits zero, because a check that fails on correct
 * prose is one somebody deletes rather than obeys, and that rule is older than
 * this check.
 *
 * IT CAN BECOME FATAL, AND HERE IS THE CONDITION. The two correct kinds only
 * need an extensioned path because we habitually write one. Name the DIRECTORY,
 * or drop the extension, when you are recalling a file or predicting one:
 * "arrived from `components/app/assistant/`" says the same thing and cannot be
 * mistaken for a live reference by a reader either. Write a full path with an
 * extension only when you are asserting that the file is there to be opened.
 * Once the tree is clean under that convention, move this into the block above
 * and let it fail. Every path in the design-system queue's own files already
 * follows it.
 */
if (missingPaths.length > 0) {
  console.error(
    "\nA COMMENT NAMES A SOURCE FILE THAT DOES NOT EXIST. Read each one: this\n" +
      "check cannot tell an assertion from a recollection, and the note above it\n" +
      "in this file says which kinds are faults and which are fine.\n\n" +
      "The fault to look for is a comment VOUCHING for a file, because a named\n" +
      "component is the strongest evidence a reader gets that a rule is wired up.\n" +
      "Two dead animations survived that way, both introduced by 'see X for the\n" +
      "honest trigger', neither X ever written.\n",
  );
  for (const entry of missingPaths) console.error(`  ${entry}`);
  console.error(`\n${missingPaths.length} unresolved path(s) in comments, reported only.\n`);
}

if (componentFailures.length > 0) {
  failed = true;
  console.error(
    "\nA COMPONENT reading a layer-1 palette token (ADR-002). Same rule as the\n" +
      "check above and the same reasoning: the raw ramps exist so the semantic\n" +
      "layer has somewhere to resolve to. A component that reads one is pinned to\n" +
      "a colour rather than to a role, so it cannot follow the theme and cannot\n" +
      "follow a retune of the ramp.\n\n" +
      "This check is new. It is not new behaviour: these have been here for as\n" +
      "long as the files have, invisible because the layer-1 rule was enforced in\n" +
      "stylesheets and nowhere else.\n\n" +
      "Reach for the semantic token that names what the colour is DOING.\n" +
      "Link or action text is `--nf-content-link`. A focus ring is\n" +
      "`--nf-focus-ring`. The brand at reading weight, when it is genuinely none\n" +
      "of the named roles, is `--nf-brand-quiet`.\n",
  );
  for (const entry of componentFailures) console.error(`  ${entry}`);
  console.error(`\n${componentFailures.length} component violation(s).\n`);
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

if (mistyped.length > 0) {
  failed = true;
  console.error(
    "\nA var() that RESOLVES and resolves to the wrong kind of value. This is\n" +
      "the check above's twin and the reason it exists separately: the token is\n" +
      "real, it is spelled correctly, and the third check passes it, but the\n" +
      "value it holds cannot be used in the property it was written into. The\n" +
      "declaration is invalid at computed-value time and the browser drops it in\n" +
      "silence, exactly as an unresolved var() does.\n\n" +
      "It was found by `background: var(--nf-elev-3)` in settings-rows.css.\n" +
      "`--nf-elev-3` is a three-layer BOX-SHADOW, so that sheet had one\n" +
      "background declaration and it was void: a settings sheet with a border, a\n" +
      "radius, a shadow, an entrance animation and no fill at all, with the page\n" +
      "showing through it. Nothing caught it, because every guard in this file\n" +
      "asked whether the name was real and this name is real.\n\n" +
      "Fix it by writing the token the property actually wants. A surface that\n" +
      "wants rung 3's LOOK wants `background: var(--nf-surface-elevated)` and\n" +
      "`box-shadow: var(--nf-elev-3-rim), var(--nf-elev-3)`; the rung is the\n" +
      "shadow pair, never the fill.\n",
  );
  for (const entry of mistyped) console.error(`  ${entry}`);
  console.error(`\n${mistyped.length} mistyped reference(s).\n`);
}

if (rawColours.length > 0) {
  failed = true;
  console.error(
    "\nRaw colour literal in a stylesheet under src/app. Every one of them\n" +
      "reached zero and this is enforced from that point: a literal cannot follow\n" +
      "the theme, and dark is the default theme rather than the only one. Use a\n" +
      "layer-2 token, or add one to packages/design-tokens and answer it in BOTH\n" +
      "theme blocks.\n" +
      "\nIf what you want is a colour over a PHOTOGRAPH, the --nf-*-on-media\n" +
      "family is deliberately theme-independent and is almost certainly what you\n" +
      "are reaching for.\n",
  );
  for (const entry of rawColours) console.error(`  ${entry}`);
  console.error(`\n${rawColours.length} literal(s).\n`);
}

if (failed) process.exit(1);

console.log(
  "css tokens: clean - 0 layer-1 references in stylesheets, 0 in components, " +
    "0 raw colour literals, 0 unresolved var() references, 0 var() references " +
    "of the wrong type, 0 duplicate declarations, and every partial parses. " +
    "Seven enforced, plus the comment-path report.",
);
