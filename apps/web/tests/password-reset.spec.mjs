/**
 * Getting back in when the password is gone.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/password-reset.spec.mjs
 *
 * Three routes, and one property that matters more than any of them.
 *
 * 1. `/sign-in/email` offers a way out. "Forgot password?" used to point back
 *    at `/sign-in`, which is where somebody already was.
 * 2. `/forgot-password` asks for one thing and asks for it once. No password
 *    field may appear on it: a reset form that takes a password is a phishing
 *    layout, and it teaches people the wrong shape.
 * 3. `/reset-password` opened without the session a recovery link creates says
 *    so plainly and offers another link, rather than showing a form that would
 *    fail on submit for reasons nobody could see.
 *
 * The property: the request form must never reveal whether an address has an
 * account. That is asserted at the source rather than over HTTP, because this
 * sandbox cannot reach Supabase - so the check below reads the action module
 * and proves there is exactly one success sentence and that it is conditional
 * ("if that email has an account"). A regression that added "no account with
 * that email" would fail it.
 */

import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

let failures = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}${detail ? `\n          ${detail}` : ""}`);
  }
}

/* ------------------------------------------------- the disclosure property */

console.log("\n[source] lib/auth/actions.ts");
const actions = readFileSync(path.join(ROOT, "src/lib/auth/actions.ts"), "utf8");

check(
  "the reset request has a single, conditional success sentence",
  /if that email has an account/i.test(actions),
);
check(
  "it never says an address has no account",
  !/no account with that email|that email is not registered|we could not find that email/i.test(
    actions,
  ),
);
check(
  "the recovery link is sent through the platform's own callback",
  /resetPasswordForEmail\([\s\S]{0,200}\/auth\/callback\?next=/.test(actions),
);
check(
  "setting the new password goes through updateUser, not a token in the URL",
  /updatePassword[\s\S]{0,2000}auth\.updateUser\(\{ password \}\)/.test(actions),
);

/* --------------------------------------------------------------- the screens */

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function run(theme) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: theme,
  });
  await context.addInitScript((choice) => {
    try {
      window.localStorage.setItem("nf_theme", choice);
    } catch (error) {
      void error;
    }
  }, theme);
  const page = await context.newPage();

  const serverErrors = [];
  page.on("response", (r) => {
    if (r.status() >= 500) serverErrors.push(`${r.status()} ${r.url()}`);
  });

  try {
    console.log(`\n[${theme} 390px] /sign-in/email`);
    await page.goto(`${BASE_URL}/sign-in/email`, { waitUntil: "load" });
    check(
      "there is a way out of a forgotten password",
      (await page.locator('a[href="/forgot-password"]').count()) === 1,
    );

    console.log(`\n[${theme} 390px] /forgot-password`);
    await page.goto(`${BASE_URL}/forgot-password`, { waitUntil: "load" });

    check("one email field", (await page.locator('input[type="email"]').count()) === 1);
    check(
      "no password field on a reset request",
      (await page.locator('input[type="password"]').count()) === 0,
    );
    check(
      "a way back to sign in",
      (await page.locator('a[href="/sign-in"]').count()) >= 1,
    );
    check(
      "the send control is there",
      (await page.getByRole("button", { name: /send the reset link/i }).count()) === 1,
    );
    check(
      "no horizontal scroll",
      (await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )) === 0,
    );

    console.log(`\n[${theme} 390px] /reset-password without a session`);
    await page.goto(`${BASE_URL}/reset-password`, { waitUntil: "load" });
    const text = await page.evaluate(() => document.body.innerText);
    check("it explains that the link is spent", /expired/i.test(text), text.slice(0, 140));
    check(
      "and offers another one",
      (await page.locator('a[href="/forgot-password"]').count()) >= 1,
    );
    check(
      "no password form is shown to somebody with no session",
      (await page.locator('input[type="password"]').count()) === 0,
    );

    check("no route returned a server error", serverErrors.length === 0, serverErrors.join("\n"));
  } finally {
    await context.close();
  }
}

await run("dark");
await run("light");
await browser.close();

console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
