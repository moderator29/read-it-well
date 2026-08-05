/**
 * The home overview, and the three things on it that used to be invented.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/home-overview.spec.mjs
 *
 * What this guards.
 *
 * 1. The greeting is decided by the clock in Lagos, not by the server's own
 *    timezone. This machine runs in UTC, which is an hour behind Lagos, so a
 *    server-hour greeting is wrong for a full hour of every day and wrong about
 *    which daypart it is around every boundary. The spec computes the Lagos
 *    daypart itself and demands the page agree.
 *
 * 2. The shell no longer claims everybody is in Lagos. The top bar carried a
 *    hardcoded chip reading "Lagos, Nigeria" for every visitor, including the
 *    one in Kano. Where somebody is now comes from their own profile and lives
 *    on home, where it is a link to the screen that changes it.
 *
 * 3. Home offers a way to set a city rather than guessing one, and the city
 *    control leads somewhere real.
 *
 * 4. The "Top experiences" row is gone. It was five tiles with five different
 *    names and one identical destination, which is a promise the product could
 *    not keep.
 *
 * This sandbox cannot reach the Supabase host, so nobody is signed in and there
 * are no areas to pin. That is a real product state and every assertion below
 * holds in it: the empty city card is designed, and the greeting still has to
 * be the right one.
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const WAIT = 1200;

let failures = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}${detail ? `\n          ${detail}` : ""}`);
  }
}

/** The same cut the product uses, computed independently here. */
function expectedGreeting() {
  const hour = Number.parseInt(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Lagos",
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
    10,
  );
  if (hour >= 5 && hour < 12) return "Good morning,";
  if (hour >= 12 && hour < 17) return "Good afternoon,";
  return "Good evening,";
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

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
    if (r.status() >= 500 && !r.url().includes("/_next/image")) {
      serverErrors.push(`${r.status()} ${r.url()}`);
    }
  });

  try {
    console.log(`\n[${theme} 390px] /home`);
    await page.goto(`${BASE_URL}/home`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);

    const applied = await page.evaluate(() => document.documentElement.dataset.theme ?? "dark");
    check(`the ${theme} theme actually applied`, applied === theme);

    const body = await page.evaluate(() => document.body.innerText);

    const greeting = expectedGreeting();
    check(`the greeting is the Lagos one (${greeting})`, body.includes(greeting), body.slice(0, 120));

    const wrong = ["Good morning,", "Good afternoon,", "Good evening,"].filter(
      (candidate) => candidate !== greeting && body.includes(candidate),
    );
    check("no other daypart is on the page", wrong.length === 0, wrong.join(", "));

    check('"Explore your city" is present', body.includes("Explore your city"));

    /* The city control has to lead somewhere. Signed out that is the sign-in
       screen; signed in it is the screen that changes the city. Either is a
       real destination, and a label with no link is what this guards against. */
    const cityLink = page.locator(
      'a[href="/settings/place"], a[href="/sign-in"]',
    );
    check("the city control links to a real screen", (await cityLink.count()) > 0);

    check(
      "the shell no longer claims everybody is in Lagos",
      !body.includes("Lagos, Nigeria"),
    );

    /* Only genuinely visible links count. The desktop rail is `display: none`
       below lg and reports a zero-size rect, so counting every match would
       report the hidden rail as a duplicate destination (docs/HANDOFF.md
       section 6). One visible link to experiences is the category tile; five
       was the row that has been removed. */
    const experienceLinks = await page.evaluate(() =>
      [...document.querySelectorAll('a[href="/search?type=experience"]')].filter(
        (a) => a.getBoundingClientRect().width > 0,
      ).length,
    );
    check(
      `the five identical experience tiles are gone (${experienceLinks} visible)`,
      experienceLinks <= 1,
    );

    /* The bell and the avatar are the top row the overview is built around. */
    check(
      "the bell is in the top row",
      (await page.locator('header a[href="/notifications"]').count()) > 0,
    );
    check(
      "the avatar is in the top row",
      (await page.locator('header a[href="/profile"], header a[href="/sign-in"]').count()) > 0,
    );

    /* No numeric badge may appear from a literal. Zero unread renders nothing,
       which is the same guarantee unread-badge.spec.mjs makes for the rail. */
    const invented = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll(".nf-badge")) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;
        const text = (el.textContent ?? "").trim();
        if (/^\d+$/.test(text)) out.push(text);
      }
      return out;
    });
    check("no invented unread count", invented.length === 0, JSON.stringify(invented));

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(`no horizontal scroll at 390px (overflow ${scrollWidth}px)`, scrollWidth <= 1);

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
