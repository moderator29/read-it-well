/**
 * The contact form, which now files a real ticket.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/contact.spec.mjs
 *
 * It used to set a local flag and say, honestly, that nothing had been sent and
 * to email support instead. The honesty was real and the write path it
 * apologised for already existed: fileSupportTicket has filed anonymous tickets
 * through the service role since support shipped. The form now posts to a
 * validated server action, is rate limited by address before anything is
 * written, and hands back the NF-SUP reference.
 *
 * This sandbox has no route to the Supabase host, so the action cannot reach
 * the tickets table and answers with its honest unavailable state. What a
 * browser proves here is that the old "nothing was sent" claim is gone, that
 * validation runs and names the field, and that every failure still leaves a
 * person with the support address. Checked at 390px in both themes.
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const WAIT = 1200;
const ACTION_WAIT = 2500;

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
    console.log(`\n[${theme}] /contact`);
    await page.goto(`${BASE_URL}/contact`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);

    const appliedTheme = await page.evaluate(
      () => document.documentElement.dataset.theme ?? "dark",
    );
    check(
      `the ${theme} theme actually applied`,
      appliedTheme === (theme === "light" ? "light" : "dark"),
    );
    check("no route returned a server error", serverErrors.length === 0);

    const before = await page.locator("body").innerText();

    /* THE REGRESSION GUARD. The form is connected now, so it must never say
       otherwise again. */
    check(
      "the form no longer says it is not connected to our inbox",
      !/not connected to our inbox/i.test(before),
    );
    check(
      "and it says what it does instead",
      /opens a support ticket/i.test(before),
    );
    check("the support address is still offered", /support@naijafinds\.com/.test(before));

    /* Validation runs and names the field rather than failing silently. */
    await page.fill('input[name="name"]', "Amaka Obi");
    await page.fill('input[name="email"]', "not-an-address");
    await page.fill('textarea[name="message"]', "hi");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(ACTION_WAIT);

    const afterInvalid = await page.locator("body").innerText();
    check(
      "a bad address is named as the problem",
      /valid email address/i.test(afterInvalid),
    );
    check(
      "and so is a message too short to act on",
      /at least a sentence/i.test(afterInvalid),
    );
    check("nothing was claimed to have been sent", !/NF-SUP-/.test(afterInvalid));

    /* A valid submission. In this sandbox it cannot reach the database, so the
       right outcome is either a real reference or an honest refusal that keeps
       the support address on screen. What it must never be is silence. */
    await page.fill('input[name="email"]', "amaka@example.com");
    await page.fill(
      'textarea[name="message"]',
      "My booking reference is NF-1234 and the gate code never arrived.",
    );
    await page.click('button[type="submit"]');
    await page.waitForTimeout(ACTION_WAIT);

    const afterValid = await page.locator("body").innerText();
    const filed = /NF-SUP-\d{5}/.test(afterValid);
    const refused = await page.locator('[role="alert"]').count();
    check(
      `the submission is answered, either filed or honestly refused (filed=${filed})`,
      filed || refused > 0,
    );
    if (!filed) {
      check(
        "a refusal still points at the support address",
        /support@naijafinds\.com/.test(afterValid),
      );
      check(
        "and says what the person typed has not been cleared",
        /has been cleared|not been cleared/i.test(afterValid),
      );
    }
    check("no route returned a server error while submitting", serverErrors.length === 0);
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
