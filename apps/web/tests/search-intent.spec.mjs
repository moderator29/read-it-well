/**
 * Stated intent, and the line it may not cross.
 *
 * Self-contained: no runner, no config, no dev server, no database. It imports
 * the REAL rule module (`lib/listings/intent.ts`) and the REAL URL contract
 * (`lib/listings/search-params.ts`) and drives them exactly as the search page
 * does, so this spec cannot pass against a second implementation of the rule.
 *
 * Two things are under test, and the second one is the important one:
 *
 *   1. It works. With a bare address bar and a person who said what they came
 *      for, the default result set is reordered and the first card changes.
 *   2. It never overrides an explicit choice. With ANY parameter in the URL -
 *      a search term, a category, a sort, the map, a budget, a bedroom count,
 *      an amenity, instant book, verified only - the results come back as the
 *      SAME ARRAY INSTANCE. Not "equal", the same object: the rule did not run.
 *
 * And the invariant that separates a bias from a hijack: nothing is ever
 * removed. Every assertion below checks the count and the id set survive.
 *
 * Run it:
 *
 *   node apps/web/tests/search-intent.spec.mjs
 *
 * Node strips the TypeScript itself (22.6+). The one hook below teaches the
 * resolver that `./search-params` means `./search-params.ts`, which is the only
 * thing Node's own resolution will not do for a bare relative import.
 */

import { register } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const TS_EXTENSION_HOOK = `
export async function resolve(specifier, context, next) {
  if (specifier.startsWith(".") && !/\\.[a-z]+$/.test(specifier)) {
    try { return await next(specifier + ".ts", context); } catch {}
  }
  return next(specifier, context);
}`;
register("data:text/javascript," + encodeURIComponent(TS_EXTENSION_HOOK), import.meta.url);

const LIB = pathToFileURL(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "lib", "listings"),
).href;

const { hasOwnRequest, orderByStatedIntent, intentKindsPresent } = await import(
  `${LIB}/intent.ts`
);
const { parseDiscoveryQuery, toSearchHref } = await import(`${LIB}/search-params.ts`);

let failures = 0;
function check(name, condition) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
  }
}

/**
 * A result set in the shape and the ORDER the repository hands the page:
 * first-party inventory before partner stock, featured before the rest. The
 * kinds and their sequence mirror the catalogue discovery actually serves.
 */
const CATALOGUE = [
  { id: "a1", kind: "apartment" },
  { id: "s1", kind: "shortlet" },
  { id: "a2", kind: "apartment" },
  { id: "v1", kind: "villa" },
  { id: "r1", kind: "restaurant" },
  { id: "x1", kind: "experience" },
  { id: "h1", kind: "home" },
  { id: "t1", kind: "hotel" },
  { id: "t2", kind: "hotel" },
  { id: "n1", kind: "rental" },
  { id: "n2", kind: "rental" },
];

const ids = (list) => list.map((l) => l.id);
const sortedIds = (list) => [...ids(list)].sort().join(",");

/* ------------------------------------------------------ 1. it actually works */

console.log("\nstated intent, bare address bar");

const bare = parseDiscoveryQuery({});
check("a bare request carries nothing of the person's own", hasOwnRequest(bare) === false);
check("and serialises back to /search", toSearchHref(bare) === "/search");

const intent = ["hotel", "rental"];
const biased = orderByStatedIntent(CATALOGUE, intent);

check("the order changed", ids(biased).join(",") !== ids(CATALOGUE).join(","));
check("the first card is one of the stated kinds", intent.includes(biased[0].kind));
check(
  "every stated kind comes before every other kind",
  (() => {
    const lastWanted = biased.findLastIndex((l) => intent.includes(l.kind));
    const firstOther = biased.findIndex((l) => !intent.includes(l.kind));
    return lastWanted < firstOther;
  })(),
);
check(
  "order INSIDE the stated group is the repository's own",
  ids(biased.filter((l) => intent.includes(l.kind))).join(",") === "t1,t2,n1,n2",
);
check(
  "order INSIDE the remainder is the repository's own",
  ids(biased.filter((l) => !intent.includes(l.kind))).join(",") === "a1,s1,a2,v1,r1,x1,h1",
);

/* ------------------------------------------------- 2. nothing is ever removed */

console.log("\nit biases, it does not filter");

check("the count is identical", biased.length === CATALOGUE.length);
check("the id set is identical", sortedIds(biased) === sortedIds(CATALOGUE));
check(
  "the note names only kinds that are on the page",
  intentKindsPresent(CATALOGUE, ["hotel", "rental", "land"]).join(",") === "hotel,rental",
);
check(
  "an intent the catalogue cannot answer changes nothing",
  orderByStatedIntent(CATALOGUE, ["land", "office", "shop"]) === CATALOGUE,
);
check(
  "an intent covering everything changes nothing",
  orderByStatedIntent(CATALOGUE, [...new Set(CATALOGUE.map((l) => l.kind))]) === CATALOGUE,
);
check("no stated intent changes nothing", orderByStatedIntent(CATALOGUE, []) === CATALOGUE);

/* --------------------------------- 3. an explicit choice outranks it, always */

console.log("\nany choice of their own switches it off entirely");

const EXPLICIT = [
  ["a search term", { q: "Lagos" }],
  ["a category", { type: "apartment" }],
  ["a legacy category alias", { type: "rent" }],
  ["a sort", { sort: "price-asc" }],
  ["the map", { view: "map" }],
  ["a budget floor", { min: "50000" }],
  ["a budget ceiling", { max: "250000" }],
  ["a bedroom minimum", { beds: "2" }],
  ["a bathroom minimum", { baths: "2" }],
  ["a party size", { guests: "4" }],
  ["an amenity", { amenities: "wifi" }],
  ["instant book", { instant: "1" }],
  ["verified only", { verified: "1" }],
];

for (const [name, params] of EXPLICIT) {
  const query = parseDiscoveryQuery(params);
  const applies = !hasOwnRequest(query);
  // Exactly what the page does: the row is not even read when the gate is shut.
  const results = applies ? orderByStatedIntent(CATALOGUE, intent) : CATALOGUE;
  check(`${name} shuts the gate`, applies === false);
  check(`${name} leaves the results untouched`, results === CATALOGUE);
}

/*
 * Rubbish in the address bar is not a choice. `parseDiscoveryQuery` drops
 * anything it cannot read, so a link full of nonsense renders the unfiltered
 * page - and the unfiltered page is exactly where stated intent is allowed to
 * speak. This is the one case where the gate must OPEN despite a query string.
 */
console.log("\nrubbish in the address bar is not a choice");
const rubbish = parseDiscoveryQuery({ beds: "-4", min: "abc", type: "spaceship", sort: "sideways" });
check("nothing survived parsing", toSearchHref(rubbish) === "/search");
check("so the gate opens", hasOwnRequest(rubbish) === false);

console.log(
  failures === 0
    ? "\nall checks passed\n"
    : `\n${failures} check${failures === 1 ? "" : "s"} failed\n`,
);
process.exit(failures === 0 ? 0 : 1);
