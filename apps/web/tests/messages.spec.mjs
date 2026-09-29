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
// surface. Section 3 below already records the second: five invented
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
// SINCE 23 SEPTEMBER a signed-out visitor never reaches any of the three: the
// proxy answers each with a 307 to `/sign-in?next=...` (src/proxy.ts). That is
// the most honest answer there is, so sections 1 to 3 now assert the wall
// (still deliberately not a 404: the conversation a link points at may exist)
// and that the door the browser lands on serves none of the invented strings.
// Signed in as the QA member, section 4 reads the real inbox and notifications
// screens (SKIP without QA_MEMBER_EMAIL / QA_MEMBER_PASSWORD). The signed-in
// inbox's shape is covered against fixtures in tests/inbox.spec.mjs.
//
// Exits non-zero on any failed expectation.

import { chromium } from "playwright-core";
import { expectSignInWall, onSignInDoor, qaContext, signedOutContext, signInAsQa } from "./_gate.mjs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";

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

const record = (label, ok) => (ok ? pass(label) : flunk(label));
const INVENTED = [
  "Adaeze Okafor",
  "Eko Pearl Waterfront Apartment",
  "The pool is for residents and their guests",
  "Is the apartment free from this Friday",
  "Booking confirmed",
];

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const VIEW = { viewport: { width: 390, height: 844 }, colorScheme: "dark", deviceScaleFactor: 2 };
const context = await signedOutContext(browser, VIEW);
const page = await context.newPage();

const SECTIONS = [
  ["1. /messages, signed out", "/messages"],
  ["2. a thread nobody may read, signed out", "/messages/conv-1"],
  ["3. /notifications, signed out", "/notifications"],
];
for (const [title, path] of SECTIONS) {
  console.log(title);
  /* The 307 to the door, with the way back; never a 404, because the thing a
     link points at may well exist and simply not be readable without a session. */
  await expectSignInWall(record, path);
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "load", timeout: 45000 });
  await page.waitForTimeout(1500);
  record("the browser lands on the sign-in door", onSignInDoor(page));
  await expectVisible(page, page.getByText(/Sign in to open that page/), "and the door says why");
  const text = await page.locator("body").innerText();
  const served = INVENTED.filter((line) => text.includes(line));
  record(`nothing invented is served to a stranger${served.length ? ` (${served.join(", ")})` : ""}`, served.length === 0);
}
await context.close();

// ------------------------------------------------------ 4. signed in
console.log("4. the real screens, signed in as the QA member");
const state = await signInAsQa(browser);
if (state) {
  const qa = await qaContext(browser, state, VIEW);
  const qp = await qa.newPage();
  await qp.goto(`${BASE_URL}/messages`, { waitUntil: "load", timeout: 45000 });
  await qp.waitForTimeout(1500);
  /* The surface is called Inbox now; the route stays /messages. */
  await expectVisible(qp, qp.getByRole("heading", { name: "Inbox" }), "Inbox heading");
  const inboxText = await qp.locator("body").innerText();
  const seeded = ["Adaeze Okafor", "Eko Pearl Waterfront Apartment"].filter((n) => inboxText.includes(n));
  record(`no seeded conversation (${seeded.join(", ") || "none"})`, seeded.length === 0);
  await qp.goto(`${BASE_URL}/notifications`, { waitUntil: "load", timeout: 45000 });
  await qp.waitForTimeout(1500);
  await expectVisible(qp, qp.getByRole("heading", { name: "Notifications" }), "Notifications heading");
  await qa.close();
}

await browser.close();

if (failures > 0) {
  console.error(`\n${failures} expectation(s) failed.`);
  process.exit(1);
}
console.log("\nAll messaging and notifications expectations passed.");
