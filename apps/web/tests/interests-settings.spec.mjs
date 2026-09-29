/**
 * Changing your mind about what you came here for.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/interests-settings.spec.mjs
 *
 * `/welcome` asks the question once at the door. Until now there was nowhere to
 * answer it again, and the first-run copy said so on purpose rather than
 * promising a screen nobody had built.
 *
 * The thing most worth guarding is not either screen. It is that there is only
 * ONE set of cards. A second copy for settings is how the two drift: the
 * `property_type` enum grows, one screen gets the new card, and somebody
 * editing their answer later silently loses an option they were offered at the
 * door. So the source checks below prove both routes mount the same component
 * and that the option list is read from the generated enum in exactly one
 * place.
 *
 * THE SCREENS. Since 23 September every settings route answers a signed-out
 * visitor with the sign-in wall (asserted), so nobody without an account can
 * be shown unsaveable cards at all: that fault is now closed one layer up. The
 * signed-in screens are read in the preview harness (the real components with
 * a fixture member): the interests ROW moved from the settings hub to
 * Settings > Account (`app/(app)/settings/account/page.tsx`), and the cards
 * screen is `?v=interests`. Signed in as the QA member the real routes are
 * read too (SKIP without QA_MEMBER_EMAIL / QA_MEMBER_PASSWORD).
 *
 * The number of cards is the number of values in the generated
 * `property_type` enum (ten since RESTAURANT joined it), read from
 * `database.types.ts` rather than retyped.
 */

import { chromium } from "playwright-core";
import { expectSignInWall, openPreview, qaContext, signInAsQa } from "./_gate.mjs";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");

let failures = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}${detail ? `\n          ${detail}` : ""}`);
  }
}

/* ------------------------------------------------------------- one component */

console.log("\n[source] one set of cards, two mounts");

const welcome = read("src/app/welcome/page.tsx");
const settings = read("src/app/(app)/settings/interests/page.tsx");
const choices = read("src/components/app/welcome/InterestChoices.tsx");
/*
 * First run gained a step in front of the question: three cards saying what
 * this place is, which can be slid through or skipped. `FirstRun` owns that
 * order now, so the welcome PAGE mounts `FirstRun` and `FirstRun` mounts the
 * choices. This check used to read the page and grep for the component name,
 * which went red on a page that is still perfectly correct: the mount simply
 * moved one file down.
 *
 * So it follows the indirection rather than asserting on a shape that a
 * refactor is allowed to change. What must hold is that the welcome screen
 * REACHES the one component, not that it names it in a particular file.
 */
const firstRun = read("src/components/app/welcome/FirstRun.tsx");

const IMPORT = /InterestChoices/;
check(
  "the welcome screen reaches InterestChoices, directly or through FirstRun",
  IMPORT.test(welcome) || (/FirstRun/.test(welcome) && IMPORT.test(firstRun)),
);
check("the settings screen mounts the same component", IMPORT.test(settings));
check(
  "settings mounts it in settings mode",
  /mode=\{?"settings"\}?/.test(settings),
);
check(
  "the cards are built from the generated enum, not a hand-written list",
  /PROPERTY_TYPES\.map\(/.test(choices),
);
/* SPEED-6 moved the vocabulary into property-types.ts; schema.ts re-exports it. */
check(
  "and PROPERTY_TYPES comes from the database constants",
  /Constants\.public\.Enums\.property_type/.test(read("src/lib/interests/property-types.ts")),
);
check(
  "skip is offered on the first run only",
  /firstRun && \(\s*<Button[\s\S]{0,400}welcome-skip/.test(choices),
  "the Skip button is not gated on firstRun",
);
/* The sentence moved into the dictionary when the screen learned four
   languages, so the check follows it: the component still appends a
   first-run-only note, and the English one still names Settings. */
check(
  "the first-run copy appends a note only on the first run",
  /firstRun \? t\.interests\.noteFirstRun : ""/.test(choices),
);
check(
  "and that note names the screen this can be changed on",
  /noteFirstRun: "[^"]*Settings/.test(read("../../packages/i18n/src/locales/en.ts")),
);

/* ----------------------------------------------------------------- the screens */

/* The enum, read from the generated types rather than retyped here. */
const ENUM_VALUES = (() => {
  const types = read("src/lib/supabase/database.types.ts");
  const m = /property_type: \[([^\]]+)\]/.exec(types);
  return m ? [...m[1].matchAll(/"([a-z_]+)"/g)].map((x) => x[1]) : [];
})();
check("the generated enum can be read", ENUM_VALUES.length > 0, String(ENUM_VALUES.length));

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

console.log("\n[wall] signed out, none of the settings screens is reachable");
for (const route of ["/settings", "/settings/account", "/settings/interests"]) {
  await expectSignInWall(check, route);
}

async function themed(theme, state) {
  const options = { viewport: { width: 390, height: 844 }, colorScheme: theme };
  const context = state ? await qaContext(browser, state, options) : await browser.newContext(options);
  await context.addInitScript((choice) => {
    try {
      window.localStorage.setItem("nf_theme", choice);
    } catch (error) {
      void error;
    }
  }, theme);
  return context;
}

async function open(page, path) {
  if (path.startsWith("/preview/")) return openPreview(page, path, check, { wait: 1200 });
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "load" });
  await page.waitForTimeout(1200);
  return true;
}

async function run(theme, { state = null, accountPath, interestsPath }) {
  const context = await themed(theme, state);
  const page = await context.newPage();

  const serverErrors = [];
  page.on("response", (r) => {
    if (r.status() >= 500) serverErrors.push(`${r.status()} ${r.url()}`);
  });

  try {
    console.log(`\n[${theme} 390px] ${accountPath}`);
    if (await open(page, accountPath)) {
      const row = page.getByTestId("settings-interests-row");
      check("the account settings list carries the row", (await row.count()) === 1);
      const rowText = (await row.count()) === 1 ? await row.innerText() : "";
      check(
        "the row reads back an answer rather than being a bare label",
        /Not set|Nothing in particular|Not answered yet|Apartments|Hotels|Rentals/.test(rowText),
        rowText,
      );
      check(
        "the cards are NOT inlined into the settings list",
        (await page.getByTestId("interest-rental").count()) === 0,
      );
    }

    console.log(`\n[${theme} 390px] ${interestsPath}`);
    if (await open(page, interestsPath)) {
      const cards = await page.evaluate(
        (values) => values.filter((v) => document.querySelector(`[data-testid="interest-${v}"]`)).length,
        ENUM_VALUES,
      );
      check(
        `every market in the enum has its card (${cards} of ${ENUM_VALUES.length})`,
        cards === ENUM_VALUES.length,
      );
      check("the save control is there", (await page.getByTestId("welcome-save").count()) === 1);
      check("skip is not offered on a screen somebody chose to open", (await page.getByTestId("welcome-skip").count()) === 0);
      /* The way back is the PageHeader's Back control (fallback /settings). */
      check(
        "a way back to settings",
        (await page.locator('button[aria-label="Back"], a[href="/settings"]').count()) >= 1,
      );
      check(
        "no horizontal scroll",
        (await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )) === 0,
      );
    }
    check("no route returned a server error", serverErrors.length === 0, serverErrors.join("\n"));
  } finally {
    await context.close();
  }
}

const PREVIEW = {
  accountPath: "/preview/session-b/sweep-settings?v=account",
  interestsPath: "/preview/session-b/sweep-settings?v=interests",
};
await run("dark", PREVIEW);
await run("light", PREVIEW);

console.log("\n[live] signed in as the QA member");
const state = await signInAsQa(browser);
if (state) {
  const LIVE = { state, accountPath: "/settings/account", interestsPath: "/settings/interests" };
  await run("dark", LIVE);
  await run("light", LIVE);
}
await browser.close();

console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
