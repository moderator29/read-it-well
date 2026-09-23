/*
 * R19: THE CONSOLE'S BACK ARROW, OPENED AND PRESSED IN A BROWSER.
 *
 * Opens the committed harness `/preview/session-b/admin/back`, which renders
 * the real AdminFrame and BackButton as they render on `/admin/money`, finds
 * the control by `data-nav-back` (what it is, not how it is painted), checks
 * it drew, presses it and records where the browser went. Passes only if the
 * press navigates to `/admin`, the declared parent of every desk. A
 * signed-out browser is then sent on to `/sign-in?next=/admin` by the proxy,
 * which still proves the press asked for `/admin`.
 *
 *   VALLO_PREVIEW_HARNESS=1 npx next start -p 3175   (production build)
 *   node scripts/design/session-b-shots/admin-back.mjs http://127.0.0.1:3175 [shot.jpg]
 */
import { chromium } from "playwright-core";

const [, , base = "http://127.0.0.1:3175", shot] = process.argv;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const asked = [];
page.on("request", (r) => {
  const u = new URL(r.url());
  if (u.origin === new URL(base).origin) asked.push(u.pathname + u.search);
});
const res = await page.goto(`${base}/preview/session-b/admin/back`, { waitUntil: "networkidle" });
const fail = (why) => {
  console.error(`FAIL ${why}`);
  process.exit(1);
};
if (!res || res.status() !== 200) fail(`harness answered ${res?.status()}`);
const back = page.locator("[data-nav-back]");
if ((await back.count()) !== 1) fail(`found ${await back.count()} back controls, expected 1`);
if (!(await back.isVisible())) fail("the back control did not draw");
const box = await back.boundingBox();
const lit = await page.locator('a.nf-admin-nav__row[aria-current="page"]').first().textContent();
if (shot) await page.screenshot({ path: shot, type: shot.endsWith(".jpg") ? "jpeg" : "png", ...(shot.endsWith(".jpg") ? { quality: 80 } : {}) });
const before = asked.length;
await back.click();
await page.waitForURL((u) => u.pathname === "/admin" || (u.pathname === "/sign-in" && u.searchParams.get("next") === "/admin"), { timeout: 10_000 }).catch(() => {});
const landed = new URL(page.url());
const requested = asked.slice(before).find((p) => p === "/admin" || p.startsWith("/admin?"));
if (!requested && landed.pathname !== "/admin" && landed.searchParams.get("next") !== "/admin") fail(`pressing back went to ${landed.pathname}${landed.search}`);
console.log(`PASS back control: 1 found by data-nav-back, drawn at ${Math.round(box.x)},${Math.round(box.y)} ${Math.round(box.width)}x${Math.round(box.height)}; rail lit on "${lit?.trim()}"; press requested ${requested ?? "(client)"}; landed ${landed.pathname}${landed.search}`);
await browser.close();
