/**
 * i18n completion checks for the newest surfaces.
 *
 * The agent listing wizard and the admin console were the two places that
 * shipped with English hardcoded into the components. Both now read every
 * string from `packages/i18n`, which introduces exactly one new failure mode: a
 * key that resolves to nothing, or a template that leaks its own dotted path
 * into the page. This script goes looking for that.
 *
 * It asserts three things at phone size (390x844, dark), for both surfaces:
 *   1. The page responds and renders a real, non-empty heading.
 *   2. No dictionary path ("agentListings.", "admin.") appears as visible copy.
 *   3. No unfilled placeholder ("{count}", "{when}") survives into the text.
 *
 * The sandbox carries no Supabase keys and no session, so /agent/list resolves
 * to the wizard or the pitch and /admin resolves to the access screen. All
 * three are real product states, and all three are fully translated, so the
 * checks below hold whichever one answers.
 *
 * Self-contained: no runner, no config. Run with a server already listening:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/i18n.spec.mjs
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const EXECUTABLE = "/opt/pw-browsers/chromium";
const WAIT = 1200;

const failures = [];
function check(label, condition) {
  if (condition) {
    console.log(`  ok    ${label}`);
  } else {
    failures.push(label);
    console.log(`  FAIL  ${label}`);
  }
}

/**
 * A raw key looks like `agentListings.wizard.next` or `admin.common.working`:
 * the section name, a dot, then more identifier. Matching the dotted shape
 * rather than the bare word keeps real sentences ("admin. Then...") from
 * tripping the check, and still catches every leaked lookup path.
 */
const KEY_PATTERNS = [
  { name: "agentListings.", re: /agentListings\.[A-Za-z]/ },
  { name: "admin.", re: /\badmin\.[a-z][A-Za-z]*\./ },
  { name: "agent.", re: /\bagent\.(nav|dashboard|mode)\./ },
];

/** An unfilled template placeholder is a translation bug, not a design. */
const PLACEHOLDER = /\{[a-z][a-zA-Z]*\}/;

async function auditPage(page, route) {
  console.log(route);
  const response = await page.goto(`${BASE_URL}${route}`, { waitUntil: "load" });
  await page.waitForTimeout(WAIT);

  check(`${route} responds without a server error`, (response?.status() ?? 500) < 500);

  const text = await page.locator("body").innerText();
  check(`${route} renders more than a shell`, text.trim().length > 40);

  // A heading with words in it. Any of the three honest states carries one.
  const headings = await page.locator("h1, h2").allInnerTexts();
  const named = headings.filter((heading) => heading.trim().length > 2);
  check(`${route} renders a non-empty heading`, named.length > 0);

  for (const { name, re } of KEY_PATTERNS) {
    check(`${route} leaks no raw key: ${name}`, !re.test(text));
  }

  const placeholder = text.match(PLACEHOLDER);
  check(
    `${route} fills every placeholder${placeholder ? ` (found ${placeholder[0]})` : ""}`,
    placeholder === null,
  );

  // An untranslated surface at 390px is the other half of the promise: copy in
  // Yoruba is no use if the layout breaks on the phone it renders on.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check(`${route} does not overflow sideways at 390px`, overflow <= 1);
}

const browser = await chromium.launch({ executablePath: EXECUTABLE });
const context = await browser.newContext({
  colorScheme: "dark",
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();

try {
  await auditPage(page, "/agent/list");
  await auditPage(page, "/admin");
} finally {
  await browser.close();
}

console.log("");
if (failures.length > 0) {
  console.log(`${failures.length} check(s) failed:`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("all i18n checks passed");
