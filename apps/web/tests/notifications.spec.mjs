/**
 * Notifications must never invent an event.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/notifications.spec.mjs
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
 * SINCE 23 SEPTEMBER a signed-out visitor never reaches /notifications: the
 * proxy sends them to the sign-in door (asserted), and the door itself must
 * not carry any of the invented rows. The screen proper is read in the
 * preview harness (`/preview/f4/notifications`, the real list with fixture
 * rows) for the dead Offers chip, and signed in as the QA member on the real
 * route (SKIP without QA_MEMBER_EMAIL / QA_MEMBER_PASSWORD), where the seeded
 * rows must not appear (all but "Booking confirmed", which a real member can
 * genuinely have).
 *
 * Checked at 390px in dark and light.
 */

import { chromium } from "playwright-core";
import { expectSignInWall, onSignInDoor, openPreview, qaContext, signedOutContext, signInAsQa } from "./_gate.mjs";

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

/** The invented rows, verbatim from the deleted component. */
const FABRICATED = [
  "Lekki Palm Grove Shortlet is locked in",
  "Your wallet is ready",
  "New message from Adaeze Okafor",
  "Weekend escape to Calabar",
  "Booking confirmed",
];

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function themed(theme, make) {
  const context = await make({ colorScheme: theme, viewport: { width: 390, height: 844 } });
  await context.addInitScript((t) => {
    try {
      window.localStorage.setItem("nf_theme", t);
    } catch (e) {
      void e;
    }
  }, theme);
  return context;
}

async function run(theme, state) {
  const serverErrors = [];
  const watch = (page) =>
    page.on("response", (r) => {
      if (r.status() >= 500 && !r.url().includes("/_next/image")) {
        serverErrors.push(`${r.status()} ${r.url()}`);
      }
    });

  /* ------------------------------------------------------------ signed out */
  {
    const context = await themed(theme, (o) => signedOutContext(browser, o, BASE_URL));
    const page = await context.newPage();
    watch(page);
    try {
      console.log(`\n[${theme}] /notifications signed out`);
      await expectSignInWall(check, "/notifications", BASE_URL);
      await page.goto(`${BASE_URL}/notifications`, { waitUntil: "load" });
      await page.waitForTimeout(WAIT);
      const appliedTheme = await page.evaluate(() => document.documentElement.dataset.theme ?? "dark");
      check(`the ${theme} theme actually applied`, appliedTheme === (theme === "light" ? "light" : "dark"));
      const text = await page.locator("body").innerText();
      for (const phrase of FABRICATED) {
        check(`no invented notification: "${phrase}"`, !text.includes(phrase));
      }
      check("the sign-in door is on screen instead", onSignInDoor(page) && /Sign in to open that page/.test(text));
      check("the state offers a way onward", (await page.locator("a[href]").count()) > 0);
    } finally {
      await context.close();
    }
  }

  /* ------------------------------------------------ the screen (preview) */
  {
    const context = await themed(theme, (o) => browser.newContext(o));
    const page = await context.newPage();
    watch(page);
    try {
      console.log(`[${theme}] /preview/f4/notifications`);
      if (await openPreview(page, "/preview/f4/notifications", check, { base: BASE_URL, wait: WAIT })) {
        check(
          "the dead Offers filter chip is gone",
          (await page.locator("button", { hasText: /^Offers$/ }).count()) === 0,
        );
      }
    } finally {
      await context.close();
    }
  }

  /* ---------------------------------------------- the real screen (QA) */
  if (state) {
    const context = await themed(theme, (o) => qaContext(browser, state, o));
    const page = await context.newPage();
    watch(page);
    try {
      console.log(`[${theme}] /notifications signed in`);
      await page.goto(`${BASE_URL}/notifications`, { waitUntil: "load" });
      await page.waitForTimeout(WAIT);
      const text = await page.locator("body").innerText();
      for (const phrase of FABRICATED.filter((p) => p !== "Booking confirmed")) {
        check(`no seeded notification: "${phrase}"`, !text.includes(phrase));
      }
      check(
        "the dead Offers filter chip is gone",
        (await page.locator("button", { hasText: /^Offers$/ }).count()) === 0,
      );
    } finally {
      await context.close();
    }
  }

  check("no route returned a server error", serverErrors.length === 0);
  if (serverErrors.length > 0) console.log("   ", serverErrors.join("\n    "));
}

try {
  console.log("signed in as the QA member, for the real screen");
  const state = await signInAsQa(browser, { base: BASE_URL });
  await run("dark", state);
  await run("light", state);
} finally {
  await browser.close();
}

if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
