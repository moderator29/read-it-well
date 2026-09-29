/**
 * Get started (first run), against a running production server.
 *
 *   BASE_URL=http://127.0.0.1:3172 node tests/session-b-welcome.spec.mjs
 *
 * What this proves that `src/app/welcome/plan.test.ts` cannot: that a
 * stranger really reaches `/welcome` signed out, that `/start` hands over to
 * it, that a cold start opens on the welcome intro with no way to skip it
 * and Get started leads to the sign-up options page (the founder, 29
 * September), that the slides (now the tour, `?tour=1`, and the arrival
 * screen) move by button, key and dot with each move announced,
 * that back (drawn, browser, and so Android's hardware back in the web view)
 * steps to the previous slide, that first run shows every time it is asked
 * for, and that the device cookie the sign up detour reads is still written.
 * Signed out only; nothing here signs anybody up.
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

  console.log("\nThe intro, and the options behind Get started");
  const intro = await ctx.newPage();
  await intro.goto(`${BASE_URL}/welcome?next=%2Fsign-up`, { waitUntil: "domcontentloaded" });
  await intro.getByTestId("welcome-intro").waitFor();
  check("a cold start opens on the intro, not the slides", (await intro.locator(".nf-gs-dot").count()) === 0);
  check(
    "the intro cannot be skipped: no Skip, no close, no tour door",
    (await intro.getByTestId("welcome-skip-all").count()) === 0 &&
      /* Inside the intro: the document's own "Skip to content" link is the
         keyboard's way past the chrome, not a way past the intro. */
      (await intro
        .getByTestId("welcome-intro")
        .locator('a:has-text("Skip"), button:has-text("Skip"), button[aria-label*="lose"], a[href*="tour=1"]')
        .count()) === 0,
  );
  const introHrefs = {
    start: await intro.getByTestId("intro-get-started").getAttribute("href"),
    signIn: await intro.getByTestId("intro-sign-in").getAttribute("href"),
  };
  check(
    "Get started goes to the sign-up options, Sign in to sign in",
    introHrefs.start === "/sign-up" && introHrefs.signIn === "/sign-in",
    [JSON.stringify(introHrefs)],
  );
  await intro.waitForFunction(() => document.cookie.includes("vallo_first_run=seen"), null, { timeout: 10000 }).catch(() => {});
  check(
    "showing the intro records the device, so the sign-in gate does not bounce it back",
    (await ctx.cookies()).some((c) => c.name === "vallo_first_run" && c.value === "seen"),
  );
  await ctx.clearCookies();
  await intro.goto(`${BASE_URL}/sign-up`, { waitUntil: "domcontentloaded" });
  const options = {
    email: await intro.getByTestId("options-email").getAttribute("href"),
    have: await intro.getByTestId("options-have-account").getAttribute("href"),
  };
  check(
    "the options page offers email sign up and the way to sign in",
    options.email === "/sign-up/email" && options.have === "/sign-in",
    [JSON.stringify(options)],
  );
  await intro.close();

  console.log("\nThe slides (the tour)");
  const page = await ctx.newPage();
  await page.goto(`${BASE_URL}/welcome?tour=1&next=%2Fsign-up`, { waitUntil: "domcontentloaded" });
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

  console.log("\nBack steps through the slides");
  check("a back square on slide two", (await page.getByTestId("welcome-back").count()) === 1);
  await goToSlide(page, 1);
  check("none on the first slide, as the render draws none", (await page.getByTestId("welcome-back").count()) === 0);
  await page.getByTestId("welcome-get-started").click();
  await page.getByTestId("welcome-dot-2").and(page.locator('[aria-current="step"]')).waitFor();
  await page.getByTestId("welcome-next").click();
  await page.getByTestId("welcome-dot-3").and(page.locator('[aria-current="step"]')).waitFor();
  check("a back square on slide three", (await page.getByTestId("welcome-back").count()) === 1);
  await page.goBack({ waitUntil: "commit" });
  await page.getByTestId("welcome-dot-2").and(page.locator('[aria-current="step"]')).waitFor();
  check(
    "the history back (what Android's hardware back does in the web view) goes to the previous slide, not out",
    new URL(page.url()).pathname === "/welcome",
  );
  await page.getByTestId("welcome-back").click();
  await page.getByTestId("welcome-dot-1").and(page.locator('[aria-current="step"]')).waitFor();
  check("the drawn back square goes to the previous slide", new URL(page.url()).pathname === "/welcome");

  /* A swipe: a pointer drag right to left across the stage moves one slide on. */
  const box = await page.locator(".nf-gs-carousel").boundingBox();
  if (box) {
    const y = box.y + box.height * 0.6;
    await page.mouse.move(box.x + box.width * 0.8, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.2, y, { steps: 6 });
    await page.mouse.up();
  }
  await page.getByTestId("welcome-dot-2").and(page.locator('[aria-current="step"]')).waitFor({ timeout: 5000 }).catch(() => {});
  check("a swipe across the stage moves one slide on", (await page.getByTestId("welcome-dot-2").getAttribute("aria-current")) === "step");
  await page.getByTestId("welcome-back").click();
  await page.getByTestId("welcome-dot-1").and(page.locator('[aria-current="step"]')).waitFor();

  console.log("\nShown every time, and the device still remembers");
  await page.getByTestId("welcome-skip-all").click();
  await page.waitForURL((url) => url.pathname === "/sign-up", { waitUntil: "domcontentloaded" });
  check("Skip carries on to where the person was going", new URL(page.url()).pathname === "/sign-up");
  const seen = (await ctx.cookies()).find((c) => c.name === "vallo_first_run");
  check("the device remembers, for the sign up and sign in detour", seen?.value === "seen", [JSON.stringify(seen)]);

  /* L-5: opened from the sign-up form's "What Vallo is" link, the control
     under the slides says where it goes, and nothing says Skip. */
  await page.goto(`${BASE_URL}/welcome?tour=1&next=${encodeURIComponent("/sign-up/email")}`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByTestId("welcome-get-started").waitFor();
  const backToForm = page.getByTestId("welcome-back-to-sign-up");
  check(
    "from the sign-up form, the tour's way out reads Back to sign up, and no Skip is drawn",
    (await backToForm.count()) === 1 &&
      (await backToForm.innerText()).trim() === "Back to sign up" &&
      (await page.getByTestId("welcome-skip-all").count()) === 0 &&
      /* "Skip to content" is the page's accessibility skip link (.nf-skip-link),
         which every screen now carries; it is not a way out of the tour. */
      (await page.locator('button:has-text("Skip"), a:has-text("Skip"):not(.nf-skip-link)').count()) === 0,
  );
  await backToForm.click();
  await page.waitForURL((url) => url.pathname === "/sign-up/email", { waitUntil: "domcontentloaded" });
  check("and it returns to the form", new URL(page.url()).pathname === "/sign-up/email");

  await page.goto(`${BASE_URL}/welcome?tour=1&next=%2Fsign-in`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("welcome-get-started").waitFor();
  check(
    "asked for again, first run shows again from the first slide (the founder's rule)",
    new URL(page.url()).pathname === "/welcome" &&
      (await page.getByTestId("welcome-dot-1").getAttribute("aria-current")) === "step",
  );
  await goToSlide(page, 4);
  const hrefs = {
    create: await page.getByTestId("welcome-create").getAttribute("href"),
    signIn: await page.getByTestId("welcome-sign-in").getAttribute("href"),
  };
  check(
    "a stranger's ending is the two real doors",
    hrefs.create === "/sign-up" && hrefs.signIn === "/sign-in",
    [JSON.stringify(hrefs)],
  );
  check(
    "and there is no look-around door: nothing inside is visible signed out",
    (await page.getByTestId("welcome-browse").count()) === 0 && (await page.getByTestId("welcome-skip-all").count()) === 0,
  );
  await ctx.close();

  console.log("\nReaching the end is seeing it");
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p2 = await ctx2.newPage();
  await p2.goto(`${BASE_URL}/welcome?tour=1`, { waitUntil: "domcontentloaded" });
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
      ((await p3.getByTestId("welcome-sign-in").getAttribute("class")) ?? "").includes("nf-btn--primary"),
    [await p3.getByTestId("welcome-sign-in").getAttribute("href")],
  );
  await ctx3.close();

  /* THE SIGNED-IN ENDING, through the committed fixture harness (rule
     R-G). It needs the server started with VALLO_PREVIEW_HARNESS=1; without
     it the harness answers 404 and these checks say so rather than pass. */
  console.log("\nThe signed-in ending (fixture harness)");
  const ctx4 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p4 = await ctx4.newPage();
  const h = await p4.goto(`${BASE_URL}/preview/session-b/welcome`, { waitUntil: "domcontentloaded" });
  if (!h || h.status() !== 200) {
    check("the harness is open (start the server with VALLO_PREVIEW_HARNESS=1)", false, [String(h?.status())]);
  } else {
    await goToSlide(p4, 4);
    await p4.getByTestId("welcome-continue").waitFor();
    check(
      "a member's ending is one Continue: no doors, no skip",
      (await p4.getByTestId("welcome-continue").count()) === 1 &&
        (await p4.getByTestId("welcome-create").count()) === 0 &&
        (await p4.getByTestId("welcome-sign-in").count()) === 0 &&
        (await p4.getByTestId("welcome-skip-all").count()) === 0,
    );
    await p4.getByTestId("welcome-continue").click();
    await p4.getByTestId("welcome-form").waitFor({ timeout: 15000 });
    check(
      "Continue, with the question unanswered, opens the interests question (the real InterestChoices)",
      (await p4.getByTestId("welcome-save").count()) === 1 && (await p4.locator('[data-testid^="interest-"]').count()) > 0,
    );
    const p5 = await ctx4.newPage();
    await p5.goto(`${BASE_URL}/preview/session-b/welcome?viewer=done`, { waitUntil: "domcontentloaded" });
    await goToSlide(p5, 4);
    await p5.getByTestId("welcome-continue").click();
    await p5.waitForURL((url) => url.pathname !== "/preview/session-b/welcome", { waitUntil: "domcontentloaded", timeout: 15000 });
    const landed = new URL(p5.url()).pathname;
    check(
      "Continue, with nothing left to answer, leaves first run for the app (/home; signed out here, so the proxy sends it on to sign in)",
      landed === "/home" || landed === "/sign-in",
      [landed],
    );
  }
  await ctx4.close();
} finally {
  await browser.close();
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
