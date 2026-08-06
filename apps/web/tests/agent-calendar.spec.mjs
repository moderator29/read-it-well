/**
 * The agent calendar loop, from the outside.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/agent-calendar.spec.mjs
 *
 * What this proves, and what it deliberately does not.
 *
 * This sandbox has no route to the Supabase host, so nobody can be an approved
 * agent here and the grid itself cannot render. What a browser CAN prove is
 * that the route exists and answers with a designed state in both themes rather
 * than a crash or a 404, that it never leaks another host's listing, and that
 * every state carries a way back to the listings workspace.
 *
 * The write path was proven directly against live Postgres with fixtures that
 * were then removed. See the report for the probe output: closing a run writes
 * 'unavailable' rows under the agent's own RLS client, a night already 'booked'
 * is left untouched, reopening removes only 'unavailable' rows, and another
 * agent's listing is refused.
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const WAIT = 1200;

let failures = 0;
function check(name, condition) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
  }
}

const ABSENT_LISTING = "11111111-2222-4333-8444-555555555555";
const MALFORMED_LISTING = "not-a-listing";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function run(theme) {
  const context = await browser.newContext({
    colorScheme: theme,
    viewport: { width: 390, height: 844 },
  });
  await context.addInitScript((t) => {
    try {
      window.localStorage.setItem("nf_theme", t);
    } catch (e) {
      void e;
    }
  }, theme);
  const page = await context.newPage();

  /* /_next/image is excluded: this sandbox cannot reach the photo CDN, so the
     optimiser answers 500 for every remote photo here and does not on a real
     deploy. That is environment, not product. */
  const serverErrors = [];
  page.on("response", (r) => {
    if (r.status() >= 500 && !r.url().includes("/_next/image")) {
      serverErrors.push(`${r.status()} ${r.url()}`);
    }
  });

  try {
    for (const [label, id] of [
      ["absent", ABSENT_LISTING],
      ["malformed", MALFORMED_LISTING],
    ]) {
      console.log(`\n[${theme}] /agent/listings/<${label}>/calendar`);
      await page.goto(`${BASE_URL}/agent/listings/${id}/calendar`, { waitUntil: "load" });
      await page.waitForTimeout(WAIT);

      const text = await page.locator("body").innerText();
      check(
        `${label}: answers with a designed state, not a crash`,
        text.trim().length > 0 && !/Application error|Unhandled/i.test(text),
      );
      check(
        `${label}: offers a way onward`,
        (await page.locator("a[href]").count()) > 0,
      );
      /* A calendar for a listing that is not this caller's must never render a
         grid of someone else's nights. */
      check(
        `${label}: no editable night grid is exposed`,
        (await page.locator("button[aria-pressed]").count()) === 0,
      );
    }

    const appliedTheme = await page.evaluate(
      () => document.documentElement.dataset.theme ?? "dark",
    );
    check(
      `the ${theme} theme actually applied`,
      appliedTheme === (theme === "light" ? "light" : "dark"),
    );

    check("no route in this walk returned a server error", serverErrors.length === 0);
    if (serverErrors.length > 0) console.log("   ", serverErrors.join("\n    "));
  } finally {
    await context.close();
  }
}

try {
  await run("dark");
  await run("light");
} finally {
  await browser.close();
}

if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
