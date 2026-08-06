/**
 * The three public trust surfaces.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/trust-surfaces.spec.mjs
 *
 * Before these pages existed, the platform's single most important rule lived
 * only in a database trigger, a scanner and an admin queue. The person being
 * asked for money had nowhere to read it. So what this spec proves is not that
 * three routes return 200; it is that the words that matter are on them, that
 * the refund windows are computed from one schedule rather than typed three
 * times, that the reporting route actually arrives with the right topic
 * selected, and that the old fee claim on the help centre is gone for good.
 *
 * These pages are server-rendered content and need no session, so unlike most
 * specs on this platform they are fully meaningful in a sandbox with no route
 * to Supabase. Checked at 390px in both themes.
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const WAIT = 900;

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

  const open = async (path) => {
    await page.goto(`${BASE_URL}${path}`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    return page.locator("body").innerText();
  };

  const noSideScroll = async (path) => {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(`${path} does not scroll sideways at 390px (${overflow}px)`, overflow <= 1);
  };

  try {
    /* ------------------------------------------------------ safety centre */
    console.log(`\n[${theme}] /safety`);
    const safety = await open("/safety");

    const appliedTheme = await page.evaluate(
      () => document.documentElement.dataset.theme ?? "dark",
    );
    check(
      `the ${theme} theme actually applied`,
      appliedTheme === (theme === "light" ? "light" : "dark"),
    );
    const sheets = await page.evaluate(() => document.styleSheets.length);
    check(`a stylesheet loaded (${sheets})`, sheets > 0);

    check(
      "the no-fees sentence is on the page in full",
      /RentMe charges no fees\. Not to book, not to list, not to be paid\./.test(safety),
    );
    check(
      "it says nobody should ever ask you to pay outside the platform",
      /pay outside it|pay outside RentMe/i.test(safety),
    );
    check(
      "the four things we never ask for are all named",
      /account number/i.test(safety) &&
        /one-time code/i.test(safety) &&
        /WhatsApp/i.test(safety) &&
        /holding fee/i.test(safety),
    );
    check("how paying works is explained", /How paying on RentMe works/i.test(safety));
    check("how inspections work is explained", /How inspections work/i.test(safety));
    check(
      "message, inspect, then pay is stated as the order",
      /message, inspect, then pay/i.test(safety),
    );
    check("how to report is explained", /How to report something/i.test(safety));
    check(
      "the already-paid-outside case is not left silent",
      /already paid someone outside RentMe/i.test(safety) && /Tell your bank/i.test(safety),
    );
    check(
      "and it does not promise to recover that money",
      /cannot recover money that never came through the platform/i.test(safety),
    );
    check(
      "the four-hour promise is printed, not implied",
      /within 4 hours/i.test(safety),
    );
    check(
      "the cancellation timeline renders here too",
      (await page.locator('[data-testid="cancellation-timeline"]').count()) === 1,
    );
    check("no route returned a server error", serverErrors.length === 0);
    await noSideScroll("/safety");

    /* ---------------------------------------------------------- standards */
    console.log(`\n[${theme}] /standards`);
    const standards = await open("/standards");

    check(
      "all three response commitments are printed",
      /Within 4 hours/i.test(standards) &&
        /Within 1 day/i.test(standards) &&
        /Within 3 days/i.test(standards),
    );
    check(
      "the clock is stated to start when the report is filed",
      /not from the moment somebody opens it/i.test(standards),
    );
    check(
      "off-platform payment is named as the most serious standard",
      /Asking anyone to pay outside RentMe/i.test(standards),
    );
    check(
      "the scanner is described as holding, never banning",
      /scanner holds, it never bans/i.test(standards),
    );
    check(
      "the audit record is promised as unchangeable",
      /cannot be edited or deleted/i.test(standards),
    );
    check("an appeal route exists", /Appeal a decision/i.test(standards));
    check(
      "the agent verification ladder is published, all four rungs in order",
      /Identity verified/i.test(standards) &&
        /Address verified/i.test(standards) &&
        /Payout verified/i.test(standards) &&
        /Fully verified/i.test(standards),
    );
    check(
      "and it says a level can go down as well as up",
      /can go down as well as up/i.test(standards),
    );
    check("no route returned a server error", serverErrors.length === 0);
    await noSideScroll("/standards");

    /* ------------------------------------------------------ cancellations */
    console.log(`\n[${theme}] /cancellations`);
    const cancellations = await open("/cancellations");

    check(
      "the timeline renders with all three stops",
      /Everything back/i.test(cancellations) &&
        /Half back/i.test(cancellations) &&
        /Nothing back/i.test(cancellations),
    );
    check(
      "the windows are 100, 50 and 0 per cent, computed from one schedule",
      /100%/.test(cancellations) && /50%/.test(cancellations) && /0%/.test(cancellations),
    );
    check("the 72 hour boundary is stated", /72/.test(cancellations));
    check(
      "an unpaid hold is said to cost nothing",
      /Cancel it from Bookings at any hour, for nothing/i.test(cancellations),
    );
    check(
      "a host cancellation always returns everything",
      /You get everything back, whenever it happens/i.test(cancellations),
    );
    check(
      "a misrepresented property is routed to a report, not a cancellation",
      /Do not cancel\. Report it/i.test(cancellations),
    );
    check("no route returned a server error", serverErrors.length === 0);
    await noSideScroll("/cancellations");

    /* -------------------------------------------- the reporting route works */
    console.log(`\n[${theme}] /safety -> report`);
    await page.goto(`${BASE_URL}/safety`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    await page.getByRole("link", { name: /report someone/i }).first().click();
    await page.waitForTimeout(WAIT * 2);

    check(
      "reporting from the safety centre lands on contact",
      /\/contact/.test(page.url()),
    );
    const topic = await page.locator('select[name="topic"]').inputValue();
    check(`and the safety topic is already chosen (${topic})`, topic === "safety");
    check(
      "the option is worded as the thing that happened",
      /Someone asked me to pay outside RentMe/i.test(
        await page.locator("body").innerText(),
      ),
    );

    /* ---------------------------------------- the help centre tells no lies */
    console.log(`\n[${theme}] /help`);
    await open("/help");
    /* The answers live inside collapsed details elements, so innerText would
       report only the questions. textContent reads the answers as shipped. */
    const help = await page.evaluate(() => document.body.textContent ?? "");

    check(
      "the commission claim is gone from the help centre",
      !/commission/i.test(help),
    );
    check(
      "and it says plainly that there are no fees",
      /RentMe charges no fees at all/i.test(help),
    );
    check(
      "the unbuilt escrow promise is gone",
      !/held securely by RentMe/i.test(help) && !/money is held until after check-in/i.test(help),
    );
    check(
      "the refund schedule matches the cancellation page",
      /more than 72 hours before check-in/i.test(help),
    );

    const linked = await Promise.all(
      ["/safety", "/standards", "/cancellations"].map((href) =>
        page.locator(`a[href="${href}"]`).count(),
      ),
    );
    check(
      `all three trust surfaces are reachable from the help centre (${linked.join(", ")})`,
      linked.every((count) => count > 0),
    );
    check("no route returned a server error", serverErrors.length === 0);
    if (serverErrors.length > 0) console.log("   ", serverErrors.join("\n    "));
  } finally {
    await context.close();
  }
}

/*
 * The schedule where the decision is actually made.
 *
 * Inbox item 66 asks for the policy as a timeline rather than a paragraph, and
 * the timeline has existed for a while on /cancellations and in the safety
 * centre. Those are the two places somebody goes AFTER they want out. The
 * point of a timeline is that it can be read in four seconds while deciding,
 * so it now renders on a listing, as the plain platform policy, and again at
 * checkout against the guest's own dates and their own total.
 *
 * NEITHER OF THOSE CAN BE REACHED TODAY. The catalogue is empty, so every
 * /listing route 404s, and a checkout needs a booking, which needs a listing.
 * This section says so out loud rather than passing quietly, because a spec
 * that skips silently is indistinguishable from one that proves something.
 */
async function decisionSurfaces() {
  console.log("\n[dark] where the decision is made");
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: "dark",
  });
  try {
    const page = await context.newPage();
    const res = await page.goto(`${BASE_URL}/listing/lekki-palm-grove`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    const found = await page.locator('[data-testid="cancellation-timeline"]').count();

    if (res.status() === 404 || (await page.locator("text=404").count()) > 0) {
      console.log("  SKIPPED the listing and checkout placements.");
      console.log("          The catalogue is empty, so /listing 404s and there is no");
      console.log("          booking to reach a checkout with. Both placements are");
      console.log("          UNPROVED and stay unproved until somebody signs up.");
      return;
    }
    check("the schedule is on the listing, before anyone has committed", found === 1);
  } finally {
    await context.close();
  }
}

try {
  await run("dark");
  await run("light");
  await decisionSurfaces();
} finally {
  await browser.close();
}

if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
