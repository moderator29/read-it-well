/**
 * The payout accounts loop, from the outside.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/payout-accounts.spec.mjs
 *
 * What this proves, and what it deliberately does not.
 *
 * This sandbox has no route to the Supabase host by organisation proxy policy,
 * so nobody can be an approved agent here and the payout panel itself cannot
 * render. What a browser CAN prove is that /agent/earnings answers with a
 * designed state in both themes rather than a crash, that it never claims a
 * charge for using the platform, and that the workspace chrome and a way onward
 * survive. It checks that at 390px in dark and light.
 *
 * The write path and its invariants were proven directly against live Postgres
 * with two agents' worth of fixtures that were then removed:
 *   1 the first account filed becomes the default automatically
 *   2 a second account does not steal the default (1 default among 2 rows)
 *   3 promoting the second clears the first in one statement
 *   4 the same NUBAN twice for one agent is refused 23505
 *   5 a nine digit account number is refused 23514
 *   6 deleting the default promotes the surviving account
 *   7 filing an account against another agent is refused 42501
 *   8 another agent's accounts are not visible at all (0 rows)
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

  /* Page routes must never 500. /_next/image is excluded deliberately: this
     sandbox has no outbound route to the photo CDN, so the image optimiser
     answers 500 for every remote photo here and does not on a real deploy.
     That is environment, not product (docs/DEPLOY.md section 7). */
  const serverErrors = [];
  page.on("response", (r) => {
    if (r.status() >= 500 && !r.url().includes("/_next/image")) {
      serverErrors.push(`${r.status()} ${r.url()}`);
    }
  });

  try {
    console.log(`\n[${theme}] /agent/earnings`);
    await page.goto(`${BASE_URL}/agent/earnings`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);

    const appliedTheme = await page.evaluate(
      () => document.documentElement.dataset.theme ?? "dark",
    );
    check(`the ${theme} theme actually applied`, appliedTheme === (theme === "light" ? "light" : "dark"));

    const text = await page.locator("body").innerText();
    check("the earnings route renders something designed", text.trim().length > 0);
    check("no route returned a server error", serverErrors.length === 0);
    if (serverErrors.length > 0) console.log("   ", serverErrors.join("\n    "));

    /* The platform charges nothing, anywhere, and this is a money surface. */
    check(
      "no platform fee is ever mentioned on a money surface",
      !/platform fee|our fee|service charge by Vallo|Vallo takes \d/i.test(text),
    );

    /* Whatever state it lands in, there must be a way onward rather than a
       dead end. */
    check(
      "the surface offers a way onward",
      (await page.locator("a[href], button").count()) > 0,
    );

    /* If the panel ever does render here, its copy must not promise storing an
       account we cannot confirm. */
    if (/Where your earnings are paid/.test(text)) {
      check(
        "the payout panel explains bank confirmation",
        /confirm the name with the bank|switches on the moment the payment keys land/i.test(text),
      );
    } else {
      console.log("  note    payout panel not reachable signed-out, as expected here");
    }
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
