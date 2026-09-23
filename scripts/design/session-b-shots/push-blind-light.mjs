/**
 * The push enrolment blind light (founder, 23 September): what the settings
 * control shows when the request carries no session, as in an iPhone home
 * screen app whose cookie store is separate from Safari's.
 *
 *   set -a; . <scratchpad>/qa.env; set +a        # QA_MEMBER_EMAIL / QA_MEMBER_PASSWORD
 *   node scripts/design/session-b-shots/push-blind-light.mjs --base <url> --phase before|after [--signed-in-tap]
 *
 * Credentials come from the environment only; nothing here writes them down.
 *
 * WHAT IS REAL AND WHAT IS STOOD IN. The server, the sign-in, the session
 * cookies, `/api/push/key` and `/api/push/register` are real. Headless
 * Chromium on this box has no reachable push service, so
 * `PushManager.subscribe` is replaced by an init script that returns a fixed
 * made-up endpoint. That endpoint can reach nobody. The signed-out tap sends
 * it to register with no cookie, which the server refuses before any write.
 * `--signed-in-tap` is only ever run against a local build with no service
 * role key, so register cannot write there either; never pass it against
 * production.
 *
 * Output: docs/design/proofs/session-b/push/<phase>/*.jpg and replies.json.
 */
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const BASE = arg("base", "http://127.0.0.1:3197");
const PHASE = arg("phase", "after");
const SIGNED_IN_TAP = process.argv.includes("--signed-in-tap");
const OUT = `docs/design/proofs/session-b/push/${PHASE}`;
const EMAIL = process.env.QA_MEMBER_EMAIL;
const PASSWORD = process.env.QA_MEMBER_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error("QA_MEMBER_EMAIL / QA_MEMBER_PASSWORD not set: WAITING ON QA CREDENTIALS");
  process.exit(2);
}
if (SIGNED_IN_TAP && /vallospaces\.com/.test(BASE)) {
  console.error("--signed-in-tap is for a local build only");
  process.exit(2);
}

const FAKE_ENDPOINT = "https://push.invalid/qa-blind-light-not-a-device";
const STUB = `(() => {
  if (!("PushManager" in window)) return;
  let held = null;
  const make = () => ({
    endpoint: ${JSON.stringify(FAKE_ENDPOINT)},
    expirationTime: null,
    toJSON() { return { endpoint: this.endpoint, keys: { p256dh: "BQA-standin-p256dh-key", auth: "standin-auth" } }; },
    unsubscribe: async () => { held = null; return true; },
  });
  PushManager.prototype.subscribe = async function () { held = held || make(); return held; };
  PushManager.prototype.getSubscription = async function () { return held; };
})();`;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium",
  /* A remote base goes through the box's egress proxy; a local one does not. */
  ...(BASE.startsWith("https:") && process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {}),
  /* The egress proxy re-terminates TLS under its own CA. Trusting exactly
     that CA's key (CHROMIUM_TRUST_SPKI, the base64 SHA-256 of its public
     key) keeps verification on for everything else. */
  args: process.env.CHROMIUM_TRUST_SPKI ? [`--ignore-certificate-errors-spki-list=${process.env.CHROMIUM_TRUST_SPKI}`] : [],
});
const replies = [];

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";

async function newContext({ iosHomeScreen = false } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
    ...(iosHomeScreen ? { userAgent: IPHONE_UA } : {}),
  });
  await ctx.grantPermissions(["notifications"], { origin: new URL(BASE).origin });
  await ctx.addInitScript(STUB);
  /* The flag an iPhone home screen app reports. Chromium is not Safari; this
     only lets the copy for that case be seen. */
  if (iosHomeScreen) await ctx.addInitScript("Object.defineProperty(navigator, 'standalone', { get: () => true });");
  return ctx;
}

async function signIn(page) {
  await page.goto(`${BASE}/sign-in/email?next=%2Fsettings%2Fnotifications`, { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.locator('input[type="password"]').first().press("Enter");
  await page.waitForURL(/\/settings\/notifications|\/home|\/welcome|\/start/, { timeout: 45_000 });
  if (!/\/settings\/notifications/.test(page.url())) {
    await page.goto(`${BASE}/settings/notifications`, { waitUntil: "networkidle" });
  }
}

let scenario = "load";
function watch(page) {
  page.on("response", async (response) => {
    const url = new URL(response.url());
    if (!url.pathname.startsWith("/api/push/")) return;
    const tag = scenario;
    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    /* The key is public by design; the rest never carries a secret. */
    replies.push({ scenario: tag, at: new Date().toISOString(), path: url.pathname, status: response.status(), body });
  });
}

/* Until the tap has settled: the button stops saying "Just a moment". */
async function settle(page) {
  await page
    .waitForFunction(() => !/Just a moment/.test(document.querySelector('[data-testid="push-turn-on"]')?.textContent ?? ""), null, { timeout: 25_000 })
    .catch(() => undefined);
}

async function shotSection(page, name) {
  const section = page.locator("#settings-push");
  await section.waitFor({ timeout: 20_000 });
  await page.waitForTimeout(800);
  await section.screenshot({ path: `${OUT}/${name}.jpg`, type: "jpeg", quality: 80 });
  const text = (await section.innerText()).replace(/\s+/g, " ").trim();
  const state = await page
    .locator("[data-push-setting]")
    .first()
    .evaluate((el) => ({
      setting: el.getAttribute("data-push-setting"),
      allowed: el.getAttribute("data-push-allowed"),
      registered: el.getAttribute("data-push-registered"),
    }))
    .catch(() => null);
  return { name, state, text };
}

const results = [];

/* 1. Signed in, permission granted, no row: what the control reads on load. */
{
  const ctx = await newContext();
  const page = await ctx.newPage();
  scenario = "load";
  watch(page);
  await signIn(page);
  results.push(await shotSection(page, "1-loaded-permission-granted"));

  /* 2. The iOS condition: the page is on screen, the request carries no
     session. Cookies cleared, then the tap. */
  await ctx.clearCookies();
  scenario = "signed-out-tap";
  await page.getByTestId("push-turn-on").click();
  await page.waitForTimeout(500);
  await settle(page);
  results.push(await shotSection(page, "2-tap-with-no-session"));
  await ctx.close();
}

/* 2b. The same, dressed as the iPhone home screen app. */
{
  const ctx = await newContext({ iosHomeScreen: true });
  const page = await ctx.newPage();
  scenario = "ios-app-load";
  watch(page);
  await signIn(page);
  await ctx.clearCookies();
  scenario = "ios-app-signed-out-tap";
  await page.getByTestId("push-turn-on").click();
  await page.waitForTimeout(500);
  await settle(page);
  results.push(await shotSection(page, "2b-ios-home-screen-tap-with-no-session"));
  await ctx.close();
}

/* 3. Signed in tap, local build only (register cannot write there). */
if (SIGNED_IN_TAP) {
  const ctx = await newContext();
  const page = await ctx.newPage();
  scenario = "signed-in-tap";
  watch(page);
  await signIn(page);
  await page.getByTestId("push-turn-on").click();
  await page.waitForTimeout(500);
  await settle(page);
  results.push(await shotSection(page, "3-tap-signed-in"));
  await ctx.close();
}

/* 4. FIXTURE, local only: register's reply replaced with ok and a made-up
   ref, to show ON appears only on an ok, and goes when the refreshed list
   (the real database read) does not hold that ref. */
if (process.argv.includes("--fixture-register-ok") && !/vallospaces\.com/.test(BASE)) {
  const ctx = await newContext();
  const page = await ctx.newPage();
  scenario = "fixture-register-ok";
  watch(page);
  await signIn(page);
  await page.route("**/api/push/register", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, deviceRef: "f1x7u4e0000a" }) }),
  );
  await page.getByTestId("push-turn-on").click();
  await page.locator('[data-push-registered="yes"]').waitFor({ timeout: 10_000 }).catch(() => undefined);
  results.push(await shotSection(page, "4-fixture-register-ok-immediately"));
  await page.waitForTimeout(5000);
  results.push(await shotSection(page, "4b-fixture-after-list-refresh"));
  await ctx.close();
}

await browser.close();
writeFileSync(`${OUT}/replies.json`, JSON.stringify({ base: BASE, phase: PHASE, results, replies }, null, 2));
console.log(JSON.stringify({ results, replies }, null, 2));
