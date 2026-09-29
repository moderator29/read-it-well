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
 * SINCE 23 SEPTEMBER a signed-out visitor never reaches the route: the proxy
 * sends every `/checkout/...` address to the sign-in door, keeping the way
 * back (`src/proxy.ts`). So the spec now reads:
 *
 *   signed out   the wall on all three addresses, and the door the browser
 *                lands on carries nothing raw;
 *   preview      `/preview/f3/checkout`, the route's own parts in the route's
 *                own order with a fixture booking and saved card: titled
 *                Checkout, the pay controls present, nothing raw, no claimed
 *                platform charge, no sample/preview/demo wording, no overflow.
 *                Nothing is ever pressed, so nothing is ever charged;
 *   signed in    as the QA member, the real route with a booking id nobody
 *                owns, the Paystack return trip and a malformed id: each an
 *                honest, designed state with a way onward. SKIP without
 *                QA_MEMBER_EMAIL / QA_MEMBER_PASSWORD.
 *
 * Run with the dev server already up:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/checkout.spec.mjs
 */

import { chromium } from "playwright-core";
import { expectSignInWall, onSignInDoor, openPreview, qaContext, signedOutContext, signInAsQa } from "./_gate.mjs";

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
  "We cannot reach payment right now",
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

const PATHS = {
  booking: `/checkout/${BOOKING_ID}`,
  returned: `/checkout/${BOOKING_ID}?paid=1&reference=${REFERENCE}`,
  malformed: "/checkout/not-a-booking",
};

async function themed(colorScheme, make) {
  const context = await make({ colorScheme, viewport: VIEWPORT });
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
  return context;
}

async function themeIs(page, colorScheme) {
  const theme = await page.evaluate(() => document.documentElement.dataset.theme ?? "dark");
  check(
    `page is rendering the ${colorScheme} theme`,
    colorScheme === "light" ? theme === "light" : theme !== "light",
  );
}

function honestWording(flat) {
  // Nothing may claim a charge the platform does not make.
  check(
    "no wording that claims a platform charge",
    !/\bservice fee\b/i.test(flat) && !/\bplatform fee\b/i.test(flat),
  );
  check(
    "no sample, preview, demo or not-live wording",
    !/\b(sample|preview|demo|not live|not-live)\b/i.test(flat),
  );
}

async function signedOut(colorScheme) {
  console.log(`\n================ signed out, ${colorScheme} ================`);
  const context = await themed(colorScheme, (o) => signedOutContext(browser, o));
  const page = await context.newPage();
  try {
    for (const [label, path] of Object.entries(PATHS)) {
      await expectSignInWall(check, path);
      const response = await page.goto(`${BASE_URL}${path}`, { waitUntil: "load", timeout: 60_000 });
      await page.waitForTimeout(WAIT);
      check(`${label}: answers, and not with a server error`, (response?.status() ?? 500) < 400);
      check(`${label}: the browser lands on the sign-in door`, onSignInDoor(page));
      await inspect(page, `${label} (sign-in door)`);
    }
  } finally {
    await context.close();
  }
}

async function preview(colorScheme) {
  console.log(`\n================ preview, ${colorScheme} ================`);
  const context = await themed(colorScheme, (o) => browser.newContext(o));
  const page = await context.newPage();
  try {
    console.log("/preview/f3/checkout");
    if (!(await openPreview(page, "/preview/f3/checkout", check, { wait: WAIT }))) return;
    await themeIs(page, colorScheme);
    check("the page is titled as checkout", await page.getByText("Checkout").first().isVisible());
    const flat = await inspect(page, "checkout (preview)");
    honestWording(flat);
    check(
      "the pay controls are present (never pressed)",
      (await page.getByRole("button", { name: /pay/i }).count()) > 0,
    );
  } finally {
    await context.close();
  }
}

async function signedIn(colorScheme, state) {
  console.log(`\n================ signed in (QA member), ${colorScheme} ================`);
  const context = await themed(colorScheme, (o) => qaContext(browser, state, o));
  const page = await context.newPage();
  try {
    /* ------------------------------------------- a well-formed booking id */
    console.log(PATHS.booking);
    const response = await page.goto(`${BASE_URL}${PATHS.booking}`, { waitUntil: "load", timeout: 60_000 });
    await page.waitForTimeout(WAIT);
    check("route answers, and not with a server error", (response?.status() ?? 500) < 400);
    await themeIs(page, colorScheme);
    check("the page is titled as checkout", await page.getByText("Checkout").first().isVisible());
    const flat = await inspect(page, "booking id");
    const matched = HONEST_HEADLINES.filter((headline) => flat.includes(headline));
    check(
      `an honest state is on screen${matched.length > 0 ? ` ("${matched[0]}")` : ""}`,
      matched.length > 0,
    );
    // An honest state is only honest if it offers a way onward.
    check("the honest state offers somewhere to go next", (await page.locator("a.nf-btn").count()) > 0);
    honestWording(flat);

    /* ------------------------------------------- the Paystack return trip */
    console.log(PATHS.returned);
    const returned = await page.goto(`${BASE_URL}${PATHS.returned}`, { waitUntil: "load", timeout: 60_000 });
    await page.waitForTimeout(WAIT + 800);
    check("return path answers, and not with a server error", (returned?.status() ?? 500) < 400);
    await inspect(page, "return path");

    /* ----------------------------------------------- a malformed booking id */
    console.log(PATHS.malformed);
    const malformed = await page.goto(`${BASE_URL}${PATHS.malformed}`, { waitUntil: "load", timeout: 60_000 });
    await page.waitForTimeout(WAIT);
    check("a malformed booking id answers, and not with a server error", (malformed?.status() ?? 500) < 400);
    await inspect(page, "malformed id");
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ executablePath: EXECUTABLE_PATH });

console.log(`checkout graceful path against ${BASE_URL}`);
await signedOut("dark");
await signedOut("light");
await preview("dark");
await preview("light");
console.log("\nsigned in as the QA member");
const state = await signInAsQa(browser);
if (state) {
  await signedIn("dark", state);
  await signedIn("light", state);
}
await browser.close();

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nall checks passed.");
