/**
 * Assistant and support golden-path checks.
 *
 * Run with the dev or production server already listening:
 *   node apps/web/tests/assistant.spec.mjs
 *
 * Covers three loops at phone size (390x844, dark):
 *   1. /assistant renders the composer and its side navigation.
 *   2. Sending a message streams back the graceful no-key assistant bubble
 *      (this environment has no ANTHROPIC_API_KEY, so the route answers with
 *      its honest fallback and the UI must render it as an ordinary reply).
 *   3. The settings SupportChat opens, escalates an unknown question, and the
 *      escalation form validates the email field before filing anything.
 */

import { chromium } from "playwright-core";

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
const context = await browser.newContext({
  colorScheme: "dark",
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();

try {
  /* ---------------------------------------------- 1. assistant page shell */
  console.log("assistant page");
  await page.goto(`${BASE_URL}/assistant`, { waitUntil: "load" });
  await page.waitForTimeout(1500);

  check("composer input renders", await page.locator("#assistant-input").isVisible());
  check(
    "send button renders",
    await page.locator('button[aria-label="Send message"]').isVisible(),
  );
  check(
    "history control renders on mobile",
    await page.locator('button[aria-label="Conversation history"]').isVisible(),
  );

  // The sidebar itself lives in the drawer at phone size; open and confirm.
  await page.locator('button[aria-label="Conversation history"]').click();
  await page.waitForTimeout(500);
  check(
    "sidebar drawer opens with new chat",
    await page.locator('div[role="dialog"] >> text=New chat').first().isVisible(),
  );
  await page
    .locator('div[role="dialog"] button[aria-label="Close conversation history"]')
    .click();
  await page.waitForTimeout(400);

  /* ------------------------------------- 2. graceful no-key assistant reply */
  console.log("assistant reply without a key");
  await page.locator("#assistant-input").fill("Find me a shortlet in Lagos");
  await page.locator('button[aria-label="Send message"]').click();
  await page.waitForTimeout(4000);

  const bubbles = await page
    .locator('section[aria-label="Conversation"], div[aria-label="Conversation"]')
    .first()
    .innerText()
    .catch(() => "");
  check(
    "user message appears in the thread",
    bubbles.includes("Find me a shortlet in Lagos"),
  );
  check(
    "graceful no-key bubble appears",
    bubbles.includes("The assistant wakes the moment its key lands"),
  );

  /* --------------------------------------------- 3. SupportChat escalation */
  console.log("settings support chat");
  await page.goto(`${BASE_URL}/settings`, { waitUntil: "load" });
  await page.waitForTimeout(1500);

  const openChat = page.locator('section[aria-label="Help and support"] >> text=Open chat');
  await openChat.scrollIntoViewIfNeeded();
  await openChat.click();
  await page.waitForTimeout(500);
  check("support chat opens", await page.locator("#support-input").isVisible());

  // A question outside the knowledge base escalates to the ticket form.
  await page.locator("#support-input").fill("My quantum flux capacitor is rattling");
  await page
    .locator('section[aria-label="Help and support"] button[aria-label="Send message"]')
    .click();
  await page.waitForTimeout(1500);

  const nameField = page.locator("#support-escalation-name");
  const emailField = page.locator("#support-escalation-email");
  check("escalation form appears", await nameField.isVisible());

  // Empty email must be caught before anything is filed.
  await emailField.fill("");
  await page.locator("text=File the ticket").click();
  await page.waitForTimeout(400);
  check(
    "empty email is rejected",
    await page.locator("text=Add an email address so we can reply.").isVisible(),
  );

  // A malformed email must also be caught.
  await emailField.fill("not-an-email");
  await page.locator("text=File the ticket").click();
  await page.waitForTimeout(400);
  check(
    "malformed email is rejected",
    await page.locator("text=Enter a valid email address.").isVisible(),
  );
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
console.log("\nAll assistant and support checks passed.");
