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
 * This sandbox has no route to the Supabase host, so the seed threads carry the
 * surface and the mark-all control is correctly absent (there is no server read
 * state to clear). Checked at 390px in both themes.
 */

import { chromium } from "playwright-core";

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

async function run(theme) {
  const context = await browser.newContext({
    colorScheme: theme,
    viewport: { width: 390, height: 844 },
  });
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
    console.log(`\n[${theme}] /messages`);
    await page.goto(`${BASE_URL}/messages`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);

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

    /*
     * The inbox belongs to a session. Signed out, `/messages` renders the way
     * in rather than an empty inbox, and asserting a compose button against
     * that screen is asserting the wrong screen - it went red on the ABSENCE
     * OF A SESSION rather than on a fault, which is how a suite teaches people
     * to ignore it. This sandbox cannot reach Supabase, so which branch ran is
     * printed rather than assumed.
     */
    const signedIn = (await page.locator('[data-testid="inbox-compose"]').count()) === 1;
    console.log(`    (${signedIn ? "signed in" : "no session, so the way in"})`);

    if (!signedIn) {
      check(
        "signed out, it offers the way in rather than an empty inbox",
        (await page.locator('a[href^="/sign-in"]').count()) >= 1,
      );
    } else {
      check("there is a search field", (await page.locator('[data-testid="inbox-search"]').count()) === 1);
      check(
        "the search field says what it searches",
        (await page.locator('[data-testid="inbox-search"]').getAttribute("placeholder")) ===
          "Search messages...",
      );

      const tabs = await page.locator('[role="tab"]').allInnerTexts();
      const labels = tabs.map((t) => t.replace(/\s*\d+$/, "").trim());
      check(
        `three tabs, All, Primary and Requests (${JSON.stringify(labels)})`,
        labels.length === 3 &&
          labels[0] === "All" &&
          labels[1] === "Primary" &&
          labels[2] === "Requests",
      );
      check(
        "All is the one selected on arrival",
        (await page.locator('[role="tab"][aria-selected="true"]').innerText()).startsWith("All"),
      );
    }

    const rows = await page.locator('[data-testid="inbox-row"]').count();
    console.log(`    rows: ${rows}`);

    /* Requests must be a designed empty state, never a blank panel. */
    await page.locator('[role="tab"]', { hasText: "Requests" }).click();
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
    await page.locator('[role="tab"]', { hasText: "All" }).click();
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
