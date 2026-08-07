/**
 * Correcting what you came here for, from the card itself.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/intent-tune.spec.mjs
 *
 * `/settings/interests` is a backstop. The signal a product of this shape
 * actually runs on is the one collected in the moment, on the card somebody is
 * already looking at, so `IntentTune` puts "More like this" and "Not for me"
 * there. What this spec exists to hold is not that the buttons render. It is
 * the four rules that make the feature honest rather than merely present:
 *
 *   1. ONE STORED SIGNAL. The card writes `profiles.interests`, the same
 *      `property_type[]` the welcome screen writes and `lib/listings/intent.ts`
 *      reads. No second table, no second vocabulary, no parallel "signals"
 *      store that would need a merge rule nobody owns.
 *   2. THE CALLER'S OWN CLIENT. `adjustInterest` resolves a session and acts
 *      through it, so RLS decides whose row moves. The service role appears
 *      nowhere near it.
 *   3. IDEMPOTENT, AND HONEST ABOUT IT. "More" on a market already stored is a
 *      no-op that writes nothing, and the result says `changed: false` so the
 *      screen can name what really happened instead of flashing "Saved".
 *   4. SIGNED OUT, IT DOES NOT EXIST. There is no anonymous store for this, so
 *      the control is not rendered at all rather than rendered and failing.
 *
 * Plus the thing a locale file cannot enforce on itself: every string in all
 * four languages, actually translated rather than copied.
 *
 * WHAT THIS SANDBOX CANNOT PROVE. Egress to the Supabase host is blocked, so
 * every server read returns signed-out and no write can be attempted from here.
 * The runtime half therefore proves the SIGNED-OUT path - which is rule 4, and
 * is the one runtime path this environment can reach - and the write itself is
 * held by source and schema checks. Nothing below has watched a row change.
 */

import { chromium } from "playwright-core";
import { register } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const REPO = path.join(HERE, "..", "..", "..");
const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");

/*
 * Node strips the TypeScript itself (22.6+). The one thing its resolver will
 * not do is turn a bare relative import into a `.ts` file, and a blanket
 * "append .ts when there is no extension" rule is not enough here: the schema
 * imports `./database.types`, which already looks extensioned. So the hook
 * tries the specifier as written and falls back to `.ts` only when that fails.
 */
const TS_EXTENSION_HOOK = `
export async function resolve(specifier, context, next) {
  try { return await next(specifier, context); }
  catch (error) {
    if (specifier.startsWith(".")) return next(specifier + ".ts", context);
    throw error;
  }
}`;
register("data:text/javascript," + encodeURIComponent(TS_EXTENSION_HOOK), import.meta.url);

let failures = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}${detail ? `\n          ${detail}` : ""}`);
  }
}

/* ------------------------------------------------------- one stored signal */

console.log("\n[source] one signal, one vocabulary");

const actions = read("src/lib/interests/actions.ts");
const schemaSrc = read("src/lib/interests/schema.ts");
const tune = read("src/components/app/IntentTune.tsx");
const card = read("src/components/app/ListingCard.tsx");
const searchPage = read("src/app/(app)/search/page.tsx");
const queries = read("src/lib/interests/queries.ts");

check(
  "the card's write lives beside saveInterests, in lib/interests/actions.ts",
  /export async function adjustInterest\(/.test(actions),
);
check(
  "and it writes profiles.interests, not a table of its own",
  /adjustInterest[\s\S]*?\.from\("profiles"\)[\s\S]*?\.update\(\{[\s\S]*?interests:/.test(actions),
);
check(
  "the component calls that action and nothing else",
  /import \{ adjustInterest \} from "@\/lib\/interests\/actions"/.test(tune) &&
    !/fetch\(|\/api\//.test(tune),
);
check(
  "the vocabulary is the same enum, validated before it leaves the process",
  /adjustInterestSchema = z\.object\(\{[\s\S]*?z\.enum\(PROPERTY_TYPES/.test(schemaSrc),
);
check(
  "and PROPERTY_TYPES is still the generated one, not a hand-written list",
  /Constants\.public\.Enums\.property_type/.test(schemaSrc),
);

/* --------------------------------------------------------------- the client */

console.log("\n[source] the caller's own RLS-bound client");

const adjustBody = actions.slice(actions.indexOf("export async function adjustInterest("));
check(
  "it resolves a session first",
  /const session = await resolveSession\(\)/.test(adjustBody),
);
check(
  "it refuses an unconfigured platform and a signed-out caller by name",
  /NOT_CONFIGURED_MESSAGE/.test(adjustBody) && /SIGNED_OUT_MESSAGE/.test(adjustBody),
);
check(
  "it acts through the session's client",
  /const \{ supabase, user \} = session/.test(adjustBody),
);
check(
  "the service role appears nowhere in the interests module",
  !/service[_-]?role|SERVICE_ROLE|createServiceClient|admin\(\)/i.test(actions),
);
check(
  "it returns the shared ActionResult envelope",
  /Promise<ActionResult<InterestAdjusted>>/.test(adjustBody),
);

/* ------------------------------------------------------------- idempotence */

console.log("\n[source] idempotent, and honest about it");

check(
  "an adjustment that changes nothing returns without writing",
  /if \(held === wants\)[\s\S]{0,160}changed: false/.test(adjustBody),
  "the no-op path does not short-circuit before the update",
);
check(
  "a real write reports changed: true",
  /changed: true/.test(adjustBody),
);
check(
  "and the screen picks its line from that flag, not from a guess",
  /result\.data\.changed[\s\S]{0,220}alreadyUp/.test(tune),
);
check(
  "the optimistic state reverts when the write fails",
  /if \(!result\.ok\) \{[\s\S]{0,220}setRanked\(before\)/.test(tune),
);
check(
  "and the failure shows the action's own message rather than a shrug",
  /setError\(result\.error\)/.test(tune),
);
check(
  "acting on a card also records that the question has been asked",
  /adjustInterest[\s\S]*?mergeSettings\(current\.settings, \{ interestsAsked: true \}\)/.test(
    adjustBody,
  ),
);

/* ------------------------------------------------------------- who sees it */

console.log("\n[source] signed out, it is not rendered");

check(
  "the card renders the control only when intent was handed down",
  /intent !== undefined && tunableKind && \(/.test(card),
);
check(
  "and the search page hands it down only for a signed-in caller",
  /intent=\{tuning\.signedIn \? tuning\.interests : undefined\}/.test(searchPage),
);
check(
  "the query separates 'signed in' from 'stated nothing'",
  /signedIn: boolean/.test(queries) && /signedIn: false, interests: \[\]/.test(queries),
);
/* Comments stripped first: the component's own note explains WHY there is no
   cookie or localStorage fallback, and a naive scan reads that explanation as
   the very thing it is ruling out. */
const tuneCode = tune.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
check(
  "no anonymous fallback store was invented for signed-out visitors",
  !/localStorage|sessionStorage|document\.cookie/.test(tuneCode),
);
check(
  "the control sits outside the card's own Link, so no button nests in an anchor",
  card.indexOf("<IntentTune") < card.indexOf("<Link"),
);
check(
  "the 44pt target is the platform's pseudo-element rule, not a child span",
  /className="nf-tap /.test(tune),
);

/* ------------------------------------------------------------ restaurants */

console.log("\n[source] a market the column cannot hold gets no control");

const schema = await import(
  pathToFileURL(path.join(ROOT, "src/lib/interests/schema.ts")).href
);
/*
 * `restaurant` used to be the example of a market the column cannot hold, and
 * it was the right example right up until the column learned to hold it. The
 * property_type enum gained RESTAURANT, so both checks that named it went red
 * against a schema that is now doing exactly what it should.
 *
 * The example is a value that no enum will ever grow into, so the check tests
 * the RULE rather than a snapshot of the enum's contents: whatever the platform
 * comes to list, a market it does not list is refused.
 */
const NOT_A_MARKET = "sailing-yacht";
check(`${NOT_A_MARKET} is not a property_type`, schema.isPropertyType(NOT_A_MARKET) === false);
check("nor is a market nobody named", schema.isPropertyType("experience") === false);
check("rental is", schema.isPropertyType("rental") === true);
check(
  "and restaurant now is, because the enum grew",
  schema.isPropertyType("restaurant") === true,
);
check(
  "and the card asks before it renders",
  /isPropertyType\(listing\.kind\)/.test(card),
);

console.log("\n[schema] what a client may send");

const good = schema.adjustInterestSchema.safeParse({ type: "rental", direction: "more" });
check("a real market and a real direction pass", good.success === true);
check(
  "an unknown market is refused, not dropped",
  schema.adjustInterestSchema.safeParse({ type: NOT_A_MARKET, direction: "more" }).success ===
    false,
);
check(
  "an unknown direction is refused",
  schema.adjustInterestSchema.safeParse({ type: "rental", direction: "hide" }).success === false,
);
check(
  "a missing direction is refused",
  schema.adjustInterestSchema.safeParse({ type: "rental" }).success === false,
);

/* ---------------------------------------------------------------- the words */

console.log("\n[i18n] every string, in all four languages");

const LOCALES = ["en", "yo", "ha", "ig"];
const dicts = {};
for (const code of LOCALES) {
  const mod = await import(
    pathToFileURL(path.join(REPO, `packages/i18n/src/locales/${code}.ts`)).href
  );
  dicts[code] = mod[code];
}

const enTune = dicts.en.interests.tune;
const enMarkets = dicts.en.interests.markets;

check(
  "the market names are the nine property types and no more",
  Object.keys(enMarkets).sort().join(",") === [...schema.PROPERTY_TYPES].sort().join(","),
  Object.keys(enMarkets).join(","),
);

for (const code of LOCALES.slice(1)) {
  const tuneKeys = Object.keys(dicts[code].interests.tune).sort().join(",");
  const marketKeys = Object.keys(dicts[code].interests.markets).sort().join(",");
  check(
    `${code} carries every tune key`,
    tuneKeys === Object.keys(enTune).sort().join(","),
  );
  check(
    `${code} carries every market name`,
    marketKeys === Object.keys(enMarkets).sort().join(","),
  );
}

/*
 * A key that exists but still reads in English is the failure this platform
 * keeps hitting, so the sentences are checked for having actually been
 * translated. The market NAMES are exempt: "Villa" and "Shortlet" are the words
 * the existing dictionaries already use in all four languages, and forcing a
 * difference there would mean inventing vocabulary.
 */
const untranslated = [];
for (const code of LOCALES.slice(1)) {
  for (const [key, value] of Object.entries(enTune)) {
    if (dicts[code].interests.tune[key] === value) untranslated.push(`${code}.${key}`);
  }
}
check("no tune sentence was left in English", untranslated.length === 0, untranslated.join(", "));

const slotless = [];
for (const code of LOCALES) {
  for (const [key, value] of Object.entries(dicts[code].interests.tune)) {
    if (/\{market\}/.test(enTune[key]) && !value.includes("{market}")) {
      slotless.push(`${code}.${key}`);
    }
  }
}
check(
  "every sentence that names a market kept its slot",
  slotless.length === 0,
  slotless.join(", "),
);

check(
  "the component reads its words from the threaded dictionary, never a literal",
  /const copy = t\.interests\.tune/.test(tune) && /t\.interests\.markets\[type\]/.test(tune),
);
check(
  "and the sentence is one dictionary entry with a slot, not assembled here",
  /\.replace\("\{market\}", market\)/.test(tune),
);

/* ------------------------------------------------------------------ runtime */

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function run(theme) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: theme,
  });
  await context.addInitScript((choice) => {
    try {
      window.localStorage.setItem("nf_theme", choice);
    } catch (error) {
      void error;
    }
  }, theme);
  const page = await context.newPage();

  const serverErrors = [];
  page.on("response", (r) => {
    if (r.status() >= 500) serverErrors.push(`${r.status()} ${r.url()}`);
  });

  try {
    console.log(`\n[${theme} 390px] /search`);
    await page.goto(`${BASE_URL}/search`, { waitUntil: "load" });

    const grid = page.getByTestId("results-grid");
    const hasResults = (await grid.count()) === 1;
    console.log(`          (${hasResults ? "results rendered" : "no results on this run"})`);

    const controls = await page.locator("[data-testid^='intent-tune-']").count();
    /*
     * Named rather than assumed. This sandbox cannot reach Supabase, so the
     * session read returns signed-out and the correct number of controls is
     * zero. If a run ever DOES have a session, the assertion flips rather than
     * silently passing on the wrong branch.
     */
    const signedIn = (await page.locator("[data-testid='nav-account'], a[href='/sign-in']").count()) === 0;
    if (signedIn) {
      check("a signed-in results page carries the control", controls > 0);
    } else {
      check(
        "signed out, no card offers a control that could only fail",
        controls === 0,
        `${controls} control(s) rendered with no session`,
      );
    }

    check(
      "no horizontal scroll at 390px",
      (await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )) === 0,
    );
    check("no route returned a server error", serverErrors.length === 0, serverErrors.join("\n"));
  } finally {
    await context.close();
  }
}

await run("dark");
await run("light");
await browser.close();

console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
