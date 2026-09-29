/**
 * Assistant and support golden-path checks.
 *
 * Run with the dev or production server already listening:
 *   node apps/web/tests/assistant.spec.mjs
 *
 * Covers, at phone size (390x844, dark):
 *   0. Signed out (since 23 September), `/assistant` and `/settings` answer
 *      the sign-in wall and `/api/assistant` answers 401 sign-in-required.
 *   1. The composer and its side navigation, in the preview harness
 *      (`/preview/f1/assistant`: the real AssistantChat with a fixture thread).
 *   2. Signed in as the QA member, sending a message on the real `/assistant`
 *      streams back an ordinary reply bubble: the graceful no-key sentence
 *      when the server has no ANTHROPIC_API_KEY, a real answer when it has
 *      one. SKIP without QA_MEMBER_EMAIL / QA_MEMBER_PASSWORD, because the
 *      route and its API are behind the sign-in wall.
 *   3. The settings SupportChat, in the preview harness
 *      (`/preview/session-b/sweep-settings?v=help`, the real component): it
 *      opens, asks for AI consent before anything is sent to the model (the
 *      consent sheet, `lib/ai/consent`), and when the reader says "Not now"
 *      an unknown question escalates to the ticket form, which validates the
 *      email field before filing anything.
 */

import { chromium } from "playwright-core";
import { expectApiWall, expectSignInWall, openPreview, qaContext, signInAsQa } from "./_gate.mjs";

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
const OPTIONS = {
  colorScheme: "dark",
  viewport: { width: 390, height: 844 },
  /* The settings groups arrive on a `Reveal`, which holds them at opacity 0
     until they scroll into view. Playwright waits for an element to be stable
     before scrolling to it, so the support card could never settle and the
     wait timed out on an animation rather than on a fault. The platform
     honours prefers-reduced-motion, and this spec is testing behaviour. */
  reducedMotion: "reduce",
};
const context = await browser.newContext(OPTIONS);
const page = await context.newPage();
const record = (label, ok) => check(label, ok);

try {
  /* ------------------------------------------------------- 0. signed out */
  console.log("signed out");
  await expectSignInWall(record, "/assistant");
  await expectSignInWall(record, "/settings");
  await expectApiWall(record, "/api/assistant", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "hello" }] }),
  });

  /* ------------------------------------ 1. assistant page shell (preview) */
  console.log("assistant page (preview harness)");
  if (await openPreview(page, "/preview/f1/assistant", record, { wait: 1500 })) {
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
    check(
      "the drawer closes again",
      !(await page.locator('div[role="dialog"] >> text=New chat').first().isVisible().catch(() => false)),
    );
  }

  /* --------------------------------- 2. a reply, signed in (QA account) */
  console.log("assistant reply, signed in");
  const state = await signInAsQa(browser);
  if (state) {
    const qa = await qaContext(browser, state, OPTIONS);
    const qp = await qa.newPage();
    await qp.goto(`${BASE_URL}/assistant`, { waitUntil: "load" });
    await qp.waitForTimeout(1500);
    await qp.locator("#assistant-input").fill("Find me a shortlet in Lagos");
    await qp.locator('button[aria-label="Send message"]').click();
    await qp.waitForTimeout(8000);
    const bubbles = await qp
      .locator('section[aria-label="Conversation"], div[aria-label="Conversation"]')
      .first()
      .innerText()
      .catch(() => "");
    check("user message appears in the thread", bubbles.includes("Find me a shortlet in Lagos"));
    const reply = bubbles.split("Find me a shortlet in Lagos").slice(1).join("").trim();
    check(
      "an ordinary reply bubble follows it (the no-key sentence, or a real answer)",
      reply.length > 20,
    );
    if (bubbles.includes("The assistant wakes the moment its key lands")) {
      console.log("          (no key on this server: the graceful sentence answered)");
    }
    await qa.close();
  }

  /* ------------------------------- 3. SupportChat escalation (preview) */
  console.log("settings support chat (preview harness)");
  if (await openPreview(page, "/preview/session-b/sweep-settings?v=help", record, { wait: 1500 })) {
    const section = page.locator('section[aria-label="Help and support"]').first();
    const openChat = section.locator('[data-testid="support-open"]');
    await openChat.scrollIntoViewIfNeeded();
    await openChat.click();
    await page.waitForTimeout(500);
    check("support chat opens", await page.locator("#support-input").isVisible());

    // A question outside the knowledge base.
    await page.locator("#support-input").fill("My quantum flux capacitor is rattling");
    await section.locator('button[aria-label="Send message"]').click();
    await page.waitForTimeout(800);

    // Nothing goes to the model before the reader has agreed to it.
    const notNow = section.locator('button:has-text("Not now")');
    check("the AI consent sheet asks first", await notNow.isVisible().catch(() => false));
    await notNow.click();
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
console.log("\nAll assistant and support checks passed.");
