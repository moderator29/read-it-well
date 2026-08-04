/**
 * The host inbox, and the badge that used to lie.
 *
 *   BASE_URL=http://localhost:3213 node apps/web/tests/agent-messages.spec.mjs
 *
 * The headline check here is a regression guard with teeth: the agent
 * navigation carried a hardcoded `badge: 3` on /agent/messages, so every agent
 * saw three unread messages permanently, on a route that was a placeholder, and
 * no amount of reading could ever clear it. A badge is now rendered only from a
 * real count, and zero renders nothing. This spec fails if a literal ever comes
 * back.
 *
 * This sandbox has no route to the Supabase host, so nobody is an approved
 * agent here and the inbox itself renders its signed-out pitch. What a browser
 * can prove is that the route is no longer a placeholder, that the navigation
 * carries no invented count, and that both themes render. Checked at 390px.
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

  /* /_next/image is excluded: this sandbox cannot reach the photo CDN, so the
     optimiser answers 500 for remote photos here and does not on a real
     deploy. Environment, not product (docs/DEPLOY.md section 7). */
  const serverErrors = [];
  page.on("response", (r) => {
    if (r.status() >= 500 && !r.url().includes("/_next/image")) {
      serverErrors.push(`${r.status()} ${r.url()}`);
    }
  });

  try {
    console.log(`\n[${theme}] /agent/messages`);
    await page.goto(`${BASE_URL}/agent/messages`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);

    const appliedTheme = await page.evaluate(
      () => document.documentElement.dataset.theme ?? "dark",
    );
    check(
      `the ${theme} theme actually applied`,
      appliedTheme === (theme === "light" ? "light" : "dark"),
    );

    const text = await page.locator("body").innerText();
    check("the route renders", text.trim().length > 0);
    check("no route returned a server error", serverErrors.length === 0);
    if (serverErrors.length > 0) console.log("   ", serverErrors.join("\n    "));

    /* It must no longer be a coming-soon placeholder. */
    check(
      "the route is not a coming-soon placeholder",
      !/coming soon|being built|not ready yet/i.test(text),
    );

    /* THE REGRESSION GUARD. Any badge on the messages destination must come
       from a real count. In this signed-out sandbox the count is zero, so no
       badge element may carry a number at all. */
    const badgeTexts = await page
      .locator(".nf-badge")
      .allInnerTexts()
      .catch(() => []);
    const numericBadges = badgeTexts.map((b) => b.trim()).filter((b) => /^\d+$/.test(b));
    check(
      `no invented unread count in the navigation (saw ${JSON.stringify(numericBadges)})`,
      numericBadges.length === 0,
    );
    check("specifically, no permanent 3", !numericBadges.includes("3"));

    /* Whatever state it lands in there must be a way onward. */
    check("the surface offers a way onward", (await page.locator("a[href]").count()) > 0);

    console.log(`[${theme}] /agent/messages?filter=all`);
    await page.goto(`${BASE_URL}/agent/messages?filter=all`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    check(
      "the filter is addressable and does not error",
      serverErrors.length === 0 && (await page.locator("body").innerText()).trim().length > 0,
    );
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
