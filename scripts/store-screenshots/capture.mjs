/**
 * Captures the live screens for the store images, from production, as a
 * person would see them in the native app.
 *
 *   QA_MEMBER_EMAIL=... QA_MEMBER_PASSWORD=... \
 *     node scripts/store-screenshots/capture.mjs [--only 1,2,16] [--base https://www.vallospaces.com]
 *
 * Behind this session's egress proxy Chromium is pointed at HTTPS_PROXY, and
 * the proxy's certificate authority must be in Chromium's NSS store
 * (~/.pki/nssdb); on a normal machine neither applies.
 *
 * Without the two QA values it captures only the public screens (`auth:
 * false` in shots.mjs) and lists what it skipped. Credentials are read from
 * the environment and never written anywhere; the signed-in browser state
 * lives in memory for the length of the run.
 *
 * WHAT MAKES THE CAPTURE THE APP AND NOT A BROWSER
 * - The viewport is the 6.9" iPhone's web view: 440 x 894 points at 3x, the
 *   screen minus the 62 point status bar the shell draws above the web view.
 *   The same capture fills the Android phone on the Play images.
 * - The user agent carries `VALLO-NATIVE`, the mark the Capacitor shell
 *   appends (apps/web/capacitor.config.ts), so the server renders what the
 *   store build gets: the sign-in screen without doors a web view cannot
 *   complete, and never the marketing landing page.
 * - The theme is chosen the way the product stores it: the `nf_theme` cookie
 *   and the same key in localStorage (apps/web/src/lib/theme/theme.ts).
 * - Motion is reduced so every capture is a settled frame, not a frame from
 *   the middle of an entrance.
 *
 * Nothing is typed into a form, and nothing is created for anybody else. A
 * step list navigates, taps to open and scrolls. The one step that writes is
 * `clickIf` on the first-run interests question, which records the skip on
 * the QA account's own profile. What the QA account holds that a capture
 * shows (three favourites, two listings shared into its enquiry thread) was
 * put there through the product on 29 September 2026 and is listed in
 * docs/store/APP_STORE_SCREENSHOTS_HANDBOOK.md.
 *
 * Output: docs/store/screenshots/source/<NN>-<slug>-<k>.webp, 1320 x 2682.
 */
import { chromium } from "playwright-core";
import sharp from "sharp";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SHOTS, sourceName } from "./shots.mjs";
import { CAPTURE } from "./targets.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const OUT = join(REPO, "docs", "store", "screenshots", "source");

const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const BASE = arg("--base") ?? process.env.BASE_URL ?? "https://www.vallospaces.com";
const ONLY = arg("--only")?.split(",").map(Number);
const EMAIL = process.env.QA_MEMBER_EMAIL;
const PASSWORD = process.env.QA_MEMBER_PASSWORD;

const CHROMIUM = [process.env.CHROMIUM_PATH, "/opt/pw-browsers/chromium"].find((p) => p && existsSync(p));
const PROXY = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 VALLO-NATIVE";
const PHONE = {
  viewport: { width: CAPTURE.widthPt, height: CAPTURE.webviewHeightPt },
  deviceScaleFactor: CAPTURE.scale,
  isMobile: true,
  hasTouch: true,
  userAgent: UA,
  reducedMotion: "reduce",
  locale: "en-NG",
  timezoneId: "Africa/Lagos",
};

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ ...(CHROMIUM ? { executablePath: CHROMIUM } : {}), ...(PROXY ? { proxy: PROXY } : {}) });

/* Fill a field and read it back until it holds, because the form hydrates
   after first paint and a value typed before then is thrown away. */
async function fillHydrated(page, selector, value) {
  await page.waitForSelector(selector, { timeout: 60_000 });
  for (let i = 0; i < 40; i += 1) {
    await page.fill(selector, value);
    if ((await page.inputValue(selector)) === value) return;
    await page.waitForTimeout(250);
  }
}

async function signIn(attempt = 1) {
  const ctx = await browser.newContext(PHONE);
  await ctx.addCookies([{ name: "vallo_first_run", value: "seen", url: BASE }]);
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/sign-in`, { waitUntil: "load", timeout: 60_000 });
    await fillHydrated(page, "#auth-email", EMAIL);
    await page.click("button:has-text('Continue')");
    await fillHydrated(page, "#password", PASSWORD);
    await page.click("button[type=submit]:has-text('Sign in')");
    await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 90_000 });
    return await ctx.storageState();
  } catch (error) {
    if (attempt >= 2) throw error;
    return signIn(attempt + 1);
  } finally {
    await ctx.close();
  }
}

async function settle(page) {
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1800);
}

async function run(page, steps) {
  for (const step of steps) {
    if (step.goto) {
      await page.goto(`${BASE}${step.goto}`, { waitUntil: "domcontentloaded" });
      await settle(page);
    } else if (step.follow) {
      const href = await page.locator(step.follow).first().getAttribute("href", { timeout: 10_000 });
      if (!href) throw new Error(`nothing matches ${step.follow} on ${page.url()}`);
      await page.goto(new URL(href, BASE).href, { waitUntil: "domcontentloaded" });
      await settle(page);
    } else if (step.click) {
      await page.locator(step.click).first().click({ timeout: 10_000 });
      await page.waitForTimeout(900);
    } else if (step.clickIf) {
      const target = page.locator(step.clickIf).first();
      if (await target.count()) {
        await target.click({ timeout: 10_000 });
        await settle(page);
      }
    } else if (step.clickAll) {
      const targets = page.locator(step.clickAll);
      const n = Math.min(await targets.count(), step.max ?? 3);
      /* Each tap takes its control out of the selector's matches (a saved
         heart turns aria-pressed=true), so the next match is the next card;
         wait for that before tapping again. */
      for (let i = 0; i < n; i += 1) {
        const before = await page.locator(step.clickAll).count();
        await page.locator(step.clickAll).first().scrollIntoViewIfNeeded();
        await page.locator(step.clickAll).first().click({ timeout: 10_000 });
        await page.waitForFunction(
          ({ selector, before }) => document.querySelectorAll(selector).length < before,
          { selector: step.clickAll, before },
          { timeout: 8_000 },
        ).catch(() => {});
        await page.waitForTimeout(1200);
      }
    } else if (step.reveal) {
      /* Bring a section to `offset` CSS pixels below the top of the web view,
         then give lazy images in it time to arrive. */
      await page.locator(step.reveal).first().evaluate((el, offset) => {
        window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - offset);
      }, step.offset ?? 24, { timeout: 10_000 });
      await page.waitForTimeout(1800);
    } else if (step.scroll !== undefined) {
      await page.evaluate((y) => window.scrollBy(0, y), step.scroll);
      await page.waitForTimeout(600);
    } else if (step.wait) {
      await page.waitForTimeout(step.wait);
    }
  }
}

const state = EMAIL && PASSWORD ? await signIn() : null;
if (!state) console.log("No QA_MEMBER_EMAIL / QA_MEMBER_PASSWORD: capturing public screens only.\n");

const report = [];
for (const shot of SHOTS) {
  if (ONLY && !ONLY.includes(shot.n)) continue;
  for (const [k, screen] of shot.screens.entries()) {
    if (screen.from) continue;
    const file = join(OUT, sourceName(shot, k + 1));
    const needsAuth = screen.auth !== false;
    if (needsAuth && !state) {
      report.push({ shot: shot.n, screen: k + 1, result: "skipped, needs the QA account" });
      continue;
    }
    const ctx = await browser.newContext({ ...PHONE, colorScheme: shot.mode, ...(needsAuth ? { storageState: state } : {}) });
    await ctx.addCookies([
      { name: "vallo_first_run", value: "seen", url: BASE },
      { name: "nf_theme", value: shot.mode, url: BASE },
      /* The language cookie the in-app switcher writes (lib/locale.constants.ts). */
      ...(screen.locale ? [{ name: "nf_locale", value: screen.locale, url: BASE }] : []),
    ]);
    await ctx.addInitScript((theme) => {
      try { localStorage.setItem("nf_theme", theme); } catch {}
    }, shot.mode);
    const page = await ctx.newPage();
    try {
      await run(page, screen.steps);
      /* WebP at quality 95 is visually lossless and a seventh of the PNG, which
         matters for a folder that lives in git. */
      await sharp(await page.screenshot({ type: "png" })).webp({ quality: 95, effort: 6 }).toFile(file);
      report.push({ shot: shot.n, screen: k + 1, result: "captured", url: page.url().replace(BASE, ""), at: new Date().toISOString() });
    } catch (error) {
      report.push({ shot: shot.n, screen: k + 1, result: `failed: ${error.message.split("\n")[0]}`, url: page.url().replace(BASE, "") });
    }
    await ctx.close();
  }
}
await browser.close();

for (const r of report) console.log(`${String(r.shot).padStart(2)}.${r.screen}  ${r.result}${r.url ? `  ${r.url}` : ""}`);
const reportFile = join(OUT, "capture-report.json");
const earlier = existsSync(reportFile) ? JSON.parse(readFileSync(reportFile, "utf8")).report ?? [] : [];
const key = (r) => `${r.shot}.${r.screen}`;
const merged = [...earlier.filter((r) => !report.some((n) => key(n) === key(r))), ...report]
  .map((r) => ({ ...r, at: r.at ?? new Date().toISOString() }))
  .sort((a, b) => a.shot - b.shot || a.screen - b.screen);
writeFileSync(reportFile, JSON.stringify({ base: BASE, report: merged }, null, 2) + "\n");
