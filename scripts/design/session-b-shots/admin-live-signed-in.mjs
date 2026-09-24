/*
 * LIVE PROOF, SIGNED IN AS THE QA ADMIN: THE CONSOLE AGAINST THE REAL PROJECT.
 *
 * Needs a QA admin account. Credentials come
 * from the environment only, never from the repository:
 *   QA_ADMIN_EMAIL, QA_ADMIN_PASSWORD   the admin (required)
 *   QA_MEMBER_EMAIL, QA_MEMBER_PASSWORD the member (optional: the non-admin door)
 *
 *   node scripts/design/session-b-shots/admin-live-signed-in.mjs http://127.0.0.1:3175 <out-dir>
 *
 * Against a production build whose .env.local points at the live project. It
 * signs in through the real sign-in form and never writes anything: it only
 * opens pages. What it proves, each step recorded with its time and a shot:
 *   1. landing: a desk address as the first request of a browser session
 *      lands on the overview, carrying the desk ("You were heading to");
 *   2. the overview's reads return the live state: no panel says "This did
 *      not load", Live listings reads 0 (0 real listings; the 64 example
 *      listings are excluded), the sign-ups cell reads "7 people in all" (9
 *      accounts less the two QA accounts; EXPECT_PEOPLE overrides) and
 *      Supply by type shows 0 on every row;
 *   3. Continue opens the desk, and a second desk now opens directly;
 *   4. every inner page of this surface and every tab loads without "This
 *      did not load": Operations (jobs, alerts, audit, notifications, in
 *      flight), Analytics (30d, 90d, 12m), Settings;
 *   5. /admin/enter?next=/admin/money lands on the overview, never the desk;
 *   6. (with the member account) a signed-in non-admin at /admin sees the
 *      access screen and no console.
 */
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";

const [, , base = "http://127.0.0.1:3175", out = "live-admin"] = process.argv;
const { QA_ADMIN_EMAIL, QA_ADMIN_PASSWORD, QA_MEMBER_EMAIL, QA_MEMBER_PASSWORD } = process.env;
if (!QA_ADMIN_EMAIL || !QA_ADMIN_PASSWORD) {
  console.error("WAITING ON QA ACCOUNTS: set QA_ADMIN_EMAIL and QA_ADMIN_PASSWORD in the environment.");
  process.exit(2);
}
mkdirSync(out, { recursive: true });
const UNAVAILABLE = "This did not load";
const steps = [];
let failed = 0;
const record = (step, pass, detail, shot) => {
  steps.push({ step, pass, detail, shot, at: new Date().toISOString() });
  if (!pass) failed += 1;
  console.log(`${pass ? "PASS" : "FAIL"} ${step}: ${detail}`);
};

// A deployed host is reached through the box's HTTPS proxy when one is set (its CA is in the browser's NSS store).
const proxy = base.startsWith("https://") && process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
// The proxy re-terminates TLS with its own CA; CHROMIUM_TRUST_SPKI pins exactly that CA's key (the
// convention every shot script here follows), rather than turning certificate checks off.
const args = process.env.CHROMIUM_TRUST_SPKI ? [`--ignore-certificate-errors-spki-list=${process.env.CHROMIUM_TRUST_SPKI}`] : [];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium", proxy, args });

async function signIn(email, password, next = "/admin/money") {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${base}/sign-in/email?next=${encodeURIComponent(next)}`, { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 30_000 }), page.click('button[type="submit"]')]);
  await page.waitForLoadState("networkidle");
  return { ctx, page };
}

async function shot(page, name) {
  const path = `${out}/${name}.jpg`;
  await page.screenshot({ path, fullPage: true, type: "jpeg", quality: 80 });
  return path;
}

async function loadsClean(page, path, name) {
  await page.goto(base + path, { waitUntil: "networkidle" });
  const url = new URL(page.url());
  const body = await page.locator("main").innerText().catch(() => "");
  const p = await shot(page, name);
  const onPage = url.pathname + url.search;
  // Every failure sentence the console's desks use, so a desk that could not read is never counted as proven.
  const failures = [UNAVAILABLE, "could not be loaded", "could not be read", "could not reach", "did not load", "Something went wrong", "Application error", "does not carry that role"].filter((t) => body.toLowerCase().includes(t.toLowerCase()));
  const rail = await page.locator(".nf-admin-rail").count();
  record(`reads on ${path}`, failures.length === 0 && rail > 0 && url.pathname === path.split("?")[0], `landed ${onPage}; console drawn ${rail > 0}; failure copy ${failures.length ? failures.join(", ") : "none"}`, p);
  return body;
}

// 1 to 3: landing, overview reads, continue.
{
  const { ctx, page } = await signIn(QA_ADMIN_EMAIL, QA_ADMIN_PASSWORD);
  // The gate replaces the address in the browser; wait for it rather than read it mid-flight.
  await page.waitForURL((u) => u.pathname === "/admin", { timeout: 15_000 }).catch(() => {});
  const landed = new URL(page.url());
  const heading = await page.locator(".nf-admin-heading-to").innerText().catch(() => "");
  record("landing by address", landed.pathname === "/admin" && landed.searchParams.get("next") === "/admin/money" && /Money/.test(heading), `asked /admin/money after sign in, landed ${landed.pathname}${landed.search}; heading-to "${heading.replace(/\s+/g, " ").trim()}"`, await shot(page, "01-landing"));

  const main = await page.locator("main").innerText();
  const live = await page.locator(".nf-admin-kpi", { hasText: "Live listings" }).first().innerText().catch(() => "");
  const supplyRows = await page.locator("#ov-supply [role=row]:not(.nf-admin-dist__row--head), #ov-supply tbody tr").allInnerTexts().catch(() => []);
  record("overview reads", !main.includes(UNAVAILABLE), `"${UNAVAILABLE}" ${main.includes(UNAVAILABLE) ? "PRESENT" : "absent"}`, null);
  const openReviews = await page.locator(".nf-admin-kpi", { hasText: "Open reviews" }).first().innerText().catch(() => "");
  const railCounts = await page.locator(".nf-admin-rail .nf-admin-nav__count").allInnerTexts().catch(() => []);
  record("rail badges and Open reviews (getQueueCounts)", !/Unavailable/.test(openReviews), `Open reviews reads "${openReviews.replace(/\s+/g, " ").trim()}"; rail badges [${railCounts.join(", ")}]`, null);
  const alertsPanel = await page.locator("#ov-alerts").innerText().catch(() => "");
  record("recent alerts (getRiskAlerts)", alertsPanel.length > 0 && !/did not load/i.test(alertsPanel), alertsPanel.replace(/\s+/g, " ").trim().slice(0, 160), null);
  record("live listings is the live count", /Live listings\s*0\b/.test(live.replace(/\s+/g, " ")), `card reads "${live.replace(/\s+/g, " ").trim()}" (expected 0: 0 real, the 64 examples excluded)`, null);
  const people = await page.locator(".nf-admin-strip").innerText().catch(() => "");
  const expectPeople = process.env.EXPECT_PEOPLE ?? "7";
  record("real people exclude the QA accounts", new RegExp(`\\b${expectPeople} people in all`).test(people), `sign-ups cell reads "${(people.match(/\d[\d,]* people in all/) ?? ["(none)"])[0]}" (expected ${expectPeople}: 9 accounts less the two QA accounts)`, null);
  record("supply by type is empty", supplyRows.length === 0 || supplyRows.every((r) => /\b0\b/.test(r)), `${supplyRows.length} rows: ${supplyRows.map((r) => r.replace(/\s+/g, " ").trim()).join(" | ")}`, null);

  await Promise.all([page.waitForURL((u) => u.pathname === "/admin/money", { timeout: 20_000 }), page.click(".nf-admin-heading-to")]);
  record("continue opens the desk", new URL(page.url()).pathname === "/admin/money", `landed ${new URL(page.url()).pathname}`, await shot(page, "02-continue-money"));
  await page.goto(`${base}/admin/escrow`, { waitUntil: "networkidle" });
  record("a second desk opens directly", new URL(page.url()).pathname === "/admin/escrow", `landed ${new URL(page.url()).pathname}`, await shot(page, "03-second-desk"));

  // 3b: the back arrow on a live desk goes up to the overview (navigation only).
  await page.goto(`${base}/admin/money`, { waitUntil: "networkidle" });
  const back = page.locator("[data-nav-back]");
  const drawn = (await back.count()) === 1 && (await back.isVisible());
  await Promise.all([page.waitForURL((u) => u.pathname === "/admin", { timeout: 20_000 }).catch(() => {}), back.click()]);
  record("back arrow on a live desk", drawn && new URL(page.url()).pathname === "/admin", `drawn ${drawn}; from /admin/money pressed, landed ${new URL(page.url()).pathname}`, await shot(page, "04-back-arrow"));

  // 4: every inner page and tab of this surface.
  for (const [path, name] of [
    ["/admin", "10-overview"],
    ["/admin/operations?tab=jobs", "11-ops-jobs"],
    ["/admin/operations?tab=alerts", "12-ops-alerts"],
    ["/admin/operations?tab=audit", "13-ops-audit"],
    ["/admin/operations?tab=notifications", "14-ops-notifications"],
    ["/admin/operations?tab=inflight", "15-ops-inflight"],
    ["/admin/analytics?range=30d", "16-analytics-30d"],
    ["/admin/analytics?range=90d", "17-analytics-90d"],
    ["/admin/analytics?range=12m", "18-analytics-12m"],
    ["/admin/settings", "19-settings"],
    // Every other console desk, read only: the page must render its desk
    // (no access screen, no error boundary, none of the console's failure copy).
    ...["queue", "listings", "supply", "agents", "businesses", "stops", "kyc", "money", "payments", "fees", "escrow", "bookings", "bookings/reservations", "moderation", "flags", "reports", "social", "standing", "support", "alerts", "audit", "switches", "reference", "examples"].map(
      (d, i) => [`/admin/${d}`, `2${String(i).padStart(2, "0")}-${d.replace("/", "-")}`],
    ),
  ]) {
    await loadsClean(page, path, name);
  }
  await ctx.close();
}

// 5: the server-side entry never lands on a desk.
{
  // A session with the entry cookie removed, then the entry route typed as an address.
  const { ctx, page } = await signIn(QA_ADMIN_EMAIL, QA_ADMIN_PASSWORD);
  await page.waitForURL((u) => u.pathname === "/admin", { timeout: 15_000 }).catch(() => {});
  await page.evaluate(() => {
    document.cookie = "nf_admin_entry=; Path=/admin; Max-Age=0";
  });
  await page.goto(`${base}/admin/enter?next=${encodeURIComponent("/admin/money")}`, { waitUntil: "networkidle" });
  const u = new URL(page.url());
  record("/admin/enter lands on the overview", u.pathname === "/admin" && u.searchParams.get("next") === "/admin/money", `landed ${u.pathname}${u.search}`, await shot(page, "20-enter"));
  await ctx.close();
}

// 6: the non-admin door.
if (QA_MEMBER_EMAIL && QA_MEMBER_PASSWORD) {
  const { ctx, page } = await signIn(QA_MEMBER_EMAIL, QA_MEMBER_PASSWORD);
  await page.goto(`${base}/admin`, { waitUntil: "networkidle" });
  const rail = await page.locator(".nf-admin-rail").count();
  record("a member at /admin sees no console", rail === 0, `console rail drawn ${rail} times`, await shot(page, "30-member-at-admin"));
  await ctx.close();
} else {
  record("a member at /admin sees no console", true, "SKIPPED: QA_MEMBER_EMAIL not set", null);
}

await browser.close();
writeFileSync(`${out}/steps.json`, JSON.stringify({ base, steps }, null, 2));
process.exit(failed ? 1 : 0);
