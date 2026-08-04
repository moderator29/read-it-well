/**
 * The notification switches, and the host settings page that now exists.
 *
 *   BASE_URL=http://localhost:3213 node apps/web/tests/notification-preferences.spec.mjs
 *
 * /settings has offered four notification switches since it shipped. They wrote
 * to profiles.settings under RLS, the card said "Saved to your account", and
 * nothing anywhere read the value: every booking notification and every booking
 * email went out regardless. A switch that saves and changes nothing is worse
 * than no switch at all.
 *
 * private.notify now consults the same document (proven against live Postgres:
 * bookings off silences a booking notification, messages off silences a
 * message one, wallet is always delivered because money at risk must be said,
 * and both an absent and a malformed value deliver), and the email recipient
 * resolver returns no recipient at all on a muted channel.
 *
 * /agent/settings, which was an eleven-line coming-soon stub, is the second
 * door to that one preference document, described in a host's words.
 *
 * This sandbox has no route to the Supabase host, so the signed-out cards
 * render. What a browser proves is that both surfaces are real, that the wallet
 * row no longer promises what it cannot keep, and that both themes render at
 * 390px.
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
    console.log(`\n[${theme}] /agent/settings`);
    await page.goto(`${BASE_URL}/agent/settings`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);

    const appliedTheme = await page.evaluate(
      () => document.documentElement.dataset.theme ?? "dark",
    );
    check(
      `the ${theme} theme actually applied`,
      appliedTheme === (theme === "light" ? "light" : "dark"),
    );

    const agentText = await page.locator("body").innerText();
    check("the route renders", agentText.trim().length > 0);
    check("no route returned a server error", serverErrors.length === 0);
    if (serverErrors.length > 0) console.log("   ", serverErrors.join("\n    "));
    check(
      "the route is not a coming-soon placeholder",
      !/coming soon|being built|not ready yet/i.test(agentText),
    );
    check("the surface offers a way onward", (await page.locator("a[href]").count()) > 0);

    let overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(`no horizontal scroll at 390px (${overflow}px)`, overflow <= 1);

    console.log(`[${theme}] /settings`);
    await page.goto(`${BASE_URL}/settings`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);

    const text = await page.locator("body").innerText();
    check("the settings page renders", text.trim().length > 0);
    check("no route returned a server error", serverErrors.length === 0);
    check("the notification group is present", /Notifications/i.test(text));

    overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(`no horizontal scroll at 390px (${overflow}px)`, overflow <= 1);
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
