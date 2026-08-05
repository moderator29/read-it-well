/**
 * Naming a person inside a body of text.
 *
 * Self-contained node script, no runner and no config, matching the other specs
 * in this directory:
 *
 *   node apps/web/tests/social-mentions.spec.mjs
 *
 * **This one needs no browser and no server**, because the rule it proves is a
 * pure function. It imports `lib/social/mentions-schema.ts` directly, through
 * Node's type stripping, so it tests the module the product actually ships
 * rather than a copy of its logic written into the test. A spec that restates
 * the rule it is checking passes while the product is broken, which is worse
 * than no spec at all.
 *
 * The case that matters most is the fourth one. This platform's scanner exists
 * partly to catch off-platform payment asks, so an email address is exactly the
 * text most likely to carry an `@`, and a mention parser that turns
 * `ade@bola_stores.com` into a link to a person called `@bola_stores` invents
 * somebody out of a fraud attempt.
 */

import { fileURLToPath } from "node:url";

/* Node 22 needs the flag to import a TypeScript module; 23 and later do not.
   Re-exec once rather than asking whoever runs the specs to remember it. */
if (!process.execArgv.includes("--experimental-strip-types")) {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--no-warnings", fileURLToPath(import.meta.url)],
    { stdio: "inherit" },
  );
  process.exit(result.status ?? 1);
}

const { findMentions } = await import("../src/lib/social/mentions-schema.ts");

let failures = 0;
function check(name, condition) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
  }
}

const cases = [
  ["a handle at the start is a mention", "@aduke can you confirm the light", ["aduke"]],
  ["two handles are two mentions", "thanks @Aduke_01 and @bola", ["aduke_01", "bola"]],
  ["an email address names nobody", "pay me at ade@bola_stores.com", []],
  [
    "an email address does not swallow a real mention beside it",
    "email ade@bola_stores.com or ask @tunde",
    ["tunde"],
  ],
  ["a handle under three characters is not one", "@ab is too short", []],
  ["a handle cannot start with a digit", "@1abc is not a handle", []],
  ["plain words name nobody", "no handles here at all", []],
  ["the same person twice is two mentions", "@aduke @aduke twice", ["aduke", "aduke"]],
  ["punctuation before a handle is fine", "(@aduke) in brackets", ["aduke"]],
  ["a doubled at sign names nobody", "@@aduke", []],
  ["handles are lowercased, because the column is", "@ADUKE", ["aduke"]],
  ["an empty body is not an error", "", []],
];

console.log("\nmentions");
for (const [name, text, want] of cases) {
  const got = findMentions(text).map((m) => m.handle);
  check(`${name} (${JSON.stringify(text)} -> ${JSON.stringify(got)})`, JSON.stringify(got) === JSON.stringify(want));
}

/* The offsets are what the renderer slices on, so a wrong one silently drops or
   duplicates a character of somebody's sentence. */
const offsets = findMentions("hi @aduke there");
check(
  "the offsets bound exactly the handle and its at sign",
  offsets.length === 1 && "hi @aduke there".slice(offsets[0].start, offsets[0].end) === "@aduke",
);

console.log(
  failures === 0 ? "\nsocial-mentions: all checks passed" : `\nsocial-mentions: ${failures} FAILED`,
);
process.exit(failures === 0 ? 0 : 1);
