/**
 * Notifications must never invent an event.
 *
 *   BASE_URL=http://localhost:3213 node apps/web/tests/notifications.spec.mjs
 *
 * The defect this guards: /notifications rendered a hardcoded list of five
 * invented notifications, unlabelled, to every visitor including one who had
 * never booked anything. It told them "Booking confirmed, Lekki Palm Grove
 * Shortlet is locked in" and "Your wallet is ready", on the one surface whose
 * entire value is that it can be believed.
 *
 * The strings below are the exact seeded copy that used to render. If any of
 * them ever comes back to a signed-out visitor, this spec fails.
 *
 * Checked at 390px in dark and light.
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3213";
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

/** The invented rows, verbatim from the deleted component. */
const FABRICATED = [
  "Lekki Palm Grove Shortlet is locked in",
  "Your wallet is ready",
  "New message from Adaeze Okafor",
  "Weekend escape to Calabar",
  "Booking confirmed",
];

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

  const serverErrors = [];
  page.on("response", (r) => {
    if (r.status() >= 500 && !r.url().includes("/_next/image")) {
      serverErrors.push(`${r.status()} ${r.url()}`);
    }
  });

  try {
    console.log(`\n[${theme}] /notifications signed out`);
    await page.goto(`${BASE_URL}/notifications`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);

    const appliedTheme = await page.evaluate(
      () => document.documentElement.dataset.theme ?? "dark",
    );
    check(
      `the ${theme} theme actually applied`,
      appliedTheme === (theme === "light" ? "light" : "dark"),
    );

    const text = await page.locator("body").innerText();

    for (const phrase of FABRICATED) {
      check(`no invented notification: "${phrase}"`, !text.includes(phrase));
    }

    check(
      "an honest state is on screen instead",
      /Notifications switch on shortly|Sign in to see your notifications/.test(text),
    );
    check("the state offers a way onward", (await page.locator("a[href]").count()) > 0);
    check(
      "the dead Offers filter chip is gone",
      (await page.locator("button", { hasText: /^Offers$/ }).count()) === 0,
    );
    check("no route returned a server error", serverErrors.length === 0);
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
