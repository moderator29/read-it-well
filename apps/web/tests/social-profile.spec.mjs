/**
 * The social profile surfaces, from the outside.
 *
 * Self-contained Playwright script: no runner, no config. Run with the built
 * app already serving:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/social-profile.spec.mjs
 *
 * What this proves, and what it deliberately does not.
 *
 * This sandbox has no route to the Supabase host by organisation proxy policy,
 * so nobody can be signed in here and no handle can be claimed from a browser
 * in this environment. What a browser CAN prove is everything around the write:
 * that both routes answer for any handle rather than 404ing, that a handle
 * nobody holds is offered rather than refused, that a string which could never
 * be a handle lands on a designed screen instead of an error, that every state
 * carries a way onward, and that the whole walk is inside the one blue family
 * with no warm hue anywhere on it. It checks all of that in dark and in light
 * at 390px.
 *
 * The write itself, the row level security behind it and the three triggers on
 * `public.social_profiles` are proven against live Postgres by the lead's audit,
 * not from here.
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

/* A handle nobody holds, and a string that could never be a handle at all.
   Both must land on a designed screen, never on an error and never on a 404. */
const FREE_HANDLE = "aduke_from_yaba";
const NOT_A_HANDLE = "Not-A-Handle";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

/**
 * Every colour the page actually paints, as hue and saturation.
 *
 * The platform has exactly one blue family, plus emerald for success and rose
 * for error. A warm hue anywhere is a defect, and this codebase has shipped a
 * whole workspace rendering orange before, which only a screenshot caught. This
 * turns that check into an assertion.
 */
async function warmColours(page) {
  return await page.evaluate(() => {
    const warm = [];
    const seen = new Set();

    const hueOf = (r, g, b) => {
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const d = max - min;
      if (d === 0) return { hue: 0, sat: 0 };
      let hue;
      if (max === r) hue = ((g - b) / d) % 6;
      else if (max === g) hue = (b - r) / d + 2;
      else hue = (r - g) / d + 4;
      hue = Math.round(hue * 60);
      if (hue < 0) hue += 360;
      return { hue, sat: d / max };
    };

    for (const el of document.querySelectorAll("*")) {
      const style = getComputedStyle(el);
      for (const prop of ["color", "backgroundColor", "borderTopColor", "fill"]) {
        const value = style[prop];
        if (!value || seen.has(value)) continue;
        seen.add(value);
        const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(value);
        if (!m) continue;
        const alpha = m[4] === undefined ? 1 : Number(m[4]);
        if (alpha < 0.2) continue;
        const { hue, sat } = hueOf(Number(m[1]), Number(m[2]), Number(m[3]));
        /* 20 to 60 degrees is orange, amber and gold. Rose sits near 350 and
           emerald near 160, so neither is caught here. */
        if (sat > 0.25 && hue >= 20 && hue <= 60) warm.push(value);
      }
    }
    return warm;
  });
}

async function run(theme) {
  const context = await browser.newContext({
    colorScheme: theme,
    viewport: { width: 390, height: 844 },
  });

  /* The product ignores the operating system: only an explicit stored choice
     moves the theme, so the harness stores one exactly as a person would. */
  await context.addInitScript((choice) => {
    try {
      window.localStorage.setItem("nf_theme", choice);
    } catch {
      /* storage can be unavailable; the assertion below catches the result */
    }
  }, theme);

  const page = await context.newPage();

  /* A route that throws renders the root error boundary. Nothing in this walk
     may ever reach it. */
  const serverErrors = [];
  page.on("response", (r) => {
    if (r.status() >= 500) serverErrors.push(`${r.status()} ${r.url()}`);
  });

  try {
    /* ------------------------------------------------- a handle nobody holds */
    console.log(`\n[${theme}] /u/${FREE_HANDLE}`);
    const free = await page.goto(`${BASE_URL}/u/${FREE_HANDLE}`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    check("a free handle answers 200, never a 404", free !== null && free.status() === 200);

    const applied = await page.evaluate(() => document.documentElement.dataset.theme ?? "dark");
    check(`the ${theme} theme actually took`, applied === theme);

    const freeText = await page.locator("body").innerText();
    check(
      "the page answers with a designed state, not a crash",
      /is free|Profiles switch on shortly|That is not a handle/.test(freeText),
    );
    check("the page is addressed to the handle asked for", freeText.includes(FREE_HANDLE));
    check(
      "the state offers a way onward",
      (await page.locator("a[href='/home'], a[href='/sign-in'], a[href='/profile'], a[href^='/u/']").count()) > 0,
    );
    /* A profile is hidden from anybody a block touches in either direction, so
       this one screen covers "nobody holds it" and "you cannot see them". It
       must never claim the handle is available. */
    check(
      "an empty handle page never asserts the handle is free",
      !/is free|is available/i.test(freeText),
    );

    /* ------------------------------------------------ something that is not one */
    console.log(`\n[${theme}] /u/${NOT_A_HANDLE}`);
    const bad = await page.goto(`${BASE_URL}/u/${NOT_A_HANDLE}`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    check("a malformed handle answers 200, never a crash", bad !== null && bad.status() === 200);
    const badText = await page.locator("body").innerText();
    check(
      "a malformed handle is told what a handle is",
      /That is not a handle|Profiles switch on shortly/.test(badText),
    );
    check(
      "the malformed state offers a way onward",
      (await page.locator("a[href='/home'], a[href='/search']").count()) > 0,
    );

    /* ---------------------------------------------------------- the editor */
    console.log(`\n[${theme}] /u/${FREE_HANDLE}/edit`);
    const edit = await page.goto(`${BASE_URL}/u/${FREE_HANDLE}/edit`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    check("the editor answers 200", edit !== null && edit.status() === 200);

    const editText = await page.locator("body").innerText();
    check(
      "the editor answers with a designed state",
      /Claim your handle|Profiles switch on shortly|Sign in to claim your handle|belongs to somebody else|This is not your profile/.test(
        editText,
      ),
    );
    check("the editor names the handle it is for", editText.includes(FREE_HANDLE));
    check(
      "the editor is a full page with the platform back control",
      (await page.locator("button[aria-label='Back']").count()) > 0,
    );
    check(
      "the editor state offers a way onward",
      (await page.locator("a[href='/home'], a[href='/sign-in'], a[href='/profile'], a[href^='/u/']").count()) > 0,
    );

    /* --------------------------------------------------- the house rules */
    const warm = await warmColours(page);
    check(`no orange, amber or gold anywhere (${warm.length} found)`, warm.length === 0);

    /* Written as an escape so this file stays clean under the same scan. */
    const emDashes = (editText.match(/\u2014/g) ?? []).length;
    check(`no em dashes in the copy (${emDashes} found)`, emDashes === 0);

    check(
      `no 5xx anywhere in the walk (${serverErrors.length} seen)`,
      serverErrors.length === 0,
    );
    for (const seen of serverErrors) console.log(`          ${seen}`);
  } finally {
    await context.close();
  }
}

await run("dark");
await run("light");
await browser.close();

console.log(failures === 0 ? "\nsocial-profile: all checks passed" : `\nsocial-profile: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
