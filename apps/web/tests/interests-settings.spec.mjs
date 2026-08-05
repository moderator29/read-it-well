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
 * This sandbox cannot reach Supabase, so every session read returns signed-out
 * and the account explainer is what renders. That is asserted here rather than
 * worked around: a settings screen that shows unsaveable cards to somebody with
 * no account is the fault this shape exists to avoid.
 */

import { chromium } from "playwright-core";
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

const IMPORT = /InterestChoices/;
check("the welcome screen mounts InterestChoices", IMPORT.test(welcome));
check("the settings screen mounts the same component", IMPORT.test(settings));
check(
  "settings mounts it in settings mode",
  /mode=\{?"settings"\}?/.test(settings),
);
check(
  "the cards are built from the generated enum, not a hand-written list",
  /PROPERTY_TYPES\.map\(/.test(choices),
);
check(
  "and PROPERTY_TYPES comes from the database constants",
  /Constants\.public\.Enums\.property_type/.test(read("src/lib/interests/schema.ts")),
);
check(
  "skip is offered on the first run only",
  /firstRun && \(\s*<Button[\s\S]{0,400}welcome-skip/.test(choices),
  "the Skip button is not gated on firstRun",
);
check(
  "the first-run copy now names the screen this can be changed on",
  /firstRun \? " You can change it later in Settings\." : ""/.test(choices),
);

/* ----------------------------------------------------------------- the screens */

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
    console.log(`\n[${theme} 390px] /settings`);
    await page.goto(`${BASE_URL}/settings`, { waitUntil: "load" });

    const row = page.getByTestId("settings-interests-row");
    check("the settings list carries the row", (await row.count()) === 1);
    check(
      "the row reads back an answer rather than being a bare label",
      /Not set|Nothing in particular|Not answered yet|Apartments|Hotels|Rentals/.test(
        await row.innerText(),
      ),
      await row.innerText(),
    );
    check(
      "the nine cards are NOT inlined into the settings list",
      (await page.getByTestId("interest-rental").count()) === 0,
    );

    console.log(`\n[${theme} 390px] /settings/interests`);
    await page.goto(`${BASE_URL}/settings/interests`, { waitUntil: "load" });
    const text = await page.evaluate(() => document.body.innerText);

    /*
     * Signed out here, because Supabase is unreachable from this sandbox. Both
     * branches are named so a green run can never be mistaken for a run with a
     * real session behind it.
     */
    const signedIn = (await page.getByTestId("interests-settings").count()) === 1;
    console.log(`          (${signedIn ? "signed in" : "no session, so the account explainer"})`);

    if (signedIn) {
      check("all nine cards are on the screen", (await page.locator("[data-testid^='interest-']").count()) === 9);
      check("the save control is there", (await page.getByTestId("welcome-save").count()) === 1);
      check("skip is not offered on a screen somebody chose to open", (await page.getByTestId("welcome-skip").count()) === 0);
    } else {
      check("it explains that the answer belongs to an account", /belongs to your account/i.test(text));
      check("and offers the way in", (await page.locator('a[href="/sign-in"]').count()) >= 1);
      check(
        "no unsaveable cards are shown",
        (await page.locator("[data-testid^='interest-']").count()) === 0,
      );
    }

    check(
      "a way back to settings",
      (await page.locator('a[href="/settings"]').count()) >= 1,
    );
    check(
      "no horizontal scroll",
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
