/**
 * Admin console access walkthrough.
 *
 * Self-contained Playwright script: no runner, no config. The sandbox carries
 * no session, so every /admin route must answer with the designed access
 * screen, and that screen must leak nothing about what the console holds: no
 * queue names, no counts, no member data. Run with the dev server already up:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/admin.spec.mjs
 */

import { chromium } from "playwright-core";

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

/** The three honest headings the access screen can carry. */
const ACCESS_HEADINGS = [
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

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const context = await browser.newContext({
  colorScheme: "dark",
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();

try {
  // ----------------------------------------------------------------- /admin
  console.log("/admin");
  const response = await page.goto(`${BASE_URL}/admin`, { waitUntil: "load" });
  await page.waitForTimeout(WAIT);

  check("responds without a server error", (response?.status() ?? 500) < 500);

  const bodyText = await page.locator("body").innerText();

  check(
    "the designed access screen renders",
    ACCESS_HEADINGS.some((heading) => bodyText.includes(heading)),
  );
  check("the page is not blank", bodyText.trim().length > 40);
  check("a sign in route is offered", (await page.locator('a[href^="/sign-in"]').count()) > 0);
  check("the brand logo renders", (await page.locator('a[aria-label="RentMe home"]').count()) > 0);

  check(
    "the console rail is absent",
    (await page.locator('nav[aria-label="Admin console"]').count()) === 0,
  );

  for (const phrase of LEAKS) {
    check(`no queue data leaks: ${phrase}`, !bodyText.toLowerCase().includes(phrase.toLowerCase()));
  }

  check(
    "no decision control is reachable",
    (await page.getByRole("button", { name: /approve|publish|reject|switch off/i }).count()) === 0,
  );

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check("nothing overflows sideways at 390px", overflow <= 1);

  // ------------------------------------------------------- a deeper queue
  console.log("/admin/flags");
  await page.goto(`${BASE_URL}/admin/flags`, { waitUntil: "load" });
  await page.waitForTimeout(WAIT);

  const flagsText = await page.locator("body").innerText();
  check(
    "the flags queue also refuses with the access screen",
    ACCESS_HEADINGS.some((heading) => flagsText.includes(heading)),
  );
  check(
    "the flags queue shows no flagged message",
    !flagsText.includes("Conversation context") && !flagsText.includes("The scan matched"),
  );

  // ------------------------------------------------------- the kill switches
  console.log("/admin/switches");
  await page.goto(`${BASE_URL}/admin/switches`, { waitUntil: "load" });
  await page.waitForTimeout(WAIT);

  const switchesText = await page.locator("body").innerText();
  check(
    "the switches page also refuses with the access screen",
    ACCESS_HEADINGS.some((heading) => switchesText.includes(heading)),
  );
  check(
    "no switch is operable",
    (await page.getByRole("button", { name: /switch (on|off)/i }).count()) === 0,
  );
} finally {
  await browser.close();
}

console.log(failures === 0 ? "\nadmin: all checks passed" : `\nadmin: ${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
