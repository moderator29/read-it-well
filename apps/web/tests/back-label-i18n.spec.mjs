/**
 * The back button speaks the reader's language.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/back-label-i18n.spec.mjs
 *
 * `PageHeader` and `BackButton` are the back affordance on roughly fifty
 * screens between them, and both defaulted their label to the English literal
 * "Back". `common.back` had been translated into all four locales since the
 * dictionaries were written and nothing rendered it, so on a Yorùbá, Hausa or
 * Igbo phone the one control every single screen carries was in English.
 *
 * They are `"use client"` components with no server parent to hand them a
 * dictionary, so they read the locale cookie through
 * `lib/i18n/use-client-dictionary.ts`. That hook is the thing this spec really
 * guards, because it has two failure modes that no page would ever show as an
 * error:
 *
 *   1. It resolves the wrong dictionary, and the label silently stays English.
 *   2. It reads `document` during the render that must match the server's, and
 *      React quietly patches a hydration mismatch in production while shouting
 *      about it in dev. The hook returns `DEFAULT_LOCALE` from
 *      `getServerSnapshot` precisely so this cannot happen, and a spec that
 *      only looked at the settled DOM would never notice if that broke.
 *
 * So every console message is captured for the whole run and any hydration
 * complaint fails the spec, alongside the label assertions.
 *
 * Four locales, four screens, one of them a site page rather than an app one so
 * both components are covered:
 *
 *   /settings and /wallet and /saved  ->  PageHeader
 *   /agents                           ->  BackButton
 *
 * This sandbox cannot reach Supabase, so all four render their signed-out or
 * unconfigured state. That does not weaken the check: the chrome is what is
 * under test, it renders in every one of those states, and a back control that
 * only worked for a signed-in user would be the more surprising bug.
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const EXECUTABLE = "/opt/pw-browsers/chromium";
const LOCALE_COOKIE = "nf_locale";

/* Straight from `packages/i18n/src/locales/*.ts`, `common.back`. Written out
   rather than imported so the spec fails when a dictionary changes under it
   instead of agreeing with itself. */
const EXPECTED = {
  en: "Back",
  yo: "Padà",
  ha: "Koma",
  ig: "Laghachi",
};

/* PageHeader on the first three, BackButton on the last. */
const ROUTES = ["/settings", "/wallet", "/saved", "/agents"];

let failures = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}${detail ? `\n          ${detail}` : ""}`);
  }
}

/**
 * React says "hydration" in several different sentences depending on version
 * and severity, so match the word rather than one phrasing, and catch the
 * text-content complaint that is what a wrongly-timed cookie read would throw.
 */
const HYDRATION = /hydrat|did not match|text content does not match/i;

const browser = await chromium.launch({ executablePath: EXECUTABLE });

try {
  for (const [locale, expected] of Object.entries(EXPECTED)) {
    console.log(`\n[${locale}] expecting "${expected}"`);

    const context = await browser.newContext({
      colorScheme: "dark",
      viewport: { width: 390, height: 844 },
    });
    // The same cookie `LanguageSwitcher` writes. No other switch is needed:
    // the server reads it for the page and the hook reads it for the label,
    // which is the whole point of keeping the name in `locale.constants.ts`.
    await context.addCookies([{ name: LOCALE_COOKIE, value: locale, url: BASE_URL }]);

    const page = await context.newPage();
    const noise = [];
    page.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning") noise.push(m.text());
    });
    page.on("pageerror", (e) => noise.push(`pageerror: ${e.message}`));

    for (const route of ROUTES) {
      const response = await page.goto(`${BASE_URL}${route}`, { waitUntil: "load" });
      // Long enough for hydration to have run and the hook to have settled.
      await page.waitForTimeout(1500);

      check(`${route} responds without a server error`, (response?.status() ?? 500) < 500);

      const labels = await page.evaluate(() =>
        [...document.querySelectorAll("button[aria-label]")].map((n) =>
          n.getAttribute("aria-label"),
        ),
      );

      check(
        `${route} carries a back control labelled "${expected}"`,
        labels.includes(expected),
        `aria-labels seen: ${JSON.stringify(labels)}`,
      );

      // The specific regression: the English default surviving in a non-English
      // locale. Guarded separately so the failure message names the bug.
      if (locale !== "en") {
        check(
          `${route} leaves no English "Back" behind`,
          !labels.includes(EXPECTED.en),
          `aria-labels seen: ${JSON.stringify(labels)}`,
        );
      }

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      check(`${route} does not overflow sideways at 390px`, overflow <= 1);
    }

    const hydration = noise.filter((m) => HYDRATION.test(m));
    check(
      `[${locale}] hydrates with no mismatch warning`,
      hydration.length === 0,
      hydration.slice(0, 3).join("\n          "),
    );

    await context.close();
  }
} finally {
  await browser.close();
}

console.log("");
if (failures > 0) {
  console.log(`${failures} check(s) failed`);
  process.exit(1);
}
console.log("all back-label i18n checks passed");
