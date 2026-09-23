/**
 * Profile, LIVE proof against the real project (LIVE_PROOF rule, 23 September).
 *
 *   BASE_URL=http://127.0.0.1:3171 node apps/web/tests/session-b-profile-live.spec.mjs
 *
 * Needs a production build (`next build && next start`) with `.env.local`
 * pointing at the real project. Signed-out links run always. Signed-in links
 * run only when QA_MEMBER_EMAIL and QA_MEMBER_PASSWORD are set in the
 * environment (never in the repo); otherwise they print WAITING ON QA ACCOUNTS.
 * Every read is printed so it can be checked against read-only SQL; nothing is
 * written except the sign in and sign out of the QA account.
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = (process.env.BASE_URL ?? "http://127.0.0.1:3171").replace(/\/$/, "");
const OUT = process.env.PROOF_DIR ?? "docs/design/proofs/session-b/profile/live";
const EXECUTABLE = process.env.CHROMIUM ?? "/opt/pw-browsers/chromium";
mkdirSync(OUT, { recursive: true });

const results = [];
const record = (link, ok, evidence) => {
  results.push({ link, ok, evidence });
  console.log(`${ok ? "PASS" : "FAIL"}  ${link}  ${evidence}`);
};

const browser = await chromium.launch({ executablePath: EXECUTABLE });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await context.newPage();
const stamp = () => new Date().toISOString();

/* ------------------------------------------------------------- signed out */
{
  const res = await page.goto(`${BASE}/profile`, { waitUntil: "load" });
  const url = new URL(page.url());
  record(
    "signed out /profile is sent to sign in, with the way back",
    url.pathname === "/sign-in" && (url.searchParams.get("next") ?? "").startsWith("/profile"),
    `${stamp()} status ${res?.status()} landed ${url.pathname}${url.search}`,
  );
  await page.screenshot({ path: `${OUT}/signed-out-profile-redirect.jpg`, type: "jpeg", quality: 75 });

  for (const path of ["/profile/setup", "/profile/setup/owner", "/profile?switch=owner"]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "load" });
    const landed = new URL(page.url());
    record(`signed out ${path} is sent to sign in`, landed.pathname === "/sign-in", `${stamp()} landed ${landed.pathname}${landed.search}`);
  }
}

/* -------------------------------------------------------------- signed in */
const email = process.env.QA_MEMBER_EMAIL;
const password = process.env.QA_MEMBER_PASSWORD;
if (!email || !password) {
  console.log("WAITING ON QA ACCOUNTS: signed-in links not run (QA_MEMBER_EMAIL / QA_MEMBER_PASSWORD unset)");
} else {
  await page.goto(`${BASE}/sign-in?next=/profile`, { waitUntil: "load" });
  await page.fill('input[name="email"]', email);
  await page.keyboard.press("Enter");
  await page.waitForSelector("#password", { timeout: 15000 });
  await page.fill("#password", password);
  await page.keyboard.press("Enter");
  await page.waitForURL((u) => u.pathname === "/profile", { timeout: 30000 }).catch(() => {});
  if (new URL(page.url()).pathname !== "/profile") await page.goto(`${BASE}/profile`, { waitUntil: "load" });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/signed-in-profile.jpg`, type: "jpeg", quality: 75 });

  const read = await page.evaluate(() => {
    const text = (s) => document.querySelector(s)?.textContent?.trim() ?? null;
    return {
      name: text(".nf-pf-name__text"),
      handle: text(".nf-pf-handle"),
      bio: text(".nf-pf-bio"),
      badgeTier: document.querySelector(".nf-pf-name")?.getAttribute("data-badge-tier") ?? null,
      counts: [...document.querySelectorAll(".nf-pf-count__value")].map((e) => e.textContent?.trim()),
      rows: [...document.querySelectorAll('[data-testid^="row-"][href]')].map((e) => ({
        href: e.getAttribute("href"),
        value: e.querySelector(".nf-pf-row__value")?.textContent?.trim() ?? null,
      })),
      switchLine: text('[data-testid="profile-switch-role"] .nf-pf-row__sub'),
      settingsHref: document.querySelector('[data-testid="account-settings-button"]')?.getAttribute("href") ?? null,
    };
  });
  console.log("READ", JSON.stringify(read));
  record("identity read (name, handle, bio) renders", Boolean(read.name), `${stamp()} ${JSON.stringify({ name: read.name, handle: read.handle })}`);
  record("badge tier read from person_badge", read.badgeTier !== null, `${stamp()} data-badge-tier=${read.badgeTier}`);
  record("belongings rows link to their routes", ["/bookings", "/saved", "/wallet", "/inspections"].every((h) => read.rows.some((r) => r.href === h)), JSON.stringify(read.rows));
  record("settings gear goes to /settings", read.settingsHref === "/settings", `${read.settingsHref}`);

  await page.click('[data-testid="account-tab-posts"]');
  await page.waitForTimeout(800);
  record("posts tab renders its panel", await page.locator("#account-panel-posts").isVisible(), stamp());
  await page.screenshot({ path: `${OUT}/signed-in-posts.jpg`, type: "jpeg", quality: 75 });
  await page.click('[data-testid="account-tab-account"]');

  await page.click('[data-testid="profile-switch-role"]');
  await page.waitForTimeout(1000);
  const sheet = page.locator('[role="dialog"]');
  record("Switch role opens the workspace sheet", (await sheet.count()) > 0, (await sheet.first().innerText().catch(() => "")).slice(0, 160).replace(/\n+/g, " | "));
  await page.keyboard.press("Escape");

  await page.goto(`${BASE}/settings`, { waitUntil: "load" });
  const signOut = page.getByRole("button", { name: /sign out/i }).first();
  if ((await signOut.count()) > 0) {
    await signOut.click();
    await page.waitForTimeout(2500);
    await page.goto(`${BASE}/profile`, { waitUntil: "load" });
    record("sign out, then /profile is gated again", new URL(page.url()).pathname === "/sign-in", `${stamp()} landed ${new URL(page.url()).pathname}`);
  } else {
    record("sign out control found on /settings", false, "no Sign out button");
  }
}

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed} of ${results.length} passed`);
process.exit(failed ? 1 : 0);
