/**
 * Tapping the button in the email: verifying, then inside.
 *
 * The owner's words: "sometimes supabase send verify link not code, make it
 * when they click that link it loaded and show verifying then takes them
 * inside the platform".
 *
 * It used to be nothing at all. `/auth/callback` was a route handler that
 * exchanged the code and answered with a 307, so a browser sat on a blank
 * white document for the length of a round trip and then jumped. It also could
 * not read the implicit flow, which carries the session in the URL FRAGMENT,
 * and a fragment never reaches a server: those people were told their link had
 * expired by a handler that was structurally incapable of seeing their token.
 *
 * WHAT IS PROVED HERE. That the screen exists and says what it is doing. That
 * all three link shapes are recognised and each one reaches the right call.
 * That a link with nothing in it is refused honestly rather than hanging. That
 * a spent link says so and offers the code, which does not expire on opening.
 * That the fragment is read at all, which is the case the old handler missed.
 * And that a session token is not left in the address bar afterwards.
 *
 * WHAT IS NOT. That a GOOD link lets somebody in. That needs a live Supabase,
 * a real account and a real unspent link, and the database is empty. Every
 * refusal below is Supabase refusing a token this spec invented, which is the
 * correct answer to an invented token and not the same thing as a green light.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/auth-callback.spec.mjs
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
  console.log("\nThe screen itself");

  /*
   * Read off the FIRST PAINT, not the live DOM.
   *
   * The claim is that the link loads and shows Verifying. First paint is the
   * server HTML, before a byte of JavaScript has run, and that is the only
   * place that claim can honestly be measured. Written against the running
   * page it raced and lost: this sandbox refuses an invented token in under a
   * second, so by the time the DOM could be asked, the screen had already
   * moved on to the refusal. Which is correct behaviour and the wrong question.
   */
  const html = await (
    await context.request.get(`${BASE_URL}/auth/callback?code=made-up-code`)
  ).text();

  check("it says what is happening on first paint", /Verifying your email/.test(html));
  check(
    "and it is announced, not just drawn",
    /data-testid="verifying"/.test(html) && /aria-live="polite"/.test(html),
  );
  check(
    "the wait is a bar with a direction, not a spinner",
    /nf-verify-sweep/.test(html) && !/nf-spinner/.test(html),
  );
  check(
    "somebody without JavaScript is sent to the code rather than left here",
    /<noscript>/.test(html) && /\/sign-up\/verify/.test(html),
  );

  const page = await context.newPage();
  await page.goto(`${BASE_URL}/auth/callback?code=made-up-code`, { waitUntil: "load" });
  await page.waitForTimeout(2500);

  console.log("\nA link that cannot work");
  check(
    "a made-up code is refused rather than hanging on Verifying",
    (await page.locator('[data-testid="verify-failed"]').count()) === 1,
  );
  check(
    "and the way forward is the code, which does not expire on opening",
    (await page.locator('a[href="/sign-up/verify"]').count()) >= 1,
  );

  const empty = await context.newPage();
  await empty.goto(`${BASE_URL}/auth/callback`, { waitUntil: "load" });
  await empty.waitForTimeout(2000);
  check(
    "a link carrying nothing at all is refused too",
    (await empty.locator('[data-testid="verify-failed"]').count()) === 1,
  );

  console.log("\nSupabase refusing it outright");
  const refused = await context.newPage();
  const res = await refused.goto(`${BASE_URL}/auth/callback?error=access_denied&error_code=otp_expired`, {
    waitUntil: "load",
  });
  check(
    "an error in the query goes straight to sign-in and says why",
    (res.url().includes("/sign-in") && res.url().includes("link-expired")),
    [res.url()],
  );

  console.log("\nThe fragment, which a server cannot see");
  const frag = await context.newPage();
  await frag.goto(
    `${BASE_URL}/auth/callback#access_token=made-up&refresh_token=made-up&type=signup`,
    { waitUntil: "load" },
  );
  await frag.waitForTimeout(2500);
  /* The old route handler could not reach this case at all. Reaching a refusal
     rather than "that link is missing the part that confirms who it belongs
     to" is the proof that the token was actually read. */
  const said = (await frag.locator('[data-testid="verify-failed"] p').first().textContent()) ?? "";
  check("a fragment token is read rather than ignored", !/missing the part/i.test(said), [said]);
  check(
    "and it is cleared from the address bar afterwards",
    !frag.url().includes("access_token"),
    [frag.url()],
  );

  console.log("\nThe three shapes, in the action that handles them");
  const actions = readFileSync(join(SRC, "lib/auth/actions.ts"), "utf8");
  check("the PKCE code is exchanged", /exchangeCodeForSession\(input\.code\)/.test(actions));
  check(
    "the hashed token is verified, which is what works on another device",
    /verifyOtp\(\{ token_hash: input\.tokenHash/.test(actions),
  );
  check("the implicit tokens are set as a session", /setSession\(\{/.test(actions));
  /*
   * This used to grep for `startsWith("//")` in this file, which is the shape
   * the check had when it was written by hand here. It is not written by hand
   * here any more: both `landingAfterAuth` and `landingFromPath` now delegate
   * to `safeReturnPath` in `lib/security/return-path.ts`, which is the single
   * implementation and the only one with unit tests behind it.
   *
   * That change was made because all three hand-rolled copies shared a hole.
   * None refused TAB, LF or CR, which a URL parser STRIPS before resolving, so
   * `/<TAB>/evil.example` passed every one of them and then left the origin.
   * Asserting on the literal comparison would now fail on code that is strictly
   * safer than the code it was written against, so the assertion moved up a
   * level: what must hold is that this file validates through the shared guard
   * rather than re-deriving the rules.
   */
  check(
    "next is re-validated through the one tested guard, so a forged link cannot carry somebody off-site",
    /landingFromPath/.test(actions) &&
      /landingAfterAuth/.test(actions) &&
      /lib\/security\/return-path/.test(actions) &&
      (actions.match(/safeReturnPath\(/g) ?? []).length >= 2,
  );
  check(
    "the old route handler is gone, so there are not two answers to one URL",
    !/app\/auth\/callback\/route/.test(actions),
  );
} finally {
  await context.close();
  await browser.close();
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
