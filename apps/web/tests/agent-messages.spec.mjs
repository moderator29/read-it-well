/**
 * The host inbox, and the badge that used to lie.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/agent-messages.spec.mjs
 *
 * The headline check here is a regression guard with teeth: the agent
 * navigation carried a hardcoded `badge: 3` on /agent/messages, so every agent
 * saw three unread messages permanently, on a route that was a placeholder, and
 * no amount of reading could ever clear it. A badge is now rendered only from a
 * real count, and zero renders nothing. This spec fails if a literal ever comes
 * back.
 *
 * Since 23 September a signed-out visitor never reaches /agent/messages: it
 * answers the sign-in wall (`src/proxy.ts`), which is asserted first. The
 * inbox itself is then read in the preview harness (`/preview/f5/agent-messages`),
 * which renders the real AgentShell and AgentInbox with fixture threads and
 * passes the shell NO unread count, so a badge carrying a number there can
 * only be a literal. Signed in as the QA member, the real route and its
 * `?filter=all` address are read too (SKIP without QA_MEMBER_EMAIL /
 * QA_MEMBER_PASSWORD). Checked at 390px in both themes.
 */

import { chromium } from "playwright-core";
import { expectSignInWall, openPreview, qaContext, signInAsQa } from "./_gate.mjs";

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

/**
 * One theme over a list of addresses. `state` is the QA session or null; the
 * first path is the inbox, the rest are its filter addresses.
 */
async function run(theme, { state = null, paths }) {
  const options = { colorScheme: theme, viewport: { width: 390, height: 844 } };
  const context = state ? await qaContext(browser, state, options) : await browser.newContext(options);
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
    const [inbox, ...filters] = paths;
    console.log(`\n[${theme}] ${inbox}`);
    if (!state) {
      if (!(await openPreview(page, inbox, check))) return;
    } else {
      await page.goto(`${BASE_URL}${inbox}`, { waitUntil: "load" });
      await page.waitForTimeout(WAIT);
    }

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
       from a real count. The harness passes the shell no count, and the QA
       member is not an agent, so no badge element may carry a number. */
    /* Scoped to the navigation (rail, bar and drawer), which is where the
       literal lived. A thread row in the inbox carries its own fixture unread
       count, which is data, not the navigation's claim. */
    const badgeTexts = await page
      .locator("nav .nf-badge, header .nf-badge, aside .nf-badge")
      .allInnerTexts()
      .catch(() => []);
    check(
      "the navigation is in the page, so the badge check reads something",
      (await page.locator('nav a[href="/agent/messages"], aside a[href="/agent/messages"]').count()) > 0,
    );
    const numericBadges = badgeTexts.map((b) => b.trim()).filter((b) => /^\d+$/.test(b));
    check(
      `no invented unread count in the navigation (saw ${JSON.stringify(numericBadges)})`,
      numericBadges.length === 0,
    );
    check("specifically, no permanent 3", !numericBadges.includes("3"));

    /* Whatever state it lands in there must be a way onward. */
    check("the surface offers a way onward", (await page.locator("a[href]").count()) > 0);

    for (const path of filters) {
      console.log(`[${theme}] ${path}`);
      await page.goto(`${BASE_URL}${path}`, { waitUntil: "load" });
      await page.waitForTimeout(WAIT);
      check(
        "the filter is addressable and does not error",
        serverErrors.length === 0 && (await page.locator("body").innerText()).trim().length > 0,
      );
    }
  } finally {
    await context.close();
  }
}

try {
  console.log("signed out");
  await expectSignInWall(check, "/agent/messages");
  await expectSignInWall(check, "/agent/messages?filter=all");

  await run("dark", { paths: ["/preview/f5/agent-messages"] });
  await run("light", { paths: ["/preview/f5/agent-messages"] });

  console.log("\nsigned in as the QA member");
  const state = await signInAsQa(browser);
  if (state) {
    await run("dark", { state, paths: ["/agent/messages", "/agent/messages?filter=all"] });
    await run("light", { state, paths: ["/agent/messages", "/agent/messages?filter=all"] });
  }
} finally {
  await browser.close();
}

if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
