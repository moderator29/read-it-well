/**
 * ARE THERE ANY LIVE LIGHT-MODE RULES LEFT? The completion test for the
 * removal, and the reason it is not a grep.
 *
 *   node docs/design/proofs/no-light/live-light-rules.mjs
 *
 * A plain `grep -rn '\[data-theme="light"\]'` over this tree reports fourteen
 * files and eight of them are COMMENTS explaining why something is the way it
 * is, including one that literally reads "the founder removed light mode on 23
 * September 2026". A check whose output is mostly prose is a check nobody
 * finishes reading, and it fails in both directions: it hides the real hits in
 * noise, and it makes "done" impossible to declare.
 *
 * So this strips comments FIRST and then looks for the selector.
 *
 *   `/* ... *\/` in CSS, TypeScript and JavaScript, across lines
 *   `//` to end of line, but NOT when it sits inside a string or a URL, which
 *        is why the line comment is only taken when the `//` is preceded by
 *        start-of-line or whitespace and is not `://`
 *   `{/* ... *\/}` in TSX is already covered by the block form
 *
 * It reports, per file, the LINE the selector is on after stripping, so a hit
 * can be opened and read rather than searched for again.
 *
 * WHAT COUNTS AS LIVE. The `[data-theme="light"]` attribute selector in any
 * form, and `prefers-color-scheme: light` in a media query. Both are things a
 * browser can act on. A mention inside a string literal in a script that
 * REMOVED light mode is not, and the two known instances of that are named in
 * `ALLOWED` below with their reason, because an unexplained exclusion is how a
 * check starts lying.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/* Four levels: no-light -> proofs -> design -> docs -> the repository root. The
   first version of this file went up three, found no files at all, and printed
   a clean result. A completion test that cannot fail is worse than no test, so
   the walk now reports how many files it read and this line is why. */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const SEARCH = ["apps/web/src", "packages", "scripts", "apps/web/scripts"];
const EXT = new Set([".css", ".ts", ".tsx", ".mjs", ".js"]);
const SKIP_DIR = new Set(["node_modules", ".next", "dist", ".git"]);

/*
 * The proof scripts in this directory necessarily NAME the thing they prove is
 * gone: one emulates an operating system set to light and asserts the page is
 * dark anyway, and this file quotes the selector it is searching for. Excluded
 * by path rather than by pattern, so adding a third exclusion has to be a
 * decision somebody writes down.
 */
const ALLOWED = new Set([
  "docs/design/proofs/no-light/live-light-rules.mjs",
  "docs/design/proofs/no-light/prove-no-light.mjs",
]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIR.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXT.has(entry.slice(entry.lastIndexOf(".")))) out.push(full);
  }
  return out;
}

/* Blank the comments rather than delete them, so line numbers still point at
   the file on disk. That is the difference between a report you can open and a
   report you have to search from. */
function withoutComments(source) {
  let out = source.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + " ".repeat(m.length - p.length));
  return out;
}

const LIVE = [/\[data-theme\s*=\s*"light"\]/, /prefers-color-scheme\s*:\s*light/];

const hits = [];
let scanned = 0;
for (const dir of SEARCH) {
  const full = join(ROOT, dir);
  try {
    statSync(full);
  } catch {
    continue;
  }
  for (const file of walk(full)) {
    const rel = relative(ROOT, file);
    if (ALLOWED.has(rel)) continue;
    scanned += 1;
    const lines = withoutComments(readFileSync(file, "utf8")).split("\n");
    lines.forEach((line, i) => {
      if (LIVE.some((re) => re.test(line))) hits.push({ rel, line: i + 1, text: line.trim().slice(0, 96) });
    });
  }
}

const byFile = new Map();
for (const h of hits) {
  if (!byFile.has(h.rel)) byFile.set(h.rel, []);
  byFile.get(h.rel).push(h);
}
if (scanned === 0) {
  console.error("read 0 files: the walk is pointed at nothing and this result means nothing.");
  process.exit(2);
}
if (hits.length === 0) {
  console.log(`no live light-mode rules: 0 hits in ${scanned} files, comments stripped first.`);
} else {
  console.log(
    `LIVE light-mode references, comments stripped: ${hits.length} in ${byFile.size} of ${scanned} files\n`,
  );
  for (const [rel, list] of [...byFile.entries()].sort()) {
    console.log(`${rel}  (${list.length})`);
    for (const h of list) console.log(`  ${String(h.line).padStart(5)}  ${h.text}`);
  }
}
process.exit(hits.length === 0 ? 0 : 1);
