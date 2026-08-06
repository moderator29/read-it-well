/**
 * Every error says what happened and what to do next.
 *
 * Item 18 of docs/POLISH_PASS.md, inbox item 40. A sweep, not one screen.
 *
 * This one is checked against the source rather than in a browser, and that is
 * not the usual shortcut. For most of this platform the running artefact is the
 * only honest answer, because what a page DOES is not what its markup looks
 * like. Copy is the exception: the string inside `fail("...")` is byte for byte
 * the string the reader gets, so reading it here is reading the artefact. What
 * a browser could add is which errors are REACHABLE, and with an empty database
 * almost none of them are: there is no booking to cancel, no listing to
 * publish, no wallet to withdraw from, so a browser pass would prove a handful
 * and quietly leave seventy unread.
 *
 * THE RULE, and it is the item's own words. An error has to answer two
 * questions. What happened, which every one of these does by existing. And what
 * to do next, which is the half that gets left out, because the person writing
 * it already knows.
 *
 * A message passes when it carries a next step: an instruction to the reader,
 * or a statement that the thing is already done and no step is needed. A bare
 * bark fails: "That handle is taken" says what happened and abandons the reader
 * holding a form they cannot submit.
 *
 * Run it anywhere. No server, no browser, no database.
 *
 *   node apps/web/tests/error-copy.spec.mjs
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "../src");

let failures = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
    if (detail) for (const line of [].concat(detail).slice(0, 40)) console.log(`            ${line}`);
  }
}

/*
 * A next step, in the words this platform actually uses.
 *
 * Deliberately a list of what our copy says rather than a clever parser. An
 * imperative in English has no grammatical marker a regular expression can find,
 * so the honest version of this check is a vocabulary, kept short, that has to
 * be extended on purpose when somebody writes a new kind of instruction. That
 * is a feature: adding a word here is a decision, and it is reviewed.
 */
const NEXT_STEP = [
  /\btry again\b/i,
  /\brefresh\b/i,
  /\breload\b/i,
  /\bcontact support\b/i,
  /\blet support know\b/i,
  /\bsupport (?:and|will|reconciles?)\b/i,
  /\bsign in\b/i,
  /\bcheck (?:the|your)\b/i,
  /\b(?:pick|choose|enter|use|say|tell|write|send|add|set|start|open|close|take|return|claim|approve|remove|report|message|wait|come back)\b/i,
  /\bfirst,? then\b/i,
  /\bis untouched\b/i,
  /\bnothing (?:was|is) (?:charged|credited|taken|lost)\b/i,
  /\bthe moment\b/i,
  /\bautomatic(?:ally)?\b/i,
  /\bwe (?:will|reconcile|sort)\b/i,
  /\bour team\b/i,
  /\bnothing to\b/i,
  /\bonce (?:the|you|it|they|your|somebody)\b/i,
  /\btry\b[^.]{0,24}\bagain\b/i,
  /* "You can edit it again in 4 hours", the shape every rate limit refusal
     uses. It is a next step with a time on it, which is the best kind. */
  /\byou can \w+ it again\b/i,
  /\byour own page is always yours\b/i,
];

/*
 * Messages that answer "what to do next" with "nothing, and that is fine".
 *
 * An error saying the thing you asked for has already happened is complete
 * without an instruction, as long as it says so in a way that closes the
 * question rather than leaving it open.
 */
const ALREADY_DONE = /\balready\b/i;

/*
 * The structural half of the rule, and the more honest half.
 *
 * "What happened, and what to do next" is two clauses, so a refusal carrying
 * two or more sentences has room for both and a one-sentence refusal does not.
 * That catches every bark this sweep found without needing to have predicted
 * the verb: "That handle is taken." fails, "The assistant is paused for a
 * moment of maintenance. Search is live and every listing page answers the
 * essentials." passes. The vocabulary above then rescues the genuine
 * one-sentence instructions, which are real: "Pick one of the reasons listed."
 * is a complete answer in six words.
 */
function sentences(text) {
  return text.split(/[.!?]+(?:\s|$)/).filter((part) => part.trim().length > 0).length;
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

/* ------------------------------------------------------ gather the copy */

const messages = new Map();
for (const file of walk(SRC)) {
  const src = readFileSync(file, "utf8");
  const rel = relative(SRC, file).split("\\").join("/");
  /* `fail("...")` is the ActionResult envelope's one way of refusing, so
     every refusal this platform can make passes through it. */
  for (const m of src.matchAll(/\bfail\(\s*"([^"]{8,})"/g)) {
    const line = src.slice(0, m.index).split("\n").length;
    if (messages.has(m[1])) continue;
    /*
     * The whole call, not just the summary.
     *
     * `fail(message, fieldErrors)` puts the instruction on the field about half
     * the time, and the reader sees both at once: "That handle is taken."
     * above the input, "Somebody already holds that handle. Please choose
     * another one." beside it. Judging the summary alone would call that a
     * bark when it is nothing of the kind. Cut at the first `);`, which closes
     * the call in every one of these because a field error object never
     * contains one.
     */
    const call = src.slice(m.index).split(");")[0] ?? m[1];
    messages.set(m[1], { where: `${rel}:${line}`, read: call });
  }
}

/*
 * The refusals that go through a shared constant, which is most of the traffic.
 *
 * `fail(SIGNED_OUT_MESSAGE)` appears 58 times, `fail(NOT_CONFIGURED_MESSAGE)`
 * 66. Reading only the string literals would have swept the rare refusals and
 * skipped the ones almost every reader meets, which is the exact shape of the
 * mistake this file is here to prevent. So the constants are resolved too:
 * `const NAME = "..."` anywhere in the tree, including the multi-line form
 * prettier produces, and `NAME.key` inside an object of them.
 */
/*
 * Keyed by file AND by name, which matters more than it looks.
 *
 * Written as one flat map of name to text, this check silently passed a bark.
 * `GONE_MESSAGE` is defined twice: "This place is no longer available, so it
 * cannot be saved. Explore other stays from search." in the shortlist, and
 * "That page is no longer available." in follows. First definition wins in a
 * flat map, the shortlist's file sorts first, and six call sites in follows
 * were checked against copy they do not use. A check that skips quietly is
 * worse than no check, so resolution now prefers the definition in the calling
 * file and falls back to every distinct definition of the name rather than to
 * whichever one it met first.
 */
const constants = new Map();
const define = (name, file, text, where) => {
  if (!constants.has(name)) constants.set(name, new Map());
  const byFile = constants.get(name);
  if (!byFile.has(file)) byFile.set(file, { text, where });
};

for (const file of walk(SRC)) {
  const src = readFileSync(file, "utf8");
  const rel = relative(SRC, file).split("\\").join("/");
  /* Both quote styles: a plain string, and the template literal a message
     with an interpolated support address or a retry window has to be. */
  for (const m of src.matchAll(/\bconst ([A-Z][A-Z0-9_]{2,})(?::[^=]{1,60})? =\s*\n?\s*["`]([^"`]{8,})["`]/g)) {
    define(m[1], rel, m[2], `${rel}:${src.slice(0, m.index).split("\n").length}`);
  }
  /* `const POST_FAILURE = { down: "...", gone: "..." }` and its kin. Read to
     the first closing brace in the first column, so a comment or a nested
     object inside the block does not cut it short. */
  for (const m of src.matchAll(/\bconst ([A-Z][A-Z0-9_]{2,}) = \{\n([\s\S]*?)\n\}/g)) {
    const line = src.slice(0, m.index).split("\n").length;
    for (const f of m[2].matchAll(/^\s{2}(\w+):\s*\n?\s*["`]([^"`]{8,})["`]/gm)) {
      define(`${m[1]}.${f[1]}`, rel, f[2], `${rel}:${line}`);
    }
  }
}

const unresolved = new Set();
for (const file of walk(SRC)) {
  const src = readFileSync(file, "utf8");
  const rel = relative(SRC, file).split("\\").join("/");
  for (const m of src.matchAll(/\bfail\(\s*([A-Z][A-Za-z0-9_.]{2,})\s*[),]/g)) {
    const byFile = constants.get(m[1]);
    if (!byFile) {
      unresolved.add(m[1]);
      continue;
    }
    const line = src.slice(0, m.index).split("\n").length;
    /* The definition in this file if there is one, otherwise every definition
       of the name, because guessing which is the wrong move. */
    const candidates = byFile.has(rel) ? [byFile.get(rel)] : [...byFile.values()];
    for (const found of candidates) {
      if (messages.has(found.text)) continue;
      messages.set(found.text, { where: `${found.where} via ${rel}:${line}`, read: found.text });
    }
  }
}

console.log(`\n${messages.size} distinct refusals, from the one envelope every mutation speaks`);
if (unresolved.size > 0) {
  console.log(`  (${unresolved.size} named refusals could not be resolved to a string and are NOT checked:`);
  console.log(`   ${[...unresolved].sort().join(", ")})`);
}

/* ------------------------------------------------------------ the rules */

const noNextStep = [];
const notASentence = [];
const shouting = [];

for (const [message, { where, read }] of messages) {
  if (sentences(read) < 2 && !NEXT_STEP.some((re) => re.test(read)) && !ALREADY_DONE.test(read)) {
    noNextStep.push(`${message}   (${where})`);
  }
  /* A refusal is a sentence somebody reads, not a log line. */
  if (!/^[A-Z]/.test(message) || !/[.!?]$/.test(message)) {
    notASentence.push(`${message}   (${where})`);
  }
  /* `${SUPPORT_EMAIL}` is an interpolation slot, not shouting. It is stripped
     before the test rather than added to the allowed list, because the next
     one will have a different name. */
  const spoken = message.replace(/\$\{[^}]*\}/g, "").replace(/RentMe|SMS|BVN|NIN|PDF/g, "");
  if (/[A-Z]{4,}/.test(spoken)) {
    shouting.push(`${message}   (${where})`);
  }
}

check("every refusal says what to do next", noNextStep.length === 0, noNextStep);
check("every refusal is a written sentence", notASentence.length === 0, notASentence);
check("no refusal shouts a raw enum or code at the reader", shouting.length === 0, shouting);

/* ------------------------------------------- the ones nobody should write */

/*
 * Three shapes that say nothing. Each one has been in this codebase at some
 * point and each one costs a support ticket: the reader learns that it failed
 * and nothing else, so the only move left is to write to us.
 */
const EMPTY_SHAPES = [
  [/^(?:an? )?error(?: occurred)?\.?$/i, "just the word error"],
  [/^something went wrong\.?$/i, "something went wrong, with no second sentence"],
  [/^(?:failed|invalid|unauthori[sz]ed|forbidden|bad request)\b.{0,12}$/i, "an HTTP status in words"],
];
const empty = [];
for (const [message, { where }] of messages) {
  for (const [shape, why] of EMPTY_SHAPES) {
    if (shape.test(message.trim())) empty.push(`${message}   (${where}) ${why}`);
  }
}
check("no refusal is a bare status with nothing after it", empty.length === 0, empty);

/* ------------------------------------------------- and the house rules */

const emDash = [];
const banned = [];
for (const [message, { where, read }] of messages) {
  if (read.includes("\u2014")) emDash.push(`${message}   (${where})`);
  if (/\b(demo|sample|preview)\b/i.test(read)) banned.push(`${message}   (${where})`);
}
check("no refusal contains an em dash", emDash.length === 0, emDash);
check('no refusal says "demo", "sample" or "preview"', banned.length === 0, banned);

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
