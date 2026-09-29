/**
 * Admin console access walkthrough.
 *
 * Self-contained Playwright script: no runner, no config.
 *
 * SINCE 23 SEPTEMBER a signed-out visitor never reaches `/admin` at all: the
 * proxy sends every console address to `/sign-in?next=...` (`src/proxy.ts`).
 * So this spec now checks, in order:
 *
 *   1. signed out, each console address answers the 307 to the sign-in door,
 *      and the page the browser lands on leaks nothing the console holds: no
 *      queue names, no counts, no decision control;
 *   2. signed in as the QA member (an ordinary member, NOT staff), the layout
 *      answers with the site's ordinary 404 ("We could not find that page",
 *      `app/not-found.tsx`): since 0d598077 nothing confirms to a non-staff
 *      account that a console exists (`admin/layout.tsx`, `notFound()` for
 *      `not-admin`). The access screen (`admin/_components/AccessScreen.tsx`)
 *      is still accepted for the states that keep it. Same no-leak contract.
 *      This half needs QA_MEMBER_EMAIL and QA_MEMBER_PASSWORD and is reported
 *      as SKIP without them.
 *
 * Run with the dev server already up:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/admin.spec.mjs
 */

import { chromium } from "playwright-core";
import { expectSignInWall, onSignInDoor, overflowOf, qaContext, signedOutContext, signInAsQa } from "./_gate.mjs";

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

/**
 * The honest answers a non-staff account can get: the ordinary 404 (a plain
 * member, since 0d598077) or one of the access screen's headings.
 */
const ACCESS_HEADINGS = [
  "We could not find that page",
  "The console is not open yet",
  "Staff sign in",
  "You do not have console access",
];

/**
 * Anything on this list appearing on a refused page would mean the console
 * told a stranger what it holds.
 */
const LEAKS = [
  "Operations overview",
  "Message flags",
  "Risk alerts",
  "Agent applications",
  "Listing review",
  "Support tickets",
  "Admission checklist",
  "Conversation context",
  "waiting",
  "audit log",
  "queue is clear",
];

const ROUTES = ["/admin", "/admin/queue?tab=flags", "/admin/switches"];

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const VIEW = { colorScheme: "dark", viewport: { width: 390, height: 844 } };

/** The no-leak contract, on whatever page the visitor was given. */
async function leaksNothing(page, label) {
  const bodyText = await page.locator("body").innerText();
  check(`${label}: the page is not blank`, bodyText.trim().length > 40);
  for (const phrase of LEAKS) {
    check(`${label}: no queue data leaks: ${phrase}`, !bodyText.toLowerCase().includes(phrase.toLowerCase()));
  }
  check(
    `${label}: the console rail is absent`,
    (await page.locator('nav[aria-label="Admin console"]').count()) === 0,
  );
  check(
    `${label}: no decision control is reachable`,
    (await page.getByRole("button", { name: /approve|publish|reject|switch (on|off)/i }).count()) === 0,
  );
  check(`${label}: nothing overflows sideways at 390px`, (await overflowOf(page)) <= 1);
  return bodyText;
}

try {
  // ------------------------------------------------------------ signed out
  console.log("signed out");
  const context = await signedOutContext(browser, VIEW);
  const page = await context.newPage();
  for (const route of ROUTES) {
    await expectSignInWall(check, route);
    const response = await page.goto(`${BASE_URL}${route}`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    check(`${route}: responds without a server error`, (response?.status() ?? 500) < 500);
    check(`${route}: the browser lands on the sign-in door`, onSignInDoor(page));
    await leaksNothing(page, route);
  }
  await context.close();

  // ------------------------------------------- signed in, not staff (QA)
  console.log("\nsigned in as the QA member (not staff)");
  const state = await signInAsQa(browser);
  if (state) {
    const qa = await qaContext(browser, state, VIEW);
    const qp = await qa.newPage();
    for (const route of ROUTES) {
      const response = await qp.goto(`${BASE_URL}${route}`, { waitUntil: "load" });
      await qp.waitForTimeout(WAIT);
      check(`${route}: responds without a server error`, (response?.status() ?? 500) < 500);
      const text = await leaksNothing(qp, `${route} (member)`);
      check(
        `${route}: the designed access screen renders`,
        ACCESS_HEADINGS.some((heading) => text.includes(heading)),
      );
      check(`${route}: the brand logo renders`, (await qp.locator('a[aria-label="Vallo home"]').count()) > 0);
    }
    await qa.close();
  }
} finally {
  await browser.close();
}

console.log(failures === 0 ? "\nadmin: all checks passed" : `\nadmin: ${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
