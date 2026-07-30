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
console.log("4. /notifications renders grouped items");
await page.goto(`${BASE_URL}/notifications`, { waitUntil: "load", timeout: 45000 });
await page.waitForTimeout(1500);
await expectVisible(
  page,
  page.getByRole("heading", { name: "Notifications" }),
  "Notifications heading",
);
await expectVisible(page, page.getByText("Booking confirmed"), "booking item renders");
await expectVisible(page, page.getByText("Today").first(), "day label: Today");
await expectVisible(page, page.getByText("Yesterday").first(), "day label: Yesterday");
await expectVisible(
  page,
  page.getByRole("button", { name: "Mark all read" }),
  "mark-all control renders",
);

await browser.close();

if (failures > 0) {
  console.error(`\n${failures} expectation(s) failed.`);
  process.exit(1);
}
console.log("\nAll messaging and notifications expectations passed.");
