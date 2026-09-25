/**
 * NO EM DASHES IN ANYTHING A PERSON READS (Track M, 25 September 2026).
 *
 * The founder's rule: "em dashes are forbidden". The product's copy already
 * avoided them by convention, which is exactly the kind of rule that holds
 * until the day it does not; two had reached the screen (an empty select
 * option and an empty date on the recovery desk). This makes the rule a gate.
 *
 * WHAT IT READS: every .ts and .tsx file under apps/web/src and the
 * dictionaries under packages/i18n/src/locales, with comments removed, plus
 * the product docs and the repo's markdown. Comments are prose for engineers
 * and are not read by anybody using Vallo, so they are out of scope; string
 * literals and JSX text are in. Test files are skipped, because a test may
 * need the character to prove a parser handles it (the contacts parser reads
 * "0803—123—4567" pasted out of a message).
 *
 * WHAT IT CANNOT SEE: text assembled at runtime from data (a listing title a
 * lister typed), and anything drawn in an image.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const REPO = join(ROOT, "..", "..");
const DASH = "—";

function walk(dir, exts, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name.startsWith(".")) continue;
    const path = join(dir, name);
    const info = statSync(path);
    if (info.isDirectory()) walk(path, exts, out);
    else if (exts.some((ext) => name.endsWith(ext))) out.push(path);
  }
  return out;
}

/* Comments out, strings and JSX kept. Not a parser: good enough for a gate
   whose only question is whether the character survives outside comments. */
function withoutComments(source) {
  let out = "";
  let i = 0;
  let quote = null;
  while (i < source.length) {
    const c = source[i];
    const next = source[i + 1];
    if (quote) {
      out += c;
      if (c === "\\") {
        out += next ?? "";
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      out += c;
      i += 1;
      continue;
    }
    if (c === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      i = end < 0 ? source.length : end + 2;
      continue;
    }
    if (c === "/" && next === "/") {
      const end = source.indexOf("\n", i + 2);
      i = end < 0 ? source.length : end;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

const faults = [];
const code = [
  ...walk(join(ROOT, "src"), [".ts", ".tsx"]),
  ...walk(join(REPO, "packages", "i18n", "src", "locales"), [".ts"]),
].filter((file) => !/\.test\.tsx?$/.test(file));

for (const file of code) {
  const text = withoutComments(readFileSync(file, "utf8"));
  if (!text.includes(DASH)) continue;
  text.split("\n").forEach((line) => {
    if (line.includes(DASH)) faults.push(`${relative(REPO, file)}  ${line.trim().slice(0, 100)}`);
  });
}

for (const file of walk(join(REPO, "docs"), [".md"])) {
  const text = readFileSync(file, "utf8");
  if (text.includes(DASH)) faults.push(`${relative(REPO, file)}  (markdown)`);
}

if (faults.length > 0) {
  console.error(`em dashes: ${faults.length} found. The founder's rule is none, in copy and in docs.`);
  for (const fault of faults.slice(0, 40)) console.error(`  ${fault}`);
  console.error("Use a comma, a colon, a full stop or the word you meant.");
  process.exit(1);
}
console.log(`em dashes: clean - ${code.length} source files and the docs read, none outside comments.`);
