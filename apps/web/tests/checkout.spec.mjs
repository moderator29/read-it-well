/**
 * Checkout graceful path.
 *
 * Self-contained Playwright script: no runner, no config. It drives
 * /checkout/<bookingId> at phone size in BOTH themes and proves the one thing
 * that must be true before any key lands: the route renders an honest,
 * designed state instead of crashing, and nothing raw ever reaches the screen.
 *
 * This is deliberately the keyless assertion. With no Supabase config and no
 * PAYSTACK_SECRET_KEY there is no booking to pay for, and the correct behaviour
 * is a screen that says so plainly with somewhere to go next. A 500, a React
 * error overlay, a stack trace, a bare "undefined" or a leaked environment
 * variable name are each a failure, whichever theme they appear in: a payment
 * surface that only holds together at night is not a payment surface.
 *
 * Run with the dev server already up:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/checkout.spec.mjs
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const EXECUTABLE_PATH = "/opt/pw-browsers/chromium";
const VIEWPORT = { width: 390, height: 844 };
const WAIT = 1_400;

/** A well-formed booking id. Nothing is expected to exist behind it. */
const BOOKING_ID = "7f3a9c1e-5b2d-4e6f-8a1b-2c3d4e5f6a7b";

/** A well-formed rm-book reference, for the return-from-Paystack path. */
const REFERENCE = "rm-book-1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

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
 * Anything that means the page broke rather than answered. Framework overlays,
 * thrown-value shapes, database and processor internals, and the environment
 * variable names a leaked message would carry.
 */
const RAW_ERROR_MARKERS = [
  "Application error",
  "Unhandled Runtime Error",
  "Server Components render",
  "Internal Server Error",
  "call stack",
  "at Object.",
  "at async ",
  "TypeError",
  "ReferenceError",
  "SyntaxError",
  "Cannot read propert",
  "is not a function",
  "undefined is not",
  "PGRST",
  "JWT",
  "supabaseUrl",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE",
  "PAYSTACK_SECRET_KEY",
  "42501",
  "23505",
  "23P01",
];

/**
 * The honest states this route is allowed to be in with nothing configured.
 * One of them must be on screen; which one depends on how much of the platform
 * the environment has.
 */
const HONEST_HEADLINES = [
  "Payment switches on shortly",
  "Sign in to pay for this stay",
  "We could not find that booking",
  "Checkout is unavailable for a moment",
];

/** True when nothing pushes the document wider than the phone viewport. */
async function noHorizontalOverflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth <= window.innerWidth + 1;
  });
}

async function inspect(page, label) {
  const body = await page.locator("body").innerText();
  const flat = body.replace(/\s+/g, " ").trim();

  check(`${label}: something rendered`, flat.length > 0);

  const leaked = RAW_ERROR_MARKERS.filter((marker) => flat.includes(marker));
  check(
    `${label}: no raw error or stack trace on screen${leaked.length > 0 ? ` (found: ${leaked.join(", ")})` : ""}`,
    leaked.length === 0,
  );

  check(
    `${label}: no bare undefined or NaN in the copy`,
    !/\bundefined\b/.test(flat) && !/\bNaN\b/.test(flat),
  );

  check(`${label}: no horizontal overflow at 390px`, await noHorizontalOverflow(page));

  return flat;
}

async function walk(colorScheme) {
  console.log(`\n================ ${colorScheme} ================`);
  const context = await browser.newContext({ colorScheme, viewport: VIEWPORT });
  /*
   * Dark is the platform default and only an explicit choice moves it, so
   * emulating a light operating system no longer produces a light page. A light
   * pass has to make the choice the way a visitor would, in storage, before the
   * before-paint script reads it.
   */
  await context.addInitScript((mode) => {
    try {
      window.localStorage.setItem("nf_theme", mode);
    } catch {
      /* storage unavailable, the page falls back to the dark default */
    }
  }, colorScheme === "light" ? "light" : "dark");

  const page = await context.newPage();

  try {
    /* ------------------------------------------- a well-formed booking id */
    console.log(`/checkout/${BOOKING_ID}`);
    const response = await page.goto(`${BASE_URL}/checkout/${BOOKING_ID}`, {
      waitUntil: "load",
      timeout: 60_000,
    });
    await page.waitForTimeout(WAIT);

    check("route answers, and not with a server error", (response?.status() ?? 500) < 400);

    const theme = await page.evaluate(
      () => document.documentElement.dataset.theme ?? "dark",
    );
    check(
      `page is rendering the ${colorScheme} theme`,
      colorScheme === "light" ? theme === "light" : theme !== "light",
    );

    check("the page is titled as checkout", await page.getByText("Checkout").first().isVisible());

    const flat = await inspect(page, "booking id");

    const matched = HONEST_HEADLINES.filter((headline) => flat.includes(headline));
    check(
      `an honest state is on screen${matched.length > 0 ? ` ("${matched[0]}")` : ""}`,
      matched.length > 0,
    );

    // An honest state is only honest if it offers a way onward.
    const onward = await page.locator("a.nf-btn").count();
    check("the honest state offers somewhere to go next", onward > 0);

    // Nothing may claim a charge the platform does not make, and the word this
    // product never uses about its own take must not appear either.
    check(
      "no wording that claims a platform charge",
      !/\bservice fee\b/i.test(flat) && !/\bplatform fee\b/i.test(flat),
    );
    check(
      "no sample, preview, demo or not-live wording",
      !/\b(sample|preview|demo|not live|not-live)\b/i.test(flat),
    );

    /* ------------------------------------------- the Paystack return trip */
    console.log(`/checkout/${BOOKING_ID}?paid=1&reference=...`);
    const returned = await page.goto(
      `${BASE_URL}/checkout/${BOOKING_ID}?paid=1&reference=${REFERENCE}`,
      { waitUntil: "load", timeout: 60_000 },
    );
    await page.waitForTimeout(WAIT + 800);

    check("return path answers, and not with a server error", (returned?.status() ?? 500) < 400);
    await inspect(page, "return path");

    /* ----------------------------------------------- a malformed booking id */
    console.log("/checkout/not-a-booking");
    const malformed = await page.goto(`${BASE_URL}/checkout/not-a-booking`, {
      waitUntil: "load",
      timeout: 60_000,
    });
    await page.waitForTimeout(WAIT);

    check(
      "a malformed booking id answers, and not with a server error",
      (malformed?.status() ?? 500) < 400,
    );
    await inspect(page, "malformed id");
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ executablePath: EXECUTABLE_PATH });

console.log(`checkout graceful path against ${BASE_URL}`);
await walk("dark");
await walk("light");
await browser.close();

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nall checks passed.");
