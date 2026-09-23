/**
 * Profile, LIVE proof against the real project (LIVE_PROOF rule, 23 September).
 *
 *   NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt \
 *     BASE_URL=http://127.0.0.1:3171 node apps/web/tests/session-b-profile-live.spec.mjs
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

async function fillAndWaitHydrated(selector, value) {
  for (let i = 0; i < 40; i++) {
    await page.fill(selector, value);
    if ((await page.inputValue(selector)) === value) return;
    await page.waitForTimeout(250);
  }
}

/*
 * An independent read of the member's badge row, straight from the project's
 * REST door as the member (password grant with the public anon key, then a
 * SELECT on person_badge under RLS). The page's figure is checked against it.
 * Nothing is written. The email and password are never printed.
 */
async function restBadgeTier() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return { ok: false, why: "NEXT_PUBLIC_SUPABASE_URL / ANON_KEY unset in env" };
  const tok = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).then((r) => r.json()).catch(() => ({}));
  if (!tok.access_token) return { ok: false, why: "password grant refused" };
  const rows = await fetch(`${url}/rest/v1/person_badge?select=tier&user_id=eq.${tok.user.id}`, {
    headers: { apikey: anon, authorization: `Bearer ${tok.access_token}` },
  }).then((r) => r.json()).catch(() => null);
  return { ok: Array.isArray(rows), tier: Array.isArray(rows) && rows[0]?.tier ? rows[0].tier : "none", userId: tok.user.id };
}

if (!email || !password) {
  console.log("WAITING ON QA ACCOUNTS: signed-in links not run (QA_MEMBER_EMAIL / QA_MEMBER_PASSWORD unset)");
} else {
  /* The first-run door has been seen; the sign-in form is what is being proven. */
  await context.addCookies([{ name: "vallo_first_run", value: "seen", url: BASE }]);
  await page.goto(`${BASE}/sign-in?next=${encodeURIComponent("/profile")}`, { waitUntil: "domcontentloaded" });
  await fillAndWaitHydrated("#auth-email", email);
  await page.click("button:has-text('Continue')");
  await page.waitForURL(/\/sign-in\/email/, { timeout: 15000 });
  await fillAndWaitHydrated("#password", password);
  await page.click("button[type=submit]:has-text('Sign in')");
  await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 30000 }).catch(() => {});
  const landed = new URL(page.url()).pathname;
  record("sign in as the QA member lands on /profile (next)", landed === "/profile", `${stamp()} landed ${landed}`);
  if (landed !== "/profile") await page.goto(`${BASE}/profile`, { waitUntil: "load" });
  await page.waitForSelector('[data-testid="account-hero"]', { timeout: 20000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/signed-in-profile.jpg`, type: "jpeg", quality: 75 });

  const read = await page.evaluate(() => {
    const text = (s) => document.querySelector(s)?.textContent?.trim() ?? null;
    const emailRow = [...document.querySelectorAll(".nf-srow")].find((r) => /^\s*Email/.test(r.textContent ?? ""));
    return {
      name: text(".nf-pf-name__text") ?? text(".nf-pf-name"),
      handle: text(".nf-pf-handle"),
      bio: text(".nf-pf-bio"),
      badgeTier: document.querySelector(".nf-pf-name")?.getAttribute("data-badge-tier") ?? null,
      badgeDrawn: document.querySelectorAll('[data-testid="account-hero"] [data-tier]').length,
      counts: [...document.querySelectorAll(".nf-pf-count")].map((e) => e.textContent?.replace(/\s+/g, " ").trim()),
      rows: [...document.querySelectorAll('[data-testid^="row-"][href]')].map((e) => ({
        href: e.getAttribute("href"),
        value: e.querySelector(".nf-pf-row__value")?.textContent?.trim() ?? null,
      })),
      switchLine: text('[data-testid="profile-switch-role"] .nf-pf-row__sub'),
      settingsHref: document.querySelector('[data-testid="account-settings-button"]')?.getAttribute("href") ?? null,
      moreHrefs: [...document.querySelectorAll(".nf-pf-more a[href]")].map((a) => a.getAttribute("href")),
      emailRowTag: emailRow?.tagName ?? null,
      emailRowText: emailRow?.textContent ?? "",
      emailInputs: document.querySelectorAll('input[type="email"], input[name="email"]').length,
      claim: Boolean(document.querySelector('[data-testid="profile-claim-handle"]')),
      adminWord: /\badmin\b/i.test(document.querySelector('[data-testid="profile-switch-role"]')?.textContent ?? ""),
    };
  });
  const shown = { ...read, emailRowText: read.emailRowText.includes(email) ? "<the member's address>" : "<other>" };
  console.log("READ", JSON.stringify(shown).replaceAll(email, "<the member's address>"));

  record("identity read (name) renders from the member's profile", Boolean(read.name), `${stamp()} name=${JSON.stringify(read.name)} handle=${JSON.stringify(read.handle)}`);
  const rest = await restBadgeTier();
  record(
    "badge tier matches person_badge (none expected for a member)",
    rest.ok && read.badgeTier === rest.tier && (rest.tier !== "none" || read.badgeDrawn === 0),
    `${stamp()} page data-badge-tier=${read.badgeTier}, badges drawn ${read.badgeDrawn}; REST person_badge tier=${rest.ok ? rest.tier : rest.why}`,
  );
  record(
    read.handle ? "follower and following counts render" : "no handle: counts withheld, Claim your handle offered",
    read.handle ? read.counts.length === 2 : read.counts.length === 0 && read.claim,
    `${stamp()} counts ${JSON.stringify(read.counts)}, claim ${read.claim}`,
  );
  record(
    "belongings rows link to their routes (figures drawn only above zero)",
    ["/bookings", "/saved", "/wallet", "/inspections"].every((h) => read.rows.some((r) => r.href === h)),
    `${stamp()} ${JSON.stringify(read.rows)}`,
  );
  record("Switch role line says no admin to a member", !read.adminWord, `${stamp()} ${JSON.stringify(read.switchLine)}`);
  record("settings gear goes to /settings", read.settingsHref === "/settings", `${stamp()} ${read.settingsHref}`);
  record(
    "settings links below the fold go to their routes",
    ["/settings/place", "/reviews", "/messages", "/notifications", "/help"].every((h) => read.moreHrefs.includes(h)),
    `${stamp()} ${JSON.stringify([...new Set(read.moreHrefs)])}`,
  );
  record(
    "email drawn as a fixed fact (no field, the fixed line, the member's address)",
    read.emailInputs === 0 && read.emailRowTag === "DIV" && read.emailRowText.includes(email) &&
      read.emailRowText.includes("Your email address cannot be changed."),
    `${stamp()} email inputs ${read.emailInputs}, row <${read.emailRowTag}>, fixed line ${read.emailRowText.includes("cannot be changed") ? "present" : "absent"}`,
  );

  /* Your details sheet: opened and closed, never saved; no email field in it. */
  await page.click('[data-testid="row-details"]');
  await page.waitForTimeout(900);
  const sheetEmail = await page.locator('[role="dialog"] input[type="email"], [role="dialog"] input[name="email"]').count();
  record("Your details sheet carries no email field", sheetEmail === 0, `${stamp()} email inputs in sheet ${sheetEmail}`);
  await page.screenshot({ path: `${OUT}/signed-in-details-sheet.jpg`, type: "jpeg", quality: 75 });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  await page.click('[data-testid="account-tab-posts"]');
  await page.waitForTimeout(800);
  record("posts tab renders its panel", await page.locator("#account-panel-posts").isVisible(), stamp());
  await page.screenshot({ path: `${OUT}/signed-in-posts.jpg`, type: "jpeg", quality: 75 });
  await page.click('[data-testid="account-tab-account"]');
  await page.waitForTimeout(500);

  await page.click('[data-testid="profile-switch-role"]');
  await page.waitForTimeout(1000);
  const sheet = page.locator('[role="dialog"]');
  const sheetText = (await sheet.first().innerText().catch(() => "")).slice(0, 200).replace(/\n+/g, " | ");
  record("Switch role opens the workspace sheet", (await sheet.count()) > 0, `${stamp()} ${sheetText}`);
  await page.screenshot({ path: `${OUT}/signed-in-switch-sheet.jpg`, type: "jpeg", quality: 75 });
  await page.keyboard.press("Escape");

  await page.click('[data-testid="account-settings-button"]');
  await page.waitForURL((u) => u.pathname === "/settings", { timeout: 15000 }).catch(() => {});
  record("tapping the gear opens /settings signed in", new URL(page.url()).pathname === "/settings", `${stamp()} landed ${new URL(page.url()).pathname}`);
  await page.waitForTimeout(1000);
  /* The hub's last row, Log Out (the real signOut action). */
  const signOut = page.locator('[data-testid="hub-logout"]').first();
  await signOut.waitFor({ state: "attached", timeout: 20000 }).catch(() => {});
  await page.screenshot({ path: `${OUT}/signed-in-settings.jpg`, type: "jpeg", quality: 75, fullPage: true });
  if ((await signOut.count()) > 0) {
    await signOut.scrollIntoViewIfNeeded();
    await signOut.click();
    const confirm = page.locator('[role="dialog"]').getByRole("button", { name: /log out|sign out/i });
    await page.waitForTimeout(800);
    if ((await confirm.count()) > 0) await confirm.first().click();
    await page.waitForTimeout(2500);
    await page.goto(`${BASE}/profile`, { waitUntil: "load" });
    record("sign out, then /profile is gated again", new URL(page.url()).pathname === "/sign-in", `${stamp()} landed ${new URL(page.url()).pathname}`);
  } else {
    record("Log Out control found on /settings", false, `${stamp()} no Log Out row`);
  }
}

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed} of ${results.length} passed`);
process.exit(failed ? 1 : 0);
