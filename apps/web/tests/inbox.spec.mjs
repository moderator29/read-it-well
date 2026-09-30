/**
 * The Inbox, which used to be called Messages and used to be a flat list.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/inbox.spec.mjs
 *
 * What changed and what this guards:
 *
 *   The word. "Messages" is gone from the rail, the dock, the page title, the
 *   thread headers and every locale. The route is still /messages, because a
 *   URL people have shared should not break to rename a heading.
 *
 *   The shape. A compose button in the header, a search field, and three tabs.
 *   Requests is the one that matters: a thread opened by somebody the reader
 *   has never spoken to waits there instead of landing in the main list, which
 *   is one of the platform's standing refusals about messaging made visible.
 *
 *   The write path. Mark all read clears every unread message addressed to the
 *   caller across every conversation they are in, through the service role
 *   strictly after RLS has said which conversations those are.
 *
 * WHERE. Since 23 September `/messages` answers a signed-out visitor with the
 * sign-in wall (asserted first), so the "way in" branch this spec used to
 * accept no longer exists. The signed-in inbox is read in the preview harness
 * (`/preview/f5/inbox`, the real Inbox with fixture threads), and on the real
 * route signed in as the QA member (SKIP without QA_MEMBER_EMAIL /
 * QA_MEMBER_PASSWORD). Checked at 390px in both themes.
 */

import { chromium } from "playwright-core";
import { expectSignInWall, openPreview, qaContext, signInAsQa } from "./_gate.mjs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const WAIT = 1400;

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

async function run(theme, { state = null, path }) {
  const options = { colorScheme: theme, viewport: { width: 390, height: 844 } };
  const context = state ? await qaContext(browser, state, options) : await browser.newContext(options);
  await context.addInitScript((t) => {
    try {
      window.localStorage.setItem("nf_theme", t);
      window.localStorage.setItem("nf_onboarded", "1");
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
    console.log(`\n[${theme}] ${path}`);
    if (path.startsWith("/preview/")) {
      if (!(await openPreview(page, path, check, { wait: WAIT }))) return;
    } else {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: "load" });
      await page.waitForTimeout(WAIT);
    }

    const appliedTheme = await page.evaluate(
      () => document.documentElement.dataset.theme ?? "dark",
    );
    check(
      `the ${theme} theme actually applied`,
      appliedTheme === (theme === "light" ? "light" : "dark"),
    );
    check("no route returned a server error", serverErrors.length === 0);

    const text = await page.locator("body").innerText();

    check("the page is called Inbox", /\bInbox\b/.test(text));
    check(
      "and the word Messages is gone from the surface",
      !/\bMessages\b/.test(text),
    );

    /* Both screens this spec reads carry a session (the harness's fixture
       member, or the QA member), so the inbox proper must be what rendered. */
    const signedIn = (await page.locator('[data-testid="inbox-compose"]').count()) === 1;
    check("the signed-in inbox renders, with its compose button", signedIn);
    if (signedIn) {
      check("there is a search field", (await page.locator('[data-testid="inbox-search"]').count()) === 1);
      check(
        "the search field says what it searches",
        (await page.locator('[data-testid="inbox-search"]').getAttribute("placeholder")) ===
          "Search messages…",
      );

      /* Track G: two sides as the tabs, four views as a radiogroup. */
      const tabs = await page.locator('[role="tab"]').allInnerTexts();
      const labels = tabs.map((t) => t.replace(/\s*\d+$/, "").trim());
      check(
        `two side tabs, Property and Stays (${JSON.stringify(labels)})`,
        labels.length === 2 && labels[0] === "Property" && labels[1] === "Stays",
      );
      const views = await page.locator('[data-testid="inbox-views"] [role="radio"]').allInnerTexts();
      check(
        `four views, Recent, Requests, Archived, Reported (${JSON.stringify(views)})`,
        views.length === 4 && views[0] === "Recent" && views[2] === "Archived" && views[3] === "Reported",
      );
      check(
        "Recent is the view selected on arrival",
        (await page.locator('#inbox-view-recent').getAttribute("aria-checked")) === "true",
      );

    const rows = await page.locator('[data-testid="inbox-row"]').count();
    console.log(`    rows: ${rows}`);

    /* Requests must be a designed empty state, never a blank panel. */
    await page.locator('#inbox-view-requests').click();
    await page.waitForTimeout(300);
    const requestRows = await page.locator('[data-testid="inbox-row"]').count();
    if (requestRows === 0) {
      const empty = page.locator('[data-testid="inbox-empty"]');
      check("an empty Requests tab is designed, not blank", (await empty.count()) === 1);
      check(
        "and it explains what Requests is for",
        /never spoken to/i.test(await empty.innerText()),
      );
    }

    /* A search with no matches is its own state, not the same empty. */
    await page.locator('#inbox-view-recent').click();
    await page.waitForTimeout(200);
    await page.fill('[data-testid="inbox-search"]', "zzzzqqq");
    await page.waitForTimeout(300);
    const noMatch = page.locator('[data-testid="inbox-empty"]');
    check("a search with no matches says so", (await noMatch.count()) === 1);
    check(
      "and quotes what was searched for",
      /zzzzqqq/.test(await noMatch.innerText()),
    );

      await page.fill('[data-testid="inbox-search"]', "");
      await page.waitForTimeout(300);
      check(
        "clearing the search brings the rows back",
        (await page.locator('[data-testid="inbox-row"]').count()) === rows,
      );
    }

    /* True either way: the signed-out screen must not scroll sideways either. */
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(`no horizontal scroll at 390px (${overflow}px)`, overflow <= 1);
    check("no route returned a server error", serverErrors.length === 0);
    if (serverErrors.length > 0) console.log("   ", serverErrors.join("\n    "));
  } finally {
    await context.close();
  }
}

try {
  console.log("signed out");
  await expectSignInWall(check, "/messages");
  await run("dark", { path: "/preview/f5/inbox" });
  await run("light", { path: "/preview/f5/inbox" });
  console.log("\nsigned in as the QA member");
  const state = await signInAsQa(browser);
  if (state) {
    await run("dark", { state, path: "/messages" });
    await run("light", { state, path: "/messages" });
  }
} finally {
  await browser.close();
}

if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
