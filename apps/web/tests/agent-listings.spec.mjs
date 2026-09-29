/**
 * Agent listings golden-path checks: the supply loop's front door.
 *
 * Run with the dev or production server already listening:
 *   node apps/web/tests/agent-listings.spec.mjs
 *
 * Covers, at phone size (390x844, dark), which is where an agent actually
 * lists a property:
 *
 *   0. Signed out, `/agent/list` and `/agent/listings` answer the sign-in wall
 *      (since 23 September; `src/proxy.ts`). The pitch a stranger used to get
 *      is no longer reachable signed out.
 *   1. The wizard, through the preview harness (`/preview/f5/agent-list`),
 *      which renders the real `ListingWizard` on the real AgentShell for a
 *      fixture approved agent: step one is named, the counter (now carried by
 *      the rail's progressbar label, not drawn text) reads one of eight, the
 *      title requirement fires inline in the gate's own words and the step
 *      does not advance, a good title moves on, and the Light and water step
 *      asks about the power supply, the water and the gate.
 *   2. The workspace, through `/preview/f5/agent-listings`: the heading and a
 *      visible way into the wizard, no overflow.
 *   3. Signed in as the QA member (not an agent), the real `/agent/list`
 *      shows the pitch, which routes to the workspace chooser
 *      (`/profile/setup`, agent-doors.ts). Needs QA_MEMBER_EMAIL /
 *      QA_MEMBER_PASSWORD; SKIP without them.
 */

import { chromium } from "playwright-core";
import { expectSignInWall, openPreview, qaContext, signInAsQa, skip } from "./_gate.mjs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const EXECUTABLE = "/opt/pw-browsers/chromium";

const failures = [];
function check(label, condition) {
  if (condition) {
    console.log(`  ok    ${label}`);
  } else {
    failures.push(label);
    console.log(`  FAIL  ${label}`);
  }
}

const browser = await chromium.launch({ executablePath: EXECUTABLE });
const VIEW = { colorScheme: "dark", viewport: { width: 390, height: 844 } };
const context = await browser.newContext(VIEW);
const page = await context.newPage();
const counter = () => page.locator('[role="progressbar"]').first().getAttribute("aria-label");

try {
  /* ------------------------------------------------------ 0. signed out */
  console.log("signed out");
  for (const route of ["/agent/list", "/agent/listings"]) await expectSignInWall(check, route);

  /* ------------------------------------------------ 1. the wizard (preview) */
  console.log("agent list (preview harness)");
  if (await openPreview(page, "/preview/f5/agent-list", check)) {
    const titleInput = page.locator('input[placeholder="Bright 2 bedroom flat in Lekki Phase 1"]');
    check("step one of the wizard renders", await titleInput.isVisible().catch(() => false));
    check(
      "step one is named",
      (await page.locator('button[aria-label="Step 1, Basic info"][aria-current="step"]').count()) === 1,
    );
    check("the step counter reads one of eight", (await counter()) === "Step 1 of 8");
    check(
      "the sticky footer offers the way forward",
      await page.locator('button:has-text("Next")').first().isVisible(),
    );

    console.log("title validation");
    await titleInput.fill("Flat");
    await page.locator('button:has-text("Next")').first().click();
    await page.waitForTimeout(900);
    check(
      "a short title is refused in the gate's own words",
      await page.locator("text=Give the listing a title of at least 8 characters.").first().isVisible(),
    );
    check("the wizard stays on step one", (await counter()) === "Step 1 of 8");

    await titleInput.fill("Bright 2 bedroom flat in Lekki Phase 1");
    await page.locator('button:has-text("Next")').first().click();
    await page.waitForTimeout(900);
    check("a good title moves the wizard on", (await counter()) === "Step 2 of 8");

    /* The wizard gained a fifth step, "Light and water", carrying the three
       questions a Nigerian guest asks before the price. The counter is the
       contract between the wizard and the person filling it in. Three more
       taps of Next from step two. */
    for (let i = 0; i < 3; i += 1) {
      await page.locator('button:has-text("Next")').first().click();
      await page.waitForTimeout(500);
    }
    check("the light and water step is reachable", (await counter()) === "Step 5 of 8");
    check(
      "and named",
      (await page.locator('button[aria-label="Step 5, Light and water"][aria-current="step"]').count()) === 1,
    );
    const utilitiesText = await page.evaluate(() => document.body.innerText);
    check(
      "it asks about the power supply",
      utilitiesText.includes("Power supply") && utilitiesText.includes("Band A"),
    );
    check("it asks about water", utilitiesText.includes("Borehole"));
    check(
      "it says the gate details are never public",
      /released only to a guest whose booking is confirmed/i.test(utilitiesText),
    );
  }

  /* --------------------------------------------- 2. the workspace (preview) */
  console.log("agent listings (preview harness)");
  if (await openPreview(page, "/preview/f5/agent-listings", check)) {
    const workspaceHeading = await page
      .locator("h1, h2")
      .filter({ hasText: /my listings/i })
      .first()
      .isVisible()
      .catch(() => false);
    check("the workspace shell renders", workspaceHeading);
    // Visible-only: the agent rail carries these hrefs and is hidden at
    // 390px, so a .first() match proves nothing about what a phone can reach.
    // The harness renders `ListingsWorkspace` without the page header, so the
    // header's "Start a listing" (`app/agent/listings/page.tsx`) is not on this
    // screen; what is, is every row's way back into the wizard.
    check(
      "every listing row opens the wizard",
      (await page.locator('a[href^="/agent/list?id="]:visible').count()) >= 2,
    );
    skip(
      "the header's Start a listing button on the real /agent/listings needs an approved agent's session (the harness omits the page header, and the QA member is not an agent)",
    );
    check(
      "no horizontal overflow at 390px",
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    );
  }

  /* ------------------------------------------ 3. signed in, not an agent */
  console.log("signed in as the QA member (not an agent)");
  const state = await signInAsQa(browser);
  if (state) {
    const qa = await qaContext(browser, state, VIEW);
    const qp = await qa.newPage();
    await qp.goto(`${BASE_URL}/agent/list`, { waitUntil: "load" });
    await qp.waitForTimeout(1200);
    check(
      "the pitch renders",
      await qp.locator("text=List your property on Vallo").first().isVisible().catch(() => false),
    );
    check(
      "the pitch routes to the workspace chooser",
      await qp.locator('a[href="/profile/setup"]').first().isVisible().catch(() => false),
    );
    await qp.goto(`${BASE_URL}/agent/listings`, { waitUntil: "load" });
    await qp.waitForTimeout(1200);
    check(
      "the workspace answers with the same pitch, never a dead end",
      (await qp.locator('a[href="/profile/setup"]:visible').count()) > 0,
    );
    await qa.close();
  }
} finally {
  await browser.close();
}

console.log("");
if (failures.length > 0) {
  console.log(`${failures.length} check(s) failed:`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("all agent listing checks passed");
