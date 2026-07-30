/**
 * Support golden path, both themes.
 *
 * Run with the dev or production server already listening:
 *   node apps/web/tests/support.spec.mjs
 *
 * Every check runs twice, once in dark and once in daylight, at phone size
 * (390x844), because a support bubble that only reads at night is a bug.
 *
 * What is asserted, and why it is the honest path here: this sandbox has no
 * ANTHROPIC_API_KEY, so POST /api/support answers 200 JSON with
 * `{configured: false, message}` instead of streaming. The surface renders that
 * message as an ordinary reply bubble and then answers from the keyword help
 * store, so the reply to "How do cancellations work?" carries both the honest
 * unconfigured sentence and the canonical cancellations answer. That is the
 * path these checks pin. With a key present the same bubble fills token by
 * token from the model instead, and every other check here is unchanged.
 *
 *   1. The support surface opens on /settings and again on /help.
 *   2. Sending a question renders a reply bubble with real content.
 *   3. Talk to a person shows the name and email form, and the form refuses an
 *      empty email and a malformed one before anything is filed.
 *   4. Nothing overflows horizontally at 390px.
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const EXECUTABLE = "/opt/pw-browsers/chromium";
const VIEWPORT = { width: 390, height: 844 };

const failures = [];
function check(label, condition) {
  if (condition) {
    console.log(`  ok    ${label}`);
  } else {
    failures.push(label);
    console.log(`  FAIL  ${label}`);
  }
}

/** True when the document is not wider than the phone it is being read on. */
async function noHorizontalOverflow(page) {
  return page.evaluate(
    (width) => document.documentElement.scrollWidth <= width + 1,
    VIEWPORT.width,
  );
}

const browser = await chromium.launch({ executablePath: EXECUTABLE });

try {
  for (const colorScheme of ["dark", "light"]) {
    console.log(`\n=== ${colorScheme} ===`);
    const context = await browser.newContext({ colorScheme, viewport: VIEWPORT });
    const page = await context.newPage();

    try {
      /* ------------------------------------------- 1. the surface opens */
      console.log("support surface on settings");
      await page.goto(`${BASE_URL}/settings`, { waitUntil: "load" });
      await page.waitForTimeout(1500);

      const card = page.locator('section[aria-label="Help and support"]');
      check(`${colorScheme}: support card renders`, await card.first().isVisible());

      const openChat = card.first().locator('[data-testid="support-open"]');
      await openChat.scrollIntoViewIfNeeded();
      await openChat.click();
      await page.waitForTimeout(500);

      check(
        `${colorScheme}: support panel opens`,
        await card.first().locator('[data-testid="support-panel"]').isVisible(),
      );
      check(
        `${colorScheme}: composer renders`,
        await page.locator('[data-testid="support-input"]').isVisible(),
      );
      check(
        `${colorScheme}: talk to a person is visible without asking anything`,
        await page.locator('[data-testid="support-human"]').isVisible(),
      );

      /* ------------------------------------------ 2. a question is answered */
      console.log("a question gets a reply");
      await page.locator('[data-testid="support-input"]').fill("How do cancellations work?");
      await page.locator('[data-testid="support-send"]').click();
      await page.waitForTimeout(4000);

      const replies = card.first().locator('[data-testid="support-reply"]');
      const replyCount = await replies.count();
      // The greeting is the first reply bubble, so an answer means at least two.
      check(`${colorScheme}: a reply bubble is rendered`, replyCount >= 2);

      const answer = replyCount > 0 ? await replies.last().innerText() : "";
      check(`${colorScheme}: the reply has real content`, answer.trim().length > 20);
      check(
        `${colorScheme}: the reply is the honest unconfigured line`,
        answer.includes("The support agent wakes the moment its key lands"),
      );
      check(
        `${colorScheme}: the keyword help store still answers the question`,
        answer.includes("free-cancellation deadline"),
      );

      // A cancellations answer earns exactly one quick action: the trips hub.
      check(
        `${colorScheme}: the answer offers a quick action to a real surface`,
        await card.first().locator('a[href="/bookings"]').first().isVisible(),
      );

      const thread = await card.first().innerText();
      check(
        `${colorScheme}: the question appears in the thread`,
        thread.includes("How do cancellations work?"),
      );

      /* ------------------------------------- 3. talk to a person, validated */
      console.log("talk to a person");
      await page.locator('[data-testid="support-human"]').click();
      await page.waitForTimeout(600);

      check(
        `${colorScheme}: escalation card appears`,
        await page.locator('[data-testid="support-escalation"]').last().isVisible(),
      );

      const form = page.locator('[data-testid="support-escalation"]').last();
      const nameField = form.locator('[data-testid="support-name"]');
      const emailField = form.locator('[data-testid="support-email"]');
      check(`${colorScheme}: the form asks for a name`, await nameField.isVisible());
      check(`${colorScheme}: the form asks for an email`, await emailField.isVisible());

      await nameField.fill("Ada Okonkwo");

      // Empty email is caught before anything is filed.
      await emailField.fill("");
      await form.locator('[data-testid="support-file"]').click();
      await page.waitForTimeout(500);
      check(
        `${colorScheme}: empty email is rejected`,
        (await form.locator('[data-testid="support-email-error"]').innerText()).includes(
          "Add an email address",
        ),
      );

      // A malformed address is caught too.
      await emailField.fill("ada-at-example");
      await form.locator('[data-testid="support-file"]').click();
      await page.waitForTimeout(500);
      check(
        `${colorScheme}: malformed email is rejected`,
        (await form.locator('[data-testid="support-email-error"]').innerText()).includes(
          "Enter a valid email address",
        ),
      );

      // Nothing was filed, so no receipt may exist.
      check(
        `${colorScheme}: no ticket receipt is shown for an invalid email`,
        (await page.locator('[data-testid="support-receipt"]').count()) === 0,
      );

      /* ------------------------------------------------ 4. no side scroll */
      check(
        `${colorScheme}: settings does not scroll sideways at 390px`,
        await noHorizontalOverflow(page),
      );

      /* ------------------------------- the second entry point still works */
      console.log("support surface on help");
      await page.goto(`${BASE_URL}/help`, { waitUntil: "load" });
      await page.waitForTimeout(1500);

      const helpCard = page.locator('section[aria-label="Help and support"]').first();
      await helpCard.scrollIntoViewIfNeeded();
      check(`${colorScheme}: help centre carries the support agent`, await helpCard.isVisible());

      await helpCard.locator('[data-testid="support-open"]').click();
      await page.waitForTimeout(500);
      check(
        `${colorScheme}: support panel opens on help`,
        await helpCard.locator('[data-testid="support-panel"]').isVisible(),
      );
      check(
        `${colorScheme}: help does not scroll sideways at 390px`,
        await noHorizontalOverflow(page),
      );
    } finally {
      await context.close();
    }
  }
} catch (error) {
  failures.push(`unexpected error: ${error?.message ?? error}`);
  console.error(error);
} finally {
  await browser.close();
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("\nAll support checks passed.");
