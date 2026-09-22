/*
 * THE TSX SIDE OF THE RATIO SWEEP, AND IT IS NOT A SUBSTITUTE FOR THE BROWSER.
 *
 * `compare-surface.mjs --shape-sweep` is the only check that sees what the
 * browser DREW, and it stays the authority. It has one blind spot, and the
 * blind spot is the whole reason for this file: it can only measure an element
 * that some route actually renders. `components/social/feed/PostCard.tsx:472`
 * was a text-bearing control at ratio 0.583 on every post card in the feed
 * that has an area, and it did not appear in a sweep of `/preview/f4/feed`,
 * because no fixture post in that harness carries an area. A control the
 * fixtures do not exercise is invisible to a real-browser sweep and shipping
 * on a real phone.
 *
 * So this reads the source, which proves what was WRITTEN, and the two
 * together cover more than either alone. Where they disagree the browser wins.
 *
 * WHAT IT MEASURES. Any TSX class list that declares BOTH a radius from our
 * token ladder and a height, as `rounded-[var(--nf-radius-X)]` beside `h-N`,
 * `size-N`, `h-[Npx]` or `h-[Nrem]`. The ratio is the radius over the height.
 * At or above 0.5 the browser draws a capsule however it was spelled; above
 * 0.35 it is worth a human's eye.
 *
 * WHAT IT EXCLUDES, and the list is the design direction's own, not a
 * convenience: a dot, a spinner, a progress track, a range track, a switch
 * track and knob, an avatar, an avatar ring, a story ring and a skeleton
 * placeholder are SHAPES rather than controls and the shape law does not reach
 * them (`docs/DESIGN_DIRECTION.md:54`). Without that exclusion the output is
 * four hundred skeleton slabs and two progress bars at ratio 166, and a report
 * whose signal is under its own noise is a report nobody runs twice.
 *
 * Usage:  node scripts/design/tsx-shape-scan.mjs [--all] [--src <dir>]
 *         --all also prints the 0.35 watch line.
 *         --src points it at another checkout, for a before and after.
 * Exit 1 when a text-bearing control is at or above 0.5.
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

/* `--src <dir>` so the same scan can be run against an older checkout and the
   before and after can be stated as two numbers rather than as a claim. */
const srcArg = process.argv.indexOf("--src");
const SRC =
  srcArg > -1 && process.argv[srcArg + 1]
    ? process.argv[srcArg + 1].replace(/\/$/, "")
    : "/home/user/read-it-well/apps/web/src";
const FAIL_AT = 0.5;
const WARN_AT = 0.35;
const SHOW_WATCH = process.argv.includes("--all");

/** The ladder, from `packages/design-tokens/src/tokens.css`. */
const RADIUS = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  "2xl": 32,
  pill: 999,
  control: 14,
};

/*
 * A SHAPE, not a control. Matched on the class list and on the file path,
 * because a skeleton slab is identified by the class it wears and a
 * `loading.tsx` is identified by being one.
 */
const SHAPE_MARKERS = [
  "skeleton",
  "spinner",
  "switch",
  "progress",
  "avatar",
  "story-ring",
  "grip",
  "nf-dot",
  "range",
];

const files = execSync(
  `grep -rl 'rounded-\\[var(--nf-radius' ${SRC} --include=*.tsx`,
).toString().trim().split("\n").filter(Boolean);

const findings = [];
for (const file of files) {
  /* The dev harness is a specimen board: it draws the pill radius deliberately
     as documentation of what the token is for. */
  if (file.includes("/(dev)/")) continue;
  const short = file.replace(`${SRC}/`, "");
  const isLoading = /\/loading\.tsx$/.test(short);
  readFileSync(file, "utf8").split("\n").forEach((line, i) => {
    const rm = line.match(/rounded-\[var\(--nf-radius-([a-z0-9]+)\)\]/);
    if (!rm) return;
    const radius = RADIUS[rm[1]];
    if (radius === undefined) return; // circle and squircle are percentages

    let height = null;
    let hm = line.match(/(?:^|\s|"|`|\{)h-(\d+(?:\.\d+)?)(?:\s|"|`|$)/);
    if (hm) height = parseFloat(hm[1]) * 4;
    if (height === null) {
      hm = line.match(/(?:^|\s|"|`|\{)size-(\d+(?:\.\d+)?)(?:\s|"|`|$)/);
      if (hm) height = parseFloat(hm[1]) * 4;
    }
    if (height === null) {
      hm = line.match(/h-\[(\d+(?:\.\d+)?)px\]/);
      if (hm) height = parseFloat(hm[1]);
    }
    if (height === null) {
      hm = line.match(/h-\[(\d+(?:\.\d+)?)rem\]/);
      if (hm) height = parseFloat(hm[1]) * 16;
    }
    if (height === null || height <= 0) return;

    /*
     * A BOX SHORTER THAN THE SMALLEST TYPE RUNG CANNOT CARRY TEXT, SO IT IS A
     * SHAPE. `--nf-text-overline` is 0.75rem, twelve pixels, and a line box is
     * never shorter than its type. Everything this excludes is a 6px progress
     * or step track drawn at `--nf-radius-pill`, which is exactly what the
     * shape law says a progress bar may be. Without this the report is four
     * tracks at ratio 166 and the four real findings underneath them.
     */
    if (height < 12) return;

    const haystack = line.toLowerCase();
    if (isLoading || SHAPE_MARKERS.some((m) => haystack.includes(m))) return;

    const ratio = radius / height;
    if (ratio < WARN_AT) return;
    findings.push({ file: short, line: i + 1, radius, height, ratio });
  });
}

findings.sort((a, b) => b.ratio - a.ratio);
const breaches = findings.filter((f) => f.ratio >= FAIL_AT);
const watch = findings.filter((f) => f.ratio < FAIL_AT);
const show = (f) =>
  `  ${f.ratio.toFixed(3)}  ${f.file}:${f.line}  radius ${f.radius}px on a ${f.height}px box`;

console.log(`tsx shape scan, controls only, ${files.length} files read\n`);
console.log(`AT OR ABOVE ${FAIL_AT}, a capsule however it was spelled: ${breaches.length}`);
breaches.forEach((f) => console.log(show(f)));
console.log(`\nON THE ${WARN_AT} WATCH LINE: ${watch.length}${SHOW_WATCH ? "" : "  (--all to list)"}`);
if (SHOW_WATCH) watch.forEach((f) => console.log(show(f)));
console.log(
  `\n${breaches.length === 0 ? "no control declared in TSX draws as a capsule." : "the shape law is broken in TSX."}`,
);
console.log(
  "this reads source text. It never proves what the browser drew: run compare-surface.mjs --shape-sweep for that.",
);
process.exit(breaches.length === 0 ? 0 : 1);
