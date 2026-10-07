/*
 * LIVE FLAG WALK: after a switch group goes on, open the pages it changes as the
 * QA member against production and keep a shot of each. Read-only: it signs in
 * through the real form and only opens pages. Credentials come from the
 * environment only (QA_MEMBER_EMAIL, QA_MEMBER_PASSWORD).
 *
 *   node scripts/design/session-b-shots/flags-live-walk.mjs https://www.vallospaces.com <out-dir> <group>
 *
 * Groups: 1 (listing_board, commute_by_the_clock, neighbours_account, show_me).
 */
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";

const [, , base = "https://www.vallospaces.com", out = "live-flags", group = "1"] = process.argv;
const { QA_MEMBER_EMAIL, QA_MEMBER_PASSWORD } = process.env;
if (!QA_MEMBER_EMAIL || !QA_MEMBER_PASSWORD) {
  console.error("Set QA_MEMBER_EMAIL and QA_MEMBER_PASSWORD in the environment.");
  process.exit(2);
}
mkdirSync(out, { recursive: true });
const proxy = base.startsWith("https://") && process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
const args = process.env.CHROMIUM_TRUST_SPKI ? [`--ignore-certificate-errors-spki-list=${process.env.CHROMIUM_TRUST_SPKI}`] : [];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium", proxy, args });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
const steps = [];
const record = (step, pass, detail, shot) => {
  steps.push({ step, pass, detail, shot });
  console.log(`${pass ? "PASS" : "NOTE"} ${step}: ${detail}`);
};

await page.goto(`${base}/sign-in/email?next=%2Fsearch`, { waitUntil: "networkidle" });
await page.fill("#email", QA_MEMBER_EMAIL);
await page.fill("#password", QA_MEMBER_PASSWORD);
await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 30000 }), page.keyboard.press("Enter")]);
await page.waitForLoadState("networkidle");
record("signed in", true, `landed on ${new URL(page.url()).pathname}`);

if (group === "1") {
  await page.goto(`${base}/search`, { waitUntil: "networkidle" });
  const href = await page.locator('a[href^="/listing/"]').first().getAttribute("href").catch(() => null);
  if (!href) {
    record("listing", false, "no listing link on /search");
  } else {
    await page.goto(`${base}${href}`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${out}/g1-listing.png`, fullPage: true });
    const text = await page.locator("main").innerText().catch(() => "");
    record("show_me entry on the listing", text.includes("Show me"), href, "g1-listing.png");
    record("neighbours section on the listing", text.includes("What the neighbours say"), "shows on rentals and sales only", "g1-listing.png");
    record("commute line on the listing", /min in the (morning|evening) rush/.test(text), "shows only where route data exists for the area", "g1-listing.png");
  }
  // The listing board's public door resolves a listing code; an unknown code must answer cleanly.
  const r = await page.goto(`${base}/s/VL-000000`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${out}/g1-board-door.png` });
  record("board door answers", (r?.status() ?? 500) < 500, `status ${r?.status()}`, "g1-board-door.png");
}

record("no page errors", errors.length === 0, errors.length ? errors.join(" | ") : "none");
writeFileSync(`${out}/steps-g${group}.json`, JSON.stringify(steps, null, 2));
await browser.close();
