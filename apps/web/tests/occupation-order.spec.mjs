/**
 * The occupation shortlist, and the two promises it has to keep at once.
 *
 * Self-contained: no runner, no dev server, no database. It imports the REAL
 * grouping function (`lib/places/reference.ts`) and drives it with rows shaped
 * exactly the way `listOccupations` returns them, so this spec cannot pass
 * against a second implementation of the rule.
 *
 * What is under test:
 *
 *   1. The shortlist is FIRST, and in rank order, not alphabetical order and
 *      not the order the database happened to return.
 *   2. Nothing is lost. Every code that went in comes out under its own
 *      category heading, including the ones lifted into the shortlist. A
 *      shortcut that removes a row from where somebody expects to browse for
 *      it has traded one problem for another.
 *   3. The alphabet underneath is untouched: same categories, same order,
 *      same rows inside them.
 *   4. No shortlist, no group. A deployment whose `common_rank` column is all
 *      null renders the picker exactly as it rendered before this existed.
 *
 * Run it:
 *
 *   node apps/web/tests/occupation-order.spec.mjs
 *
 * Node strips the TypeScript itself (22.6+).
 */

import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const REFERENCE = pathToFileURL(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "src",
    "lib",
    "places",
    "reference.ts",
  ),
).href;

const { groupOccupations, COMMON_OCCUPATIONS_CATEGORY } = await import(REFERENCE);

let failures = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}${detail ? `\n          ${detail}` : ""}`);
  }
}

/*
 * Rows in the order `listOccupations` produces them: category ascending, then
 * `sort_order`, then name. Ranks are scattered across categories on purpose,
 * and rank 3 sits in the LAST category so a shortlist that merely preserved
 * arrival order would fail check 1.
 */
const ROWS = [
  { code: "farmer", name: "Farmer", category: "Agriculture", commonRank: 2 },
  { code: "agronomist", name: "Agronomist", category: "Agriculture", commonRank: null },
  { code: "teacher", name: "Teacher", category: "Education", commonRank: 1 },
  { code: "lecturer", name: "Lecturer", category: "Education", commonRank: null },
  { code: "registrar", name: "Registrar", category: "Education", commonRank: null },
  { code: "market_trader", name: "Market Trader", category: "Retail", commonRank: 3 },
  { code: "cashier", name: "Cashier", category: "Retail", commonRank: null },
];

const grouped = groupOccupations(ROWS);

/* ------------------------------------------------------- 1. shortlist first */

const first = grouped[0];
check(
  "the shortlist is the first group",
  first?.category === COMMON_OCCUPATIONS_CATEGORY,
  `first heading was ${JSON.stringify(first?.category)}`,
);

check(
  "the shortlist is marked as a shortcut, so search can drop it",
  first?.shortcut === true,
  `shortcut was ${JSON.stringify(first?.shortcut)}`,
);

check(
  "the shortlist is in rank order, not arrival order",
  JSON.stringify(first?.options.map((o) => o.code)) ===
    JSON.stringify(["teacher", "farmer", "market_trader"]),
  `got ${JSON.stringify(first?.options.map((o) => o.code))}`,
);

check(
  "only ranked rows are on it",
  first?.options.length === 3,
  `${first?.options.length} rows on the shortlist`,
);

/* ------------------------------------------------- 2. nothing is taken away */

const alphabet = grouped.slice(1);
const flat = alphabet.flatMap((group) => group.options.map((o) => o.code));

for (const row of ROWS) {
  check(
    `${row.code} still appears under ${row.category}`,
    alphabet.find((g) => g.category === row.category)?.options.some((o) => o.code === row.code) ===
      true,
  );
}

check(
  "the alphabet holds every row exactly once",
  flat.length === ROWS.length && new Set(flat).size === ROWS.length,
  `${flat.length} rows, ${new Set(flat).size} distinct`,
);

/* --------------------------------------------- 3. the alphabet is untouched */

check(
  "the category headings and their order are unchanged",
  JSON.stringify(alphabet.map((g) => g.category)) ===
    JSON.stringify(["Agriculture", "Education", "Retail"]),
  `got ${JSON.stringify(alphabet.map((g) => g.category))}`,
);

check(
  "rows keep their order inside a category",
  JSON.stringify(alphabet[1]?.options.map((o) => o.code)) ===
    JSON.stringify(["teacher", "lecturer", "registrar"]),
  `got ${JSON.stringify(alphabet[1]?.options.map((o) => o.code))}`,
);

check(
  "no group below the shortlist claims to be a shortcut",
  alphabet.every((g) => g.shortcut !== true),
);

/* ------------------------------------------------- 4. no shortlist, no group */

const unranked = groupOccupations(ROWS.map((row) => ({ ...row, commonRank: null })));

check(
  "with nothing ranked there is no pinned group at all",
  unranked.length === 3 && unranked[0].category === "Agriculture",
  `got ${JSON.stringify(unranked.map((g) => g.category))}`,
);

check(
  "and with the field absent entirely, same answer",
  JSON.stringify(
    groupOccupations(
      ROWS.map(({ code, name, category }) => ({ code, name, category })),
    ).map((g) => g.category),
  ) === JSON.stringify(["Agriculture", "Education", "Retail"]),
);

console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
