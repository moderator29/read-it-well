/**
 * Captures the live screens in plan.mjs into docs/marketing/source/.
 *
 *   QA_MEMBER_EMAIL=... QA_MEMBER_PASSWORD=... \
 *     node scripts/marketing/capture/run.mjs [--only id,id] [--kind mobile|desktop] [--skip-existing]
 *
 * Mobile screens are 1320 x 2682 (the web view at 3x; the status bar is drawn
 * later, by screens.mjs, the way the native shell draws it). Desktop screens
 * are 2880 x 1800. A capture marked `full` also writes <id>-full.webp, the
 * whole page at 2x. Everything is WebP at quality 95, and every capture's
 * route, time and result goes into capture-report.json beside them.
 */
import sharp from "sharp";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BASE, VIEWPORTS, launch, contextFor, settle, signInWithin, hasSession, keepUnlocked, touchUnlock, isLocked } from "./session.mjs";
import { CAPTURES } from "./plan.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..", "..");
const OUT = join(REPO, "docs", "marketing", "source");
mkdirSync(OUT, { recursive: true });

const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1].split(",") : null;
const skipExisting = args.includes("--skip-existing");
const kindOnly = args.includes("--kind") ? args[args.indexOf("--kind") + 1] : null;

async function run(page, steps, signed) {
  for (const step of steps) {
    if (step.goto) {
      await page.goto(`${BASE}${step.goto}`, { waitUntil: "load", timeout: 90_000 });
      await settle(page, 1800);
      if (signed) await touchUnlock(page);
    } else if (step.click) {
      await page.locator(step.click).first().click({ timeout: 12_000 });
      await page.waitForTimeout(step.pause ?? 900);
    } else if (step.clickIf) {
      const target = page.locator(step.clickIf).first();
      if (await target.count()) {
        await target.click({ timeout: 12_000 }).catch(() => {});
        await page.waitForTimeout(step.pause ?? 900);
      }
    } else if (step.reveal) {
      await page.locator(step.reveal).first().evaluate((el, offset) => {
        window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - offset);
      }, step.offset ?? 96, { timeout: 12_000 });
      await page.waitForTimeout(1800);
    } else if (step.type) {
      const field = page.locator(step.type).first();
      await field.click({ timeout: 12_000 });
      await field.pressSequentially(step.text, { delay: 18 });
      await page.waitForTimeout(400);
    } else if (step.press) {
      await page.keyboard.press(step.press);
      await page.waitForTimeout(600);
    } else if (step.waitStable) {
      /* Streaming text: wait until the element has not changed for `ms`. */
      const quiet = step.ms ?? 3000;
      const started = Date.now();
      let last = "";
      let since = Date.now();
      while (Date.now() - started < (step.max ?? 60_000)) {
        const now = await page.locator(step.waitStable).first().innerText().catch(() => "");
        if (now !== last) { last = now; since = Date.now(); }
        else if (Date.now() - since > quiet) break;
        await page.waitForTimeout(500);
      }
    } else if (step.blur) {
      /* Nothing keeps focus: no focus ring on the captured field. */
      await page.evaluate(() => document.activeElement?.blur?.());
      await page.mouse.move(2, 2);
      await page.waitForTimeout(600);
    } else if (step.clear) {
      await page.evaluate((keys) => { for (const k of keys) { try { localStorage.removeItem(k); } catch {} } }, step.clear);
    } else if (step.top) {
      await page.evaluate(() => { window.scrollTo(0, 0); if (document.scrollingElement) document.scrollingElement.scrollTop = 0; });
      await page.waitForTimeout(900);
    } else if (step.into) {
      /* Scrolls whatever scrolls (the page or a panel) to bring the element to the top. */
      await page.locator(step.into).first().evaluate((el, offset) => {
        el.scrollIntoView({ block: "start" });
        let box = el.parentElement;
        while (box && box.scrollHeight <= box.clientHeight) box = box.parentElement;
        if (box) box.scrollTop -= offset; else window.scrollBy(0, -offset);
      }, step.offset ?? 120, { timeout: 12_000 });
      await page.waitForTimeout(1200);
    } else if (step.wait) {
      await page.waitForTimeout(step.wait);
    }
  }
}

/* Walk the page so lazily loaded images arrive before a full-page shot. */
async function loadWholePage(page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 600) {
    await page.evaluate((to) => window.scrollTo(0, to), y);
    await page.waitForTimeout(300);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(900);
}

const reportFile = join(OUT, "capture-report.json");
/* Written after every capture, merged with what is on disk, so a stopped
   run or two runs side by side (--kind) keep every result. */
function record(id, entry) {
  const report = existsSync(reportFile) ? JSON.parse(readFileSync(reportFile, "utf8")) : {};
  report[id] = entry;
  writeFileSync(reportFile, JSON.stringify(Object.fromEntries(Object.entries(report).sort()), null, 2) + "\n");
}
const browser = await launch();
const haveCredentials = Boolean(process.env.QA_MEMBER_EMAIL && process.env.QA_MEMBER_PASSWORD);
if (!haveCredentials) console.log("No QA credentials: public screens only.");

/* One long-lived signed-in context per device kind (see signInWithin). */
const signedIn = {};
async function signedInContext(kind) {
  if (!signedIn[kind]) {
    const ctx = await browser.newContext({ ...VIEWPORTS[kind], reducedMotion: "reduce", locale: "en-NG", timezoneId: "Africa/Lagos" });
    await ctx.addCookies([{ name: "vallo_first_run", value: "seen", url: BASE }]);
    await keepUnlocked(ctx);
    await signInWithin(ctx, { fresh: true });
    signedIn[kind] = ctx;
  }
  return signedIn[kind];
}

async function captureOnce(cap, ctx) {
  const theme = cap.theme ?? "dark";
  await ctx.addCookies([{ name: "nf_theme", value: theme, url: BASE }]);
  await ctx.clearCookies({ name: "nf_locale" });
  if (cap.locale) await ctx.addCookies([{ name: "nf_locale", value: cap.locale, url: BASE }]);
  const page = await ctx.newPage();
  await page.addInitScript((t) => { try { localStorage.setItem("nf_theme", t); } catch {} }, theme);
  const signed = cap.auth !== false;
  try {
    await run(page, cap.steps, signed);
    const path = new URL(page.url()).pathname;
    if (signed && (path.startsWith("/sign-in") || !(await hasSession(ctx)))) return { page, signedOut: true };
    if (signed && (await isLocked(page))) return { page, locked: true };
    return { page };
  } catch (error) {
    return { page, error };
  }
}

for (const cap of CAPTURES) {
  if (only && !only.includes(cap.id)) continue;
  const file = join(OUT, `${cap.id}.webp`);
  if (skipExisting && existsSync(file)) continue;
  if (kindOnly && (cap.kind ?? "mobile") !== kindOnly) continue;
  const needsAuth = cap.auth !== false;
  if (needsAuth && !haveCredentials) { console.log(`skip  ${cap.id} (needs the QA account)`); continue; }
  const kind = cap.kind ?? "mobile";
  let result;
  let ctx;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    ctx = needsAuth ? await signedInContext(kind) : await contextFor(browser, { kind, theme: cap.theme ?? "dark", locale: cap.locale });
    result = await captureOnce(cap, ctx);
    if (!result.signedOut && !result.locked) break;
    console.log(`      ${cap.id}: ${result.locked ? "the passcode lock came up" : "the session had ended"}; signing in again`);
    await result.page.close();
    await signInWithin(ctx, { fresh: true });
  }
  const { page, error, signedOut, locked } = result;
  try {
    if (error) throw error;
    if (signedOut) throw new Error("signed out");
    if (locked) throw new Error("passcode lock");
    const shot = await page.screenshot({ type: "png" });
    await sharp(shot).webp({ quality: 95, effort: 6 }).toFile(file);
    if (cap.full) {
      await loadWholePage(page);
      /* Shot at the device scale, then brought to 2x (880 px wide) for the
         video, which never shows a phone screen wider than that. */
      const whole = await page.screenshot({ type: "png", fullPage: true });
      await sharp(whole, { limitInputPixels: false }).resize({ width: kind === "desktop" ? 2880 : 880 }).webp({ quality: 92, effort: 6 }).toFile(join(OUT, `${cap.id}-full.webp`));
    }
    record(cap.id, { url: page.url().replace(BASE, ""), at: new Date().toISOString(), kind, theme: cap.theme ?? "dark", signedIn: needsAuth, ...(cap.locale ? { locale: cap.locale } : {}) });
    console.log(`ok    ${cap.id.padEnd(22)} ${page.url().replace(BASE, "")}`);
  } catch (err) {
    record(cap.id, { failed: String(err.message ?? err).split("\n")[0], at: new Date().toISOString() });
    console.log(`FAIL  ${cap.id.padEnd(22)} ${String(err.message ?? err).split("\n")[0]}`);
  }
  await page.close().catch(() => {});
  if (!needsAuth) await ctx.close();
}
await browser.close();
