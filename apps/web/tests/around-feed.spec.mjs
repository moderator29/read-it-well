/**
 * Around is the feed, and the directory is behind it.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/around-feed.spec.mjs
 *
 * The owner tapped Around in the bottom navigation expecting the conversation
 * and got a list of rooms. `/around` is now the timeline of the places somebody
 * is in, `/around/manage` is the directory that used to be there, and this spec
 * guards the split rather than the contents.
 *
 * 1. `/around` renders the feed surface and NOT the place tree.
 * 2. `/around/manage` renders the directory and the way into the country.
 * 3. The switcher above the feed is a real control: links carrying `?place=`,
 *    with the live one marked, so a reload and the back button both work.
 * 4. Neither screen scrolls sideways at 390px, in dark or in light.
 * 5. No route answers with a 5xx.
 *
 * This sandbox cannot reach Supabase, so every read comes back empty and the
 * pages render their unconfigured and empty states. That is the honest answer
 * here and it is what is asserted: the SHAPE of each screen and the failure
 * path, never live rows. The picker in particular cannot draw the 36 states
 * without keys, so the spec accepts either the picker or the sentence that
 * stands in for it, and prints which one it saw.
 */

import { chromium } from "playwright-core";

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

async function run(theme) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: theme,
  });
  await context.addInitScript((choice) => {
    try {
      window.localStorage.setItem("nf_theme", choice);
    } catch (error) {
      void error;
    }
  }, theme);
  const page = await context.newPage();

  const serverErrors = [];
  page.on("response", (r) => {
    if (r.status() >= 500) serverErrors.push(`${r.status()} ${r.url()}`);
  });

  try {
    /* ------------------------------------------------------------ the feed */
    console.log(`\n[${theme} 390px] /around`);
    await page.goto(`${BASE_URL}/around`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);

    const applied = await page.evaluate(() => document.documentElement.dataset.theme ?? "dark");
    check(`the ${theme} theme actually applied`, applied === theme);

    const feed = page.getByTestId("around-feed");
    check("the feed surface is what Around renders", (await feed.count()) === 1);

    /* The whole point of the change: the front door is not a directory. */
    check(
      "the place tree is not on the feed",
      (await page.getByTestId("place-picker-search").count()) === 0 &&
        (await page.getByTestId("place-picker-states").count()) === 0 &&
        (await page.getByTestId("around-manage-unconfigured").count()) === 0,
    );
    check(
      "the directory surface is not on the feed",
      (await page.getByTestId("around-manage").count()) === 0,
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
    check(
      "an empty feed says so rather than showing nothing",
      feedText.trim().length > 60,
      feedText.slice(0, 160),
    );

    /* -------------------------------------------------------- the switcher */
    const switcher = page.getByTestId("around-switcher");
    check("the switcher is above the feed", (await switcher.count()) === 1);
    check(
      "the switcher is a real control, not a caption",
      (await switcher.locator("a").count()) >= 2,
      `${await switcher.locator("a").count()} links`,
    );
    check(
      "the switcher is a named landmark",
      (await switcher.evaluate((node) => node.tagName.toLowerCase())) === "nav",
    );
    const all = page.getByTestId("around-switcher-all");
    check(
      "the combined feed is the live chip on /around",
      (await all.getAttribute("aria-current")) === "page",
    );
    check(
      "every switcher chip navigates rather than posting",
      await switcher.evaluate((node) =>
        Array.from(node.querySelectorAll("a")).every((a) => (a.getAttribute("href") ?? "").startsWith("/around")),
      ),
    );

    /* One obvious control from the feed to everything behind it.
       Scoped to the feed surface on purpose: the desktop navigation rail also
       carries the row, and it is `display: none` on a phone, so an unscoped
       locator would pass on a link nobody can see and then fail to click it. */
    const toManage = feed.locator('a[href="/around/manage"]');
    check("the feed carries a way to the directory", (await toManage.count()) >= 1);

    const feedOverflow = await overflowOf(page);
    check(`the feed does not scroll sideways (overflow ${feedOverflow}px)`, feedOverflow <= 1);

    /* -------------------------------------------------- the manage surface */
    console.log(`\n[${theme} 390px] /around/manage`);
    await toManage.first().click();
    await page.waitForLoadState("load");
    await page.waitForTimeout(WAIT);

    check(
      "the control on the feed lands on the directory",
      new URL(page.url()).pathname === "/around/manage",
      page.url(),
    );

    check(
      "the directory renders as itself",
      (await page.getByTestId("around-manage").count()) === 1,
    );

    /* The way into the country: the picker, or the one sentence that honestly
       replaces it when there are no platform keys. Either is a pass; which one
       is printed so a green run cannot hide an empty screen. */
    const picker = await page.getByTestId("place-picker-search").count();
    const unconfigured = await page.getByTestId("around-manage-unconfigured").count();
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
    console.log(`\n[${theme} 390px] /around/lagos-lekki-phase-1`);
    await page.goto(`${BASE_URL}/around/lagos-lekki-phase-1`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    /* With no keys this resolves to the unconfigured branch rather than a 404,
       which is the designed answer and the one thing worth asserting: the
       static `manage` segment did not swallow the dynamic one. */
    check(
      "a place slug still resolves to a place, not to the directory",
      (await page.getByTestId("around-manage").count()) === 0 &&
        (await page.getByTestId("around-feed").count()) === 0,
    );

    check("no route returned a server error", serverErrors.length === 0, serverErrors.join("\n"));
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
