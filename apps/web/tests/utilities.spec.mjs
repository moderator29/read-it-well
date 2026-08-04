/**
 * Light, water, and the gate that stays shut until a booking is confirmed.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/utilities.spec.mjs
 *
 * The three questions a Nigerian guest asks before the price, and the reason
 * nobody else answers them: they are structured columns, not a tick box called
 * "Backup Power" that flattens a Band A feeder and a generator running seven to
 * eleven into the same claim.
 *
 * What this guards, and what it deliberately cannot.
 *
 * The DATABASE half is proved by a probe, not by this file, because the sandbox
 * has no route to the Supabase host and therefore no session. That probe ran as
 * four real users under `set local role authenticated` and reported: the host
 * sees the access row, a guest holding a CONFIRMED booking sees it, a stranger
 * sees zero rows, a guest whose booking is only PENDING sees zero rows, a
 * stranger's update touches zero rows and their insert is refused by RLS
 * outright, and `public.listings` carries none of the four access columns. Any
 * change to those policies must re-run that probe; this file cannot.
 *
 * The BROWSER half is what is asserted here:
 *
 * 1. A listing whose host answered renders the answers, with the backup hours,
 *    because "generator" alone is the answer that means nothing.
 * 2. A listing whose host answered only some of it says the rest is unanswered
 *    in plain words. Silence must never read as good news.
 * 3. A gated listing shows that it is gated and NEVER shows the details to a
 *    caller who is not entitled to them. This is the assertion that matters
 *    most: a leaked gate code is the failure this whole design exists to stop.
 * 4. No horizontal scroll at 390px, in both themes.
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
    console.log(`\n[${theme} 390px] /listing/seed-1, fully answered and gated`);
    await page.goto(`${BASE_URL}/listing/seed-1`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);

    const applied = await page.evaluate(() => document.documentElement.dataset.theme ?? "dark");
    check(`the ${theme} theme actually applied`, applied === theme);

    let text = await page.evaluate(() => document.body.innerText);

    check("the panel is on the page", text.includes("Light, water and getting in"));
    check("the grid band is stated", text.includes("Band A"));
    check(
      "the backup states its hours, not just its existence",
      /24 hours a day/i.test(text),
      text.slice(text.indexOf("Light, water"), text.indexOf("Light, water") + 240),
    );
    check("the water source is stated", text.includes("Treated mains"));
    check("a prepaid meter is called out", text.includes("Prepaid meter"));

    /* The whole point. A caller with no confirmed booking is told the listing
       is gated and is shown nothing that would get them through the gate. */
    check(
      "a gated listing says it is gated",
      (await page.getByTestId("gate-withheld").count()) === 1,
    );
    check(
      "the gate details are NOT on the page",
      (await page.getByTestId("gate-details").count()) === 0,
    );
    check(
      "no gate code reached the HTML at all",
      !/access code/i.test(await page.content()) || (await page.getByTestId("gate-details").count()) === 1,
    );

    console.log(`\n[${theme} 390px] /listing/seed-2, partly answered`);
    await page.goto(`${BASE_URL}/listing/seed-2`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    text = await page.evaluate(() => document.body.innerText);

    check("the panel is on the page", text.includes("Light, water and getting in"));
    check("the answered half is stated", /8 hours a day/i.test(text));
    check(
      "the unanswered half says so, rather than staying silent",
      text.includes("The host has not answered this yet"),
    );
    check(
      "an ungated listing carries no gate block",
      (await page.getByTestId("gate-withheld").count()) === 0 &&
        (await page.getByTestId("gate-details").count()) === 0,
    );

    console.log(`\n[${theme} 390px] /listing/seed-3, nothing answered`);
    await page.goto(`${BASE_URL}/listing/seed-3`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    text = await page.evaluate(() => document.body.innerText);
    check(
      "a listing with no answers shows no panel at all",
      !text.includes("Light, water and getting in"),
    );

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(`no horizontal scroll at 390px (overflow ${overflow}px)`, overflow <= 1);
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
