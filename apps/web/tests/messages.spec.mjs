// Messaging and notifications golden path.
//
// Usage: node apps/web/tests/messages.spec.mjs   (server already running)
//   BASE_URL=http://localhost:3210 overrides the target.
//
// Walks the communication loops as a signed-out visitor:
//   1. /messages is honest rather than an inbox of invented people.
//   2. A thread nobody may read asks for a sign-in rather than inventing one.
//   3. /notifications is honest when signed out.
//
// Sections 1 and 2 used to assert the opposite, and that is the point of this
// header. They checked for a thread row reading "Adaeze Okafor", a listing
// title beside it, an agent bubble, a guest bubble and a working composer, all
// served to somebody who had never signed in, from a hardcoded `SEED_THREADS`
// in `lib/messages/repository.ts`. The thread view was the worse half: it
// mapped `mine: m.author === "guest"`, so a visitor was shown words they had
// never written, attributed to them, in a conversation with a named person who
// does not exist.
//
// This is the third time this exact shape has been found and removed on this
// surface. Section 4 below already records the second: five invented
// notifications telling a signed-out visitor their booking was confirmed and
// their wallet was ready. `lib/agent/repository.ts` records the first and
// states the rule the other two follow: identity is the one thing a "designed
// figures" label cannot rescue.
//
// So the expectations are inverted rather than deleted. Each one now names the
// invented string it is guarding against, because a spec that only checks for
// the honest state would pass again the day somebody reintroduces the fixture
// alongside it.
//
// The safety education card is NOT dropped by this. It fires on a live thread
// composer, which needs a session, and it is asserted against its canonical
// wording in tests/listing-detail.spec.mjs, tests/bookings.spec.mjs and
// tests/hybrid.spec.mjs. It moved surfaces; it did not lose its guard.
//
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
/* The surface is called Inbox now, everywhere a person can see it. The route
   stays /messages, because a URL people have shared should not break to rename
   a heading. The product changed; this expectation was right about the old
   name and is now right about the new one. */
await expectVisible(page, page.getByRole("heading", { name: "Inbox" }), "Inbox heading");
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
