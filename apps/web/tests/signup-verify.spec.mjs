/**
 * Sign up, type the code, be inside. No second sign-in.
 *
 * The confirmation email has always carried six digits under the words "Or
 * enter this code", and until now there was no screen on this platform that
 * asked for them. Somebody who read the code instead of tapping the button had
 * reached a dead end inside their own sign-up, and somebody who did tap the
 * button was then told to "sign in" for an account they had just made.
 *
 * What this spec can prove, and what it cannot, stated plainly because the
 * difference matters:
 *
 *   PROVED HERE. The screen exists, it is public so somebody arriving from an
 *   email client reaches it without a session, it asks for the address and the
 *   code, the code field is the right kind of field for a phone to offer the
 *   code above the keyboard, and a wrong code is refused in place rather than
 *   throwing the person back to the start.
 *
 *   NOT PROVED HERE. That a RIGHT code lets somebody in. That needs a real
 *   Supabase, a real account and a real code from a real email, and the
 *   database is empty. The action calls `verifyOtp` with type "signup", which
 *   both confirms the address and issues the session in one step, and the
 *   server client writes the same cookies the middleware reads. That is the
 *   whole mechanism, and it stays unproved until somebody signs up.
 *
 * Run with the server already up:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/signup-verify.spec.mjs
 */

import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const EXECUTABLE_PATH = "/opt/pw-browsers/chromium";
const SRC = join(dirname(fileURLToPath(import.meta.url)), "../src");

let failures = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
    if (detail) for (const line of [].concat(detail).slice(0, 10)) console.log(`            ${line}`);
  }
}

const browser = await chromium.launch({ executablePath: EXECUTABLE_PATH });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });

try {
  console.log("\nThe code screen");
  const page = await context.newPage();
  const res = await page.goto(`${BASE_URL}/sign-up/verify`, { waitUntil: "load" });
  await page.waitForTimeout(700);

  check("it exists and needs no session to reach", res.status() === 200, [`${res.status()}`]);
  check("it asks for the code", (await page.locator("#verify-code").count()) === 1);
  check(
    "and for the address, so the email can be opened on another device",
    (await page.locator("#verify-email").count()) === 1,
  );

  const code = page.locator("#verify-code");
  check(
    "the code field is a one-time-code field, so a phone offers the code",
    (await code.getAttribute("autocomplete")) === "one-time-code",
  );
  check(
    "and a numeric keypad opens on it",
    (await code.getAttribute("inputmode")) === "numeric",
  );

  /* Only digits, only six. A pasted "12 34 56" from a mail client is the
     ordinary case and must not reach the server as something to refuse. */
  await code.fill("");
  await code.type("12 34 56 78");
  check("it takes digits only, and stops at six", (await code.inputValue()) === "123456", [
    await code.inputValue(),
  ]);

  check(
    "there is a way to ask for another code",
    (await page.getByRole("button", { name: /another code/i }).count()) === 1,
  );
  check(
    "and a way back for somebody who already confirmed",
    (await page.locator('a[href="/sign-in"]').count()) >= 1,
  );

  /* ------------------------------------------------- the shape of the flow */

  console.log("\nThe flow, in the source that defines it");
  const actions = readFileSync(join(SRC, "lib/auth/actions.ts"), "utf8");

  check(
    "signing up with confirmation on goes to the code screen, not to a dead end",
    /\/sign-up\/verify/.test(actions) && !/Check your email to confirm your address, then sign in/.test(actions),
  );
  check(
    "verifying uses verifyOtp with type signup, which confirms AND issues the session",
    /verifyOtp\(\{[^}]*type: "signup"/s.test(actions),
  );
  check(
    "a verified account is taken inside rather than asked to sign in",
    /verifySignUpCode[\s\S]{0,3000}?redirect\(landingAfterAuth/.test(actions),
  );
  check(
    "the address is held in an httpOnly cookie rather than in the URL",
    /PENDING_EMAIL_COOKIE[\s\S]{0,400}?httpOnly: true/.test(actions),
  );
  check(
    "guessing six digits is rate limited, per address and per connection",
    /sign_up_verify"/.test(actions) && /sign_up_verify_ip"/.test(actions),
  );
  check(
    "asking for another code does not say whether the address is known",
    /If that address is waiting on a code/.test(actions),
  );
} finally {
  await context.close();
  await browser.close();
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
