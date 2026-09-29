/**
 * Around is the feed, and the directory is behind it.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/around-feed.spec.mjs
 *
 * The owner tapped Around in the bottom navigation expecting the conversation
 * and got a list of rooms. `/around` is now the timeline of the places somebody
 * is in, `/around/settings` is the directory that used to be there, and this spec
 * guards the split rather than the contents.
 *
 * WHAT CHANGED SINCE THIS WAS WRITTEN, and is now the intended behaviour:
 *
 *   - 23 September: a signed-out visitor is sent to the sign-in door from
 *     every one of these addresses (`src/proxy.ts`). Asserted first.
 *   - FEED-4: the masthead (logo, filters, settings gear) came off the feed.
 *     The location chip IS the screen's head, the screen's name is an sr-only
 *     `h1`, and a Back control sits on the chip's row because `/around`
 *     declares a parent (`app/(app)/around/page.tsx:171-203`). The way to the
 *     directory from the feed is the empty state's "Find places to join".
 *
 * So:
 *
 * 1. The feed, in the preview harness (`/preview/session-b/feed`, the real
 *    Feed, FeedTabs and LocationChip inside the real AppShell with fixture
 *    posts): the feed surface and NOT the place tree; the head as above; the
 *    tab row a real control (links carrying `?tab=`, the live one marked).
 * 2. The empty feed (`?state=empty`) says so and carries the way to
 *    `/around/settings`.
 * 3. Signed in as the QA member, the real directory renders with the way
 *    into the country, and a place slug is still a place's page (SKIP
 *    without QA_MEMBER_EMAIL / QA_MEMBER_PASSWORD).
 * 4. Nothing scrolls sideways at 390px, in dark or in light; no 5xx.
 */

import { chromium } from "playwright-core";
import { expectSignInWall, openPreview, qaContext, signInAsQa } from "./_gate.mjs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const WAIT = 900;

let failures = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}${detail ? `\n          ${detail}` : ""}`);
  }
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function overflowOf(page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

async function themedContext(theme, state) {
  const options = { viewport: { width: 390, height: 844 }, colorScheme: theme };
  const context = state ? await qaContext(browser, state, options) : await browser.newContext(options);
  await context.addInitScript((choice) => {
    try {
      window.localStorage.setItem("nf_theme", choice);
    } catch (error) {
      void error;
    }
  }, theme);
  return context;
}

async function feed(theme) {
  const context = await themedContext(theme, null);
  const page = await context.newPage();
  const serverErrors = [];
  page.on("response", (r) => {
    if (r.status() >= 500) serverErrors.push(`${r.status()} ${r.url()}`);
  });

  try {
    /* ------------------------------------------------------------ the feed */
    console.log(`\n[${theme} 390px] /preview/session-b/feed (the /around feed)`);
    if (!(await openPreview(page, "/preview/session-b/feed", check, { wait: WAIT }))) return;

    const applied = await page.evaluate(() => document.documentElement.dataset.theme ?? "dark");
    check(`the ${theme} theme actually applied`, applied === theme);

    const feedSurface = page.getByTestId("around-feed");
    check("the feed surface is what Around renders", (await feedSurface.count()) === 1);

    /* The whole point of the change: the front door is not a directory. */
    check(
      "the place tree is not on the feed",
      (await page.getByTestId("place-picker-search").count()) === 0 &&
        (await page.getByTestId("place-picker-states").count()) === 0 &&
        (await page.getByTestId("around-settings-unconfigured").count()) === 0,
    );
    check(
      "the directory surface is not on the feed",
      (await page.getByTestId("around-settings").count()) === 0,
    );
    /* The directory's two lists, by their headings. `text-transform: uppercase`
       means `innerText` reads them back shouting, so this asks the DOM for the
       heading elements rather than searching the page's rendered words. */
    check(
      "neither directory list is on the feed",
      (await page.locator("h2").filter({ hasText: /^\s*open places\s*$/i }).count()) === 0 &&
        (await page.locator("h2").filter({ hasText: /^\s*your places\s*$/i }).count()) === 0,
    );

    const feedText = await page.evaluate(() => document.body.innerText);
    for (const banned of ["demo", "coming soon", "lorem"]) {
      check(`no UI copy says "${banned}"`, !feedText.toLowerCase().includes(banned));
    }

    /* ------------------------------------------------------------ the head */
    check(
      "it names the screen in a real heading, and carries no second logo",
      (await feedSurface.getByRole("heading", { level: 1 }).count()) === 1 &&
        (await feedSurface.locator('img[alt*="Vallo" i]').count()) === 0,
    );
    check("the masthead is gone (FEED-4)", (await page.getByTestId("feed-masthead").count()) === 0);
    check(
      "the way back sits on the chip's row, because /around declares a parent",
      (await feedSurface.locator('[aria-label="Back"]').count()) === 1,
    );

    const tabs = page.getByTestId("feed-tabs");
    check("the tab row is above the feed", (await tabs.count()) === 1);
    check(
      "it is a named landmark",
      (await tabs.evaluate((node) => node.tagName.toLowerCase())) === "nav" &&
        ((await tabs.getAttribute("aria-label")) ?? "").trim().length > 0,
    );
    /* Two segments, as the governing feed image draws them. New came off
       the row on purpose (`FeedMasthead.tsx:26-28`); `?tab=new` still answers. */
    for (const tab of ["for-you", "following"]) {
      check(`the ${tab} tab is there`, (await page.getByTestId(`feed-tab-${tab}`).count()) === 1);
    }
    check("the retired New segment is not drawn", (await page.getByTestId("feed-tab-new").count()) === 0);
    check(
      "For you is the live tab on /around",
      (await page.getByTestId("feed-tab-for-you").getAttribute("aria-current")) === "page",
    );
    check(
      "every tab navigates rather than posting",
      await tabs.evaluate((node) =>
        Array.from(node.querySelectorAll("a")).every((a) => a.getAttribute("href")?.startsWith("/around")),
      ),
    );
    check(
      "the place chip row is gone from the feed",
      (await page.getByTestId("around-switcher").count()) === 0,
    );

    const feedOverflow = await overflowOf(page);
    check(`the feed does not scroll sideways (overflow ${feedOverflow}px)`, feedOverflow <= 1);

    /* ------------------------------------------------------ the empty feed */
    console.log(`\n[${theme} 390px] /preview/session-b/feed?state=empty`);
    await page.goto(`${BASE_URL}/preview/session-b/feed?state=empty`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    const emptyText = await page.getByTestId("around-feed").innerText();
    check("an empty feed says so rather than showing nothing", /Nothing here yet/.test(emptyText), emptyText.slice(0, 160));
    check(
      "and carries the way to the directory",
      (await page.getByTestId("around-feed").locator('a[href="/around/settings"]').count()) >= 1,
    );
    const emptyOverflow = await overflowOf(page);
    check(`the empty feed does not scroll sideways (overflow ${emptyOverflow}px)`, emptyOverflow <= 1);

    check("no route returned a server error", serverErrors.length === 0, serverErrors.join("\n"));
  } finally {
    await context.close();
  }
}

async function directory(theme, state) {
  const context = await themedContext(theme, state);
  const page = await context.newPage();
  const serverErrors = [];
  page.on("response", (r) => {
    if (r.status() >= 500) serverErrors.push(`${r.status()} ${r.url()}`);
  });
  try {
    /* -------------------------------------------------- the manage surface */
    console.log(`\n[${theme} 390px] /around/settings (signed in)`);
    await page.goto(`${BASE_URL}/around/settings`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    check(
      "the directory renders as itself",
      (await page.getByTestId("around-settings").count()) === 1,
    );

    /* The way into the country: the picker, or the one sentence that honestly
       replaces it when there are no platform keys. Which one is printed so a
       green run cannot hide an empty screen. */
    const picker = await page.getByTestId("place-picker-search").count();
    const unconfigured = await page.getByTestId("around-settings-unconfigured").count();
    check(
      "the way into the 774 local governments is on the directory",
      picker === 1 || unconfigured === 1,
      `picker ${picker}, unconfigured notice ${unconfigured}`,
    );
    console.log(
      `          (${picker === 1 ? "the picker rendered" : "no keys, so the unconfigured sentence stood in"})`,
    );

    for (const heading of ["Your places", "Open places"]) {
      check(
        `the directory carries "${heading}"`,
        (await page
          .locator("h2")
          .filter({ hasText: new RegExp(`^\\s*${heading}\\s*$`, "i") })
          .count()) === 1,
      );
    }
    check(
      "the directory offers the way to suggest a place",
      (await page.locator('a[href="/around/new"]').count()) >= 1,
    );
    const manageOverflow = await overflowOf(page);
    check(
      `the directory does not scroll sideways (overflow ${manageOverflow}px)`,
      manageOverflow <= 1,
    );

    /* --------------------------------------- a place stays a place's page */
    console.log(`\n[${theme} 390px] /around/lagos-lekki-phase-1 (signed in)`);
    await page.goto(`${BASE_URL}/around/lagos-lekki-phase-1`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    check(
      "a place slug still resolves to a place, not to the directory",
      (await page.getByTestId("around-settings").count()) === 0 &&
        (await page.getByTestId("around-feed").count()) === 0,
    );
    check("no route returned a server error", serverErrors.length === 0, serverErrors.join("\n"));
  } finally {
    await context.close();
  }
}

try {
  console.log("signed out");
  for (const path of ["/around", "/around?tab=following", "/around/settings", "/around/lagos-lekki-phase-1"]) {
    await expectSignInWall(check, path);
  }
  await feed("dark");
  await feed("light");

  console.log("\nsigned in as the QA member");
  const state = await signInAsQa(browser);
  if (state) {
    await directory("dark", state);
    await directory("light", state);
  }
} finally {
  await browser.close();
}

if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
