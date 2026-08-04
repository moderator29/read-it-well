// Messaging and notifications golden path.
//
// Usage: node apps/web/tests/messages.spec.mjs   (server already running)
//   BASE_URL=http://localhost:3210 overrides the target.
//
// Walks the communication loops as a signed-out visitor (the seeded surface):
//   1. /messages renders the conversation threads.
//   2. A thread renders its bubbles and composer.
//   3. Typing money talk into the composer surfaces the safety education card
//      with the canonical wording, once per session.
//   4. /notifications renders its grouped items and the mark-all control.
// Exits non-zero on the first failed expectation.

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";

const CANONICAL_SAFETY_COPY =
  "For your safety, keep every chat and payment inside RentMe. Deals made outside the platform are not protected by us. Pay only after you have inspected the property.";

let failures = 0;

function pass(label) {
  console.log(`  ok  ${label}`);
}

function flunk(label, detail) {
  failures += 1;
  console.error(`FAIL  ${label}${detail ? `: ${detail}` : ""}`);
}

async function expectVisible(page, locator, label) {
  try {
    await locator.first().waitFor({ state: "visible", timeout: 15000 });
    pass(label);
  } catch (err) {
    flunk(label, String(err).split("\n")[0]);
  }
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  colorScheme: "dark",
  deviceScaleFactor: 2,
});
const page = await context.newPage();

// ------------------------------------------------------ 1. threads list
console.log("1. /messages renders threads");
await page.goto(`${BASE_URL}/messages`, { waitUntil: "load", timeout: 45000 });
await page.waitForTimeout(1500);
await expectVisible(page, page.getByRole("heading", { name: "Messages" }), "Messages heading");
await expectVisible(page, page.getByText("Adaeze Okafor"), "thread row: Adaeze Okafor");
await expectVisible(
  page,
  page.getByText("Eko Pearl Waterfront Apartment").first(),
  "thread row shows its listing",
);

// ------------------------------------------------------ 2. thread view
console.log("2. a thread renders bubbles and composer");
await page.goto(`${BASE_URL}/messages/conv-1`, { waitUntil: "load", timeout: 45000 });
await page.waitForTimeout(1500);
await expectVisible(
  page,
  page.getByText("The pool is for residents and their guests"),
  "agent bubble renders",
);
await expectVisible(
  page,
  page.getByText("Is the apartment free from this Friday"),
  "guest bubble renders",
);
const composer = page.locator("#thread-input");
await expectVisible(page, composer, "composer input renders");
await expectVisible(
  page,
  page.getByRole("button", { name: "Send message" }),
  "send button renders",
);

// ------------------------------------------------------ 3. education card
console.log("3. money talk surfaces the safety education card");
await composer.fill("can I pay by bank transfer");
await expectVisible(page, page.getByText(CANONICAL_SAFETY_COPY), "canonical safety copy appears");
await expectVisible(
  page,
  page.getByRole("button", { name: "Dismiss safety note" }),
  "education card is dismissible",
);

// ------------------------------------------------------ 4. notifications
//
// This block used to assert that "Booking confirmed", a "Yesterday" day label
// and a mark-all control were on screen for a signed-out visitor. All three
// were properties of a hardcoded list of five invented notifications that told
// a visitor who had never booked anything that their booking was confirmed and
// their wallet was ready. The seeded list is deleted, so the spec no longer
// asserts it: the product was wrong and now the expectation matches.
//
// The grouped inbox, its day labels and the mark-all control are all real for a
// signed-in caller and are covered there. What a signed-out visitor must get is
// an honest state, which is what this now checks. tests/notifications.spec.mjs
// carries the full guard, including the exact invented strings by name.
console.log("4. /notifications is honest when signed out");
await page.goto(`${BASE_URL}/notifications`, { waitUntil: "load", timeout: 45000 });
await page.waitForTimeout(1500);
await expectVisible(
  page,
  page.getByRole("heading", { name: "Notifications" }),
  "Notifications heading",
);

const notificationsText = await page.locator("body").innerText();
const honest =
  /Notifications switch on shortly|Sign in to see your notifications/.test(notificationsText);
const invented = notificationsText.includes("Booking confirmed");
if (honest && !invented) {
  console.log("  ok  signed-out notifications state is honest");
} else {
  failures += 1;
  console.log(
    `  FAIL signed-out notifications state is honest (honest=${honest}, invented=${invented})`,
  );
}

await browser.close();

if (failures > 0) {
  console.error(`\n${failures} expectation(s) failed.`);
  process.exit(1);
}
console.log("\nAll messaging and notifications expectations passed.");
