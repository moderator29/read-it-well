/**
 * The sign-up form and the two long-list pickers, in all four languages.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/signup-i18n.spec.mjs
 *
 * The sign-up form was the last wholly English surface on a platform that
 * speaks four languages, and it is the FIRST screen somebody who chose Hausa
 * ever sees. Four group headings, nine field labels, the strength meter, the
 * show/hide toggle, and every word of both pickers - the drawer, its search,
 * both empty states - were literals in the JSX.
 *
 * What is asserted, per locale:
 *
 *   en   the English strings ARE there, so the sweep did not simply delete
 *        copy and leave four blank forms.
 *   the  none of those strings survive. A missed literal shows up here as an
 *   rest English word sitting in a Yoruba form, which is exactly what a reader
 *        would see.
 *
 * THE FORM IS TWO STEPS NOW ("Your account", then "A little about you";
 * `/sign-up` is the options page and `/sign-up/email` carries the form). The
 * old four group headings are gone, and the pickers and hearAbout live on
 * step two, so the sweep reads step one, fills it with an address at a
 * reserved domain (RFC 2606) and presses Enter to reach step two (nothing is
 * ever submitted), and reads step two. `/settings/place` answers a signed-out
 * visitor with the sign-in wall since 23 September (asserted), and its form is
 * read in the preview harness.
 *
 * And one thing the dictionary alone could never prove: `hearAbout` posts the
 * ENGLISH value in every language. Those six words are what the server
 * validates and what every row written before this sweep holds, so a translated
 * label must never reach the database. The option values are read out of the
 * live DOM to check it.
 */

import { chromium } from "playwright-core";
import { expectSignInWall, openPreview } from "./_gate.mjs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const LOCALES = ["en", "yo", "ha", "ig"];

/* Strings that must vanish outside English. Chosen to be unambiguous: no
   proper nouns, nothing that would legitimately stay English in a Nigerian
   locale, nothing that appears in a `data-testid`. */
const ENGLISH = {
  step1: ["Your account", "First name", "Surname", "Confirm password"],
  step2: [
    "A little about you",
    "Nickname",
    "Referral code",
    "Where did you hear about us",
    "Local government",
    "Choose your state",
    "What you do",
  ],
};

/** Fill a field, retrying until hydration has stopped wiping it. */
async function fillHydrated(page, selector, value) {
  for (let i = 0; i < 40; i++) {
    await page.fill(selector, value);
    if ((await page.inputValue(selector)) === value) return;
    await page.waitForTimeout(250);
  }
}

function englishCheck(locale, text, phrases, label) {
  const found = phrases.filter((phrase) => text.includes(phrase));
  if (locale === "en") {
    check(
      `${label}: English still says the English words`,
      found.length === phrases.length,
      `missing: ${phrases.filter((p) => !text.includes(p)).join(" | ")}`,
    );
  } else {
    check(`${label}: no English copy survives`, found.length === 0, `still English: ${found.join(" | ")}`);
  }
}

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

for (const locale of LOCALES) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addCookies([
    { name: "nf_locale", value: locale, url: BASE_URL },
  ]);
  const page = await context.newPage();
  const serverErrors = [];
  page.on("response", (r) => {
    if (r.status() >= 500) serverErrors.push(`${r.status()} ${r.url()}`);
  });

  console.log(`\n[${locale}] /sign-up/email, step 1`);
  await page.goto(`${BASE_URL}/sign-up/email`, { waitUntil: "load" });
  await page.waitForTimeout(800);
  const text = await page.evaluate(() => document.body.innerText);
  check("the form rendered at all", text.length > 200, `${text.length} chars`);
  englishCheck(locale, text, ENGLISH.step1, "step 1");

  console.log(`[${locale}] /sign-up/email, step 2`);
  await fillHydrated(page, "#firstName", "Ada");
  await fillHydrated(page, "#surname", "Obi");
  await fillHydrated(page, "#email", "nobody@example.invalid");
  await fillHydrated(page, "#password", "Str0ng-pass-phrase!");
  await fillHydrated(page, "#confirmPassword", "Str0ng-pass-phrase!");
  /* Enter on step one is Next, in every language (EmailAuthForm). */
  await page.locator("#confirmPassword").press("Enter");
  await page.waitForTimeout(800);
  const text2 = await page.evaluate(() => document.body.innerText);
  check("step 2 is on screen", await page.getByTestId("state-picker").isVisible());
  englishCheck(locale, text2, ENGLISH.step2, "step 2");

  /*
   * The value/label split, checked where it matters. The label may be in any
   * language; the value the browser will post must be the frozen English one,
   * because that is what `validateSignUp` checks and what `profiles.hear_about`
   * already holds for every row written before this sweep.
   */
  const options = await page.evaluate(() =>
    Array.from(document.querySelectorAll("#hearAbout option"))
      .map((o) => o.value)
      .filter(Boolean),
  );
  check(
    "hearAbout still posts its English values",
    options.length === 6 && options.includes("Friend or family") && options.includes("Google search"),
    JSON.stringify(options),
  );

  /* The picker drawer is a separate surface and carries its own dozen words. */
  await page.getByTestId("state-picker").click();
  await page.waitForTimeout(500);
  const drawer = await page.getByTestId("state-picker-drawer").innerText();
  if (locale === "en") {
    check("the drawer speaks English in English", /Choose your state|Search 37 states|Nothing matches that/.test(drawer), drawer.slice(0, 120));
  } else {
    check(
      "the drawer carries no English",
      !/Nothing matches that|Choose your state|Search 37 states|Loading the list/.test(drawer),
      drawer.slice(0, 160).replace(/\s+/g, " "),
    );
  }
  await page.keyboard.press("Escape");

  console.log(`[${locale}] /settings/place`);
  await expectSignInWall(check, "/settings/place", BASE_URL);
  /* A fresh tab: the sign-up tab holds a half-filled form and its own history entries. */
  const placePage = await context.newPage();
  if (await openPreview(placePage, "/preview/session-b/sweep-settings?v=place", check, { base: BASE_URL, wait: 800 })) {
    const placeText = await placePage.evaluate(() => document.body.innerText);
    check("the place form rendered (preview harness)", placeText.length > 100, `${placeText.length} chars`);
  }

  check("no server error", serverErrors.length === 0, serverErrors.join("\n"));
  await context.close();
}

await browser.close();
console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
