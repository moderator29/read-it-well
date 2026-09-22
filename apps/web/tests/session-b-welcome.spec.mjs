/**
 * Get started (first run), against a running production server.
 *
 *   BASE_URL=http://127.0.0.1:3172 node tests/session-b-welcome.spec.mjs
 *
 * What this proves that `src/app/welcome/plan.test.ts` cannot: that a
 * stranger really reaches `/welcome` signed out, that `/start` hands over to
 * it, that the slides move by button, key and dot with each move announced,
 * and that "seen once" survives a real click, a real cookie and a real
 * second request. Signed out only; nothing here signs anybody up.
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3172";
const EXECUTABLE_PATH = "/opt/pw-browsers/chromium";
/* Navigations settle on DOMContentLoaded: a sandbox that cannot reach a third
   party would otherwise hold the load event, and nothing here needs it. */

let failures = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
    if (detail) for (const line of [].concat(detail).slice(0, 20)) console.log(`            ${line}`);
  }
}

/* A click that lands before hydration does nothing, and the page gives no
   signal for hydration, so a dot is pressed until it reports itself current. */
async function goToSlide(page, n) {
  const dot = page.getByTestId(`welcome-dot-${n}`);
  for (let i = 0; i < 40; i++) {
    await dot.click();
    if ((await dot.getAttribute("aria-current")) === "step") return;
    await page.waitForTimeout(250);
  }
  throw new Error(`slide ${n} never became current`);
}

const browser = await chromium.launch({ executablePath: EXECUTABLE_PATH });

try {
  console.log("\nReachable signed out");
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const res = await ctx.request.get(`${BASE_URL}/welcome`, { maxRedirects: 0 });
  check(
    "/welcome answers a stranger instead of sending them to sign in",
    res.status() === 200 && !(res.headers()["location"] ?? "").includes("/sign-in"),
    [`${res.status()} ${res.headers()["location"] ?? ""}`],
  );
  const start = await ctx.request.get(`${BASE_URL}/start`, { maxRedirects: 0 });
  check(
    "/start hands over to /welcome, keeping sign up as the destination",
    start.status() === 307 && (start.headers()["location"] ?? "").endsWith("/welcome?next=%2Fsign-up"),
    [`${start.status()} ${start.headers()["location"] ?? ""}`],
  );

  console.log("\nThe slides");
  const page = await ctx.newPage();
  await page.goto(`${BASE_URL}/welcome?next=%2Fsign-up`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("welcome-get-started").waitFor();
  await goToSlide(page, 1);
  check("the first slide is the render's", (await page.locator("h1").innerText()).includes("One platform"));
  check("four dots, the first current", (await page.locator(".nf-gs-dot").count()) === 4 &&
    (await page.getByTestId("welcome-dot-1").getAttribute("aria-current")) === "step");
  await page.getByTestId("welcome-get-started").click();
  await page.getByTestId("welcome-dot-2").and(page.locator('[aria-current="step"]')).waitFor();
  const live = page.locator('[aria-live="polite"]');
  check("moving on is announced", (await live.innerText()).startsWith("Slide 2 of 4"), [await live.innerText()]);
  await page.keyboard.press("ArrowRight");
  await page.getByTestId("welcome-dot-3").and(page.locator('[aria-current="step"]')).waitFor();
  check("the arrow keys move too", (await live.innerText()).startsWith("Slide 3 of 4"));
  await page.keyboard.press("ArrowLeft");
  await page.getByTestId("welcome-dot-2").and(page.locator('[aria-current="step"]')).waitFor();
  check("and back", (await live.innerText()).startsWith("Slide 2 of 4"));
  const cookiesBefore = await ctx.cookies();
  check(
    "nothing is remembered before the end or a skip",
    !cookiesBefore.some((c) => c.name === "vallo_first_run"),
  );

  console.log("\nSeen once");
  await page.getByTestId("welcome-skip-all").click();
  await page.waitForURL((url) => url.pathname === "/sign-up", { waitUntil: "domcontentloaded" });
  check("Skip carries on to where the person was going", new URL(page.url()).pathname === "/sign-up");
  const seen = (await ctx.cookies()).find((c) => c.name === "vallo_first_run");
  check("and the device remembers", seen?.value === "seen", [JSON.stringify(seen)]);

  await page.goto(`${BASE_URL}/welcome?next=%2Fsign-in`, { waitUntil: "domcontentloaded" });
  await page.waitForURL((url) => url.pathname === "/sign-in", { waitUntil: "domcontentloaded" });
  check("the second time, the intro is not shown again: straight to sign in", new URL(page.url()).pathname === "/sign-in");

  await page.goto(`${BASE_URL}/welcome`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("welcome-create").waitFor();
  check("with nowhere to go, a returning stranger lands on the choice", (await page.getByTestId("welcome-dot-4").getAttribute("aria-current")) === "step");
  const hrefs = {
    create: await page.getByTestId("welcome-create").getAttribute("href"),
    signIn: await page.getByTestId("welcome-sign-in").getAttribute("href"),
    browse: await page.getByTestId("welcome-browse").getAttribute("href"),
  };
  check(
    "the three doors are the real routes",
    hrefs.create === "/sign-up" && hrefs.signIn === "/sign-in" && hrefs.browse === "/search",
    [JSON.stringify(hrefs)],
  );
  await page.getByTestId("welcome-browse").click();
  await page.waitForURL((url) => url.pathname === "/search", { waitUntil: "domcontentloaded" });
  check("Look around first opens browsing signed out", new URL(page.url()).pathname === "/search");
  await ctx.close();

  console.log("\nReaching the end is seeing it");
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p2 = await ctx2.newPage();
  await p2.goto(`${BASE_URL}/welcome`, { waitUntil: "domcontentloaded" });
  await goToSlide(p2, 4);
  await p2.getByTestId("welcome-create").waitFor();
  check(
    "the last slide writes the memory without a skip",
    (await ctx2.cookies()).some((c) => c.name === "vallo_first_run" && c.value === "seen"),
  );
  await ctx2.close();

  const ctx3 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p3 = await ctx3.newPage();
  await p3.goto(`${BASE_URL}/welcome?next=%2Fsign-in%3Fnext%3D%252Fwallet`, { waitUntil: "domcontentloaded" });
  await goToSlide(p3, 4);
  await p3.getByTestId("welcome-sign-in").waitFor();
  check(
    "a stranger headed for sign in meets Sign in as the lit door, with their destination kept",
    (await p3.getByTestId("welcome-sign-in").getAttribute("href")) === "/sign-in?next=%2Fwallet" &&
      ((await p3.getByTestId("welcome-sign-in").getAttribute("class")) ?? "").includes("nf-gs-btn--lit"),
    [await p3.getByTestId("welcome-sign-in").getAttribute("href")],
  );
  await ctx3.close();
} finally {
  await browser.close();
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
