#!/usr/bin/env node
/**
 * THE MOTION AUDIT (track I, 25 September 2026).
 *
 * The signature motion in `app/css/signature-motion.css` promises three
 * things and this checks all three in a real browser at 390x844, touch and
 * mobile emulation, on every route that carries one of its animations:
 *
 *   1. NOTHING ANIMATES A LAYOUT PROPERTY. Every animation and transition the
 *      document is running (`document.getAnimations()`, sampled through the
 *      first 2.5 seconds, when the entrances run) is inspected keyframe by
 *      keyframe; any property that makes the browser lay the page out again
 *      (size, position, box, type metrics) is reported with the animation's
 *      name and target. Paint-only properties (colour, background-position,
 *      shadow) are not layout and are not reported. The Next.js development
 *      overlay (`nextjs-portal`) is not the product and is skipped.
 *   2. NO HORIZONTAL OVERFLOW WHILE IT MOVES. The scrolling element's
 *      `scrollWidth <= innerWidth` is sampled on every frame of those 2.5s.
 *   3. NO LAYOUT SHIFT. The cumulative layout shift of the first load, from
 *      `layout-shift` entries without recent input, must be under 0.02 (the
 *      "good" line is 0.1; entrances that only move transform add 0).
 *
 * And with `prefers-reduced-motion: reduce`, none of the signature animations
 * may run at all.
 *
 *   BASE_URL=http://localhost:3000 QA_MEMBER_EMAIL=... QA_PASSWORD=... \
 *   node apps/web/scripts/design/motion-audit.mjs
 *
 * Credentials come from the environment only. Exit code: number of failures.
 */
import { chromium } from "playwright-core";
import { existsSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const EXECUTABLE = ["/opt/pw-browsers/chromium"].find(existsSync);
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
const ROUTES = ["/home", "/stays", "/search", "/around", "/profile", "/listing/ed000000-0000-4000-8000-00000000002b"];
const SIGNATURE = ["nf-sig-logo", "nf-sig-settle", "nf-sig-pop", "nf-sig-ring"];
const LAYOUT = /^(width|height|min(Width|Height)|max(Width|Height)|top|right|bottom|left|inset\w*|margin\w*|padding\w*|border(Top|Right|Bottom|Left)?Width|borderWidth|fontSize|lineHeight|letterSpacing|wordSpacing|tabSize|flex\w*|grid\w*|gap|rowGap|columnGap|display|position|float|aspectRatio|blockSize|inlineSize)$/;

async function session(browser) {
  const email = process.env.QA_MEMBER_EMAIL;
  const password = process.env.QA_PASSWORD;
  if (!email || !password) throw new Error("QA_MEMBER_EMAIL and QA_PASSWORD are required in the environment");
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.fill("#auth-email", email);
  await page.click("button:has-text('Continue')");
  await page.waitForSelector("#password", { timeout: 30_000 });
  await page.fill("#password", password);
  await page.click("button[type=submit]:has-text('Sign in')");
  await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 60_000 });
  const state = await ctx.storageState();
  await ctx.close();
  return state;
}

const browser = await chromium.launch(EXECUTABLE ? { executablePath: EXECUTABLE } : {});
const state = await session(browser);
let failures = 0;
const fail = (line) => {
  failures += 1;
  console.log(`  FAIL  ${line}`);
};

for (const theme of ["dark", "light"]) {
  for (const reducedMotion of ["no-preference", "reduce"]) {
    const ctx = await browser.newContext({ ...PHONE, storageState: state, reducedMotion });
    await ctx.addCookies([{ name: "nf_theme", value: theme, url: BASE }]);
    await ctx.addInitScript(() => {
      window.__cls = 0;
      window.__wide = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__cls += entry.value;
      }).observe({ type: "layout-shift", buffered: true });
      const tick = () => {
        const el = document.scrollingElement;
        if (el && el.scrollWidth > window.innerWidth + 1) window.__wide += 1;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const page = await ctx.newPage();
    for (const route of ROUTES) {
      await page.goto(`${BASE}${route}`, { waitUntil: "commit" });
      const seen = new Map();
      for (let t = 0; t < 10; t++) {
        const found = await page.evaluate((layout) => {
          const re = new RegExp(layout);
          return document.getAnimations().map((a) => {
            const effect = a.effect;
            const target = effect?.target;
            const frames = effect?.getKeyframes?.() ?? [];
            const props = new Set();
            if (target?.closest?.("nextjs-portal") || target?.tagName?.toLowerCase() === "nextjs-portal") return null;
            for (const f of frames) for (const k of Object.keys(f)) if (re.test(k)) props.add(k);
            const name = a.animationName ?? a.transitionProperty ?? a.constructor.name;
            const where = target ? `${target.tagName?.toLowerCase()}.${String(target.className?.baseVal ?? target.className ?? "").split(" ")[0]}` : "?";
            return { name, where, bad: [...props] };
          }).filter(Boolean);
        }, LAYOUT.source);
        for (const a of found) seen.set(`${a.name}@${a.where}`, a);
        await page.waitForTimeout(250);
      }
      const bad = [...seen.values()].filter((a) => a.bad.length > 0);
      const signature = [...seen.values()].filter((a) => SIGNATURE.includes(a.name));
      const { cls, wide } = await page.evaluate(() => ({ cls: window.__cls, wide: window.__wide }));
      const label = `${theme} ${reducedMotion} ${route}`;
      console.log(`${label}: ${seen.size} animation(s), signature=[${signature.map((a) => a.name).join(",")}], CLS=${cls.toFixed(4)}, wide frames=${wide}`);
      for (const a of bad) fail(`${label}: ${a.name} on ${a.where} animates ${a.bad.join(", ")}`);
      if (wide > 0) fail(`${label}: the page was wider than the viewport on ${wide} frame(s)`);
      if (cls >= 0.02) fail(`${label}: CLS ${cls.toFixed(4)}`);
      if (reducedMotion === "reduce" && signature.length > 0) fail(`${label}: ${signature.map((a) => a.name).join(",")} ran under reduced motion`);
      await page.evaluate(() => {
        window.__cls = 0;
        window.__wide = 0;
      });
    }
    await ctx.close();
  }
}
await browser.close();
console.log(`\n${failures} failure(s).`);
process.exit(Math.min(failures, 100));
