/**
 * LIGHT / DARK / SYSTEM (light mode reintroduced, 25 September 2026).
 *
 * The control at the foot of the side navigation, driven the way a person
 * would on a phone (390x844, touch): the default, each choice, persistence in
 * storage AND the cookie, the server rendering the chosen theme with no flash,
 * System following the operating system live, the keyboard, and the browser
 * chrome colour. Credentials come from the environment only.
 *
 *   BASE_URL=http://localhost:3000 QA_MEMBER_EMAIL=... QA_MEMBER_PASSWORD=... \
 *   node apps/web/tests/theme-choice.spec.mjs
 */
import { chromium } from "playwright-core";
import { existsSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const EXECUTABLE = ["/opt/pw-browsers/chromium"].find(existsSync);
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };

let failures = 0;
function check(name, condition) {
  console.log(`  ${condition ? "ok    " : "FAILED"}  ${name}`);
  if (!condition) failures += 1;
}

const email = process.env.QA_MEMBER_EMAIL;
const password = process.env.QA_MEMBER_PASSWORD ?? process.env.QA_PASSWORD;
if (!email || !password) {
  console.error("theme-choice: set QA_MEMBER_EMAIL and QA_MEMBER_PASSWORD (or QA_PASSWORD).");
  process.exit(2);
}

const browser = await chromium.launch(EXECUTABLE ? { executablePath: EXECUTABLE } : {});
const login = await browser.newContext(PHONE);
const lp = await login.newPage();
await lp.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded" });
await lp.waitForTimeout(1500);
await lp.fill("#auth-email", email);
await lp.click("button:has-text('Continue')");
await lp.waitForSelector("#password", { timeout: 30_000 });
await lp.fill("#password", password);
await lp.click("button[type=submit]:has-text('Sign in')");
await lp.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 60_000 });
const state = await login.storageState();
await login.close();

const ctx = await browser.newContext({ ...PHONE, storageState: state, colorScheme: "light" });
const page = await ctx.newPage();
const theme = () => page.evaluate(() => document.documentElement.dataset.theme);
await page.goto(`${BASE}/home`, { waitUntil: "load" });
await page.waitForTimeout(1500);
check("with no choice made, a phone set to light still gets dark (the default)", (await theme()) === "dark");

await page.locator("button[aria-label*='menu' i]").first().tap();
await page.waitForTimeout(900);
const control = page.getByRole("dialog").locator("[data-testid=theme-control]");
check("the drawer carries the control at its foot", (await control.count()) === 1);
check("it is a radio group", (await control.getAttribute("role")) === "radiogroup");
const radios = control.locator("[role=radio]");
check("three answers, each at least 44px tall", (await radios.count()) === 3 && (await radios.first().boundingBox()).height >= 44);
check("labels are not elided", await radios.evaluateAll((rs) => rs.every((r) => [...r.querySelectorAll("span")].every((s) => s.scrollWidth <= s.clientWidth + 1))));

await radios.nth(0).tap();
await page.waitForTimeout(500);
check("Light paints light", (await theme()) === "light");
check("and is announced as checked", (await radios.nth(0).getAttribute("aria-checked")) === "true");
check("the browser chrome turns white", (await page.evaluate(() => document.querySelector('meta[name="theme-color"]')?.getAttribute("content"))) === "#FFFFFF");
check("stored", (await page.evaluate(() => localStorage.getItem("nf_theme"))) === "light");
check("and in the cookie", (await ctx.cookies()).some((c) => c.name === "nf_theme" && c.value === "light"));
const html = await (await page.request.get(`${BASE}/home`)).text();
check("the server renders the next page light, so nothing flashes", /<html[^>]*data-theme="light"/.test(html));

await radios.nth(2).tap();
await page.waitForTimeout(400);
check("System on a light phone is light", (await theme()) === "light");
await page.emulateMedia({ colorScheme: "dark" });
await page.waitForTimeout(400);
check("and follows the phone to dark without a reload", (await theme()) === "dark");

await radios.nth(2).focus();
await page.keyboard.press("ArrowLeft");
await page.waitForTimeout(300);
check("ArrowLeft chooses Dark", (await radios.nth(1).getAttribute("aria-checked")) === "true");
check("and focus follows the choice", await radios.nth(1).evaluate((el) => el === document.activeElement));
await page.keyboard.press("Home");
await page.waitForTimeout(300);
check("Home chooses Light", (await theme()) === "light");

await page.emulateMedia({ colorScheme: "light" });
await radios.nth(2).tap();
await page.reload({ waitUntil: "domcontentloaded" });
check("a System choice is resolved before paint on reload", (await theme()) === "light");

await browser.close();
console.log(failures === 0 ? "\ntheme-choice: all passed" : `\ntheme-choice: ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
