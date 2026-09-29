/**
 * Welcome back, LIVE: a running production build talking to the real
 * Supabase project (LIVE PROOF RULE, 23 September).
 *
 *   BASE_URL=http://127.0.0.1:3173 node tests/session-b-signin-live.spec.mjs
 *   QA_MEMBER_EMAIL=... QA_MEMBER_PASSWORD=... BASE_URL=... \
 *     node tests/session-b-signin-live.spec.mjs --signed-in
 *
 * Signed out (runs today): the gate, and a real sign-in refused by the real
 * auth server with a made-up address. Nothing is written but the rate
 * limiter's own counter.
 *
 * Signed in (`--signed-in`, runs the moment the QA account exists): the
 * email-first door end to end, landing on `next`. Credentials come from the
 * environment only, never from the repository. It signs in and out once.
 */

import { chromium } from "playwright-core";
import { passcodeReady } from "./_passcode.mjs";
import { mkdirSync } from "node:fs";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3173";
const OUT = process.env.PROOF_DIR ?? "/tmp/signin-live";
mkdirSync(OUT, { recursive: true });
const SIGNED_IN = process.argv.includes("--signed-in");

let failures = 0;
function check(name, condition, detail) {
  console.log(`  ${condition ? "ok     " : "FAILED "} ${name}${detail ? `  (${detail})` : ""}`);
  if (!condition) failures += 1;
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addCookies([{ name: "vallo_first_run", value: "seen", url: BASE_URL }]);
const page = await ctx.newPage();
const path = () => page.url().replace(BASE_URL, "");
const stamp = () => new Date().toISOString();

async function fillAndWaitHydrated(selector, value) {
  for (let i = 0; i < 40; i++) {
    await page.fill(selector, value);
    if ((await page.inputValue(selector)) === value) return;
    await page.waitForTimeout(250);
  }
}

if (!SIGNED_IN) {
  console.log(`signed out, ${stamp()}`);

  /* The gate: a product address signed out goes to the door with its way back. */
  await page.goto(`${BASE_URL}/home`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  check("signed-out /home goes to sign in with next and the notice",
    path().startsWith("/sign-in?") && path().includes("next=%2Fhome") && path().includes("notice=sign-in-required"), path());
  const notice = await page.locator("[role=status]").first().textContent().catch(() => "");
  check("the sign-in-required notice is drawn", /Sign in to open that/.test(notice ?? ""), notice ?? "");
  await page.screenshot({ path: `${OUT}/live-gate-home.png` });

  /* First run is always reachable signed out. */
  const wel = await page.goto(`${BASE_URL}/welcome`, { waitUntil: "domcontentloaded" });
  check("/welcome shows signed out", wel?.status() === 200 && path().startsWith("/welcome"), `${wel?.status()} ${path()}`);

  /* A real sign-in, refused by the real auth server. The address is made up
     at a reserved domain (RFC 2606), so it cannot belong to anybody. */
  const made = `nobody-${Date.now()}@example.invalid`;
  await page.goto(`${BASE_URL}/sign-in`, { waitUntil: "domcontentloaded" });
  await fillAndWaitHydrated("#auth-email", made);
  await page.click("button:has-text('Continue')");
  await page.waitForURL(/\/sign-in\/email/, { timeout: 15000 });
  check("Continue carries the address to the password step", (await page.inputValue("#email")) === made, path());
  await fillAndWaitHydrated("#password", "not-the-password-1");
  const t0 = Date.now();
  await page.click("button[type=submit]:has-text('Sign in')");
  /* The action waits on the limiter's RPC as well as on the auth server;
     from a sandbox with no service key that call can take a while to give
     up (the limiter fails open by design), so the wait is generous. */
  const alert = page.locator("[role=alert]").filter({ hasText: /\S/ }).first();
  await alert.waitFor({ timeout: 90000 }).catch(() => {});
  const text = (await alert.textContent().catch(() => "")) ?? "";
  console.log(`  (refusal after ${Date.now() - t0} ms)`);
  check("the real auth server's refusal is drawn as the mapped sentence",
    /do not match|Too many attempts|could not complete/.test(text), text.trim());
  check("still on the password step, not signed in", path().startsWith("/sign-in/email"), path());
  await page.screenshot({ path: `${OUT}/live-refused.png`, fullPage: true });
} else {
  const email = process.env.QA_MEMBER_EMAIL;
  const password = process.env.QA_MEMBER_PASSWORD;
  if (!email || !password) {
    console.log("  WAITING ON QA ACCOUNTS: set QA_MEMBER_EMAIL and QA_MEMBER_PASSWORD");
    process.exit(2);
  }
  console.log(`signed in, ${stamp()}`);
  await page.goto(`${BASE_URL}/sign-in?next=${encodeURIComponent("/wallet")}`, { waitUntil: "domcontentloaded" });
  await fillAndWaitHydrated("#auth-email", email);
  await page.click("button:has-text('Continue')");
  await page.waitForURL(/\/sign-in\/email/, { timeout: 15000 });
  check("next rides to the password step", path().includes("next=%2Fwallet"), path());
  await fillAndWaitHydrated("#password", password);
  await page.click("button[type=submit]:has-text('Sign in')");
  await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 30000 }).catch(() => {});
  /* The passcode layer (docs/PASSCODE.md) stands in front of /wallet until the QA code is set or typed. */
  await passcodeReady(ctx, page, { baseUrl: BASE_URL });
  check("a real sign-in lands on next", path().startsWith("/wallet"), path());
  /* Let the wallet finish its first read so the proof shows the page, not
     its skeleton. */
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/live-signed-in.png` });
  const cookies = await ctx.cookies();
  check("the session cookie is set", cookies.some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token")));
}

await browser.close();
console.log(failures ? `${failures} FAILED` : "all passed");
process.exit(failures ? 1 : 0);
