#!/usr/bin/env node
/**
 * THE TWO-THEME SWEEP (light mode reintroduced, 25 September 2026).
 *
 * The first light theme failed partly because nothing checked it (survey
 * R5, `docs/research/LIGHT_MODE_SURVEY.md`): the contrast probe covered four
 * elements on one route and the shape sweep ran in one theme. This walks every
 * main route at 390x844 (deviceScaleFactor 3, touch, mobile) in the themes
 * asked for and, on each, reports:
 *
 *   - text whose colour against the first opaque ground behind it is under
 *     WCAG AA (4.5:1, or 3:1 for large text). Text over a photograph or a
 *     non-uniform gradient is SKIPPED and not counted, because a probe cannot
 *     know what the picture paints; review those in the screenshots;
 *   - any visible element crossing the viewport's left or right edge with no
 *     clipping ancestor below the root (see `tests/_overflow.mjs` for why
 *     `scrollWidth` alone cannot fail on this product);
 *   - that the document actually painted the theme asked for.
 *
 * Signed-in routes need a session. Credentials come from the environment ONLY
 * and are never written anywhere:
 *
 *   BASE_URL=http://localhost:3000 QA_MEMBER_EMAIL=... QA_ADMIN_EMAIL=... \
 *   QA_PASSWORD=... node apps/web/scripts/design/light/sweep.mjs --themes light,dark
 *
 * Screenshots land in PROOF_DIR (default /tmp/vallo-theme-sweep). Exit code is
 * the number of routes with a failure, capped at 100.
 */
import { chromium } from "playwright-core";
import { existsSync, mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.env.PROOF_DIR ?? "/tmp/vallo-theme-sweep";
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const THEMES = arg("themes", "light,dark").split(",");
const ONLY = arg("routes", "") ? arg("routes", "").split(",") : null;
const EXECUTABLE = ["/opt/pw-browsers/chromium"].find(existsSync);

const PHONE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
};

const MEMBER = [
  ["home", "/home"], ["search", "/search"], ["filters", "/search?filters=open"],
  ["stays", "/stays"], ["restaurants", "/restaurants"], ["around", "/around"],
  ["messages", "/messages"], ["notifications", "/notifications"], ["profile", "/profile"],
  ["settings", "/settings"], ["saved", "/saved"], ["agent", "/agent"], ["host", "/host"],
  ["wallet", "/wallet"],
];
const PUBLIC = [["landing", "/"], ["signin", "/sign-in"], ["signup", "/sign-up"]];
const ADMIN = [["admin", "/admin"]];

function contrastProbe() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const g = canvas.getContext("2d", { willReadFrequently: true });
  const parse = (c) => {
    g.clearRect(0, 0, 1, 1);
    g.fillStyle = "#000";
    g.fillStyle = c;
    g.fillRect(0, 0, 1, 1);
    const d = g.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const lum = ([r, gg, b]) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(gg) + 0.0722 * f(b);
  };
  const over = (top, bot) => [0, 1, 2].map((i) => top[i] * top[3] + bot[i] * (1 - top[3])).concat(1);
  const uniform = /^linear-gradient\((rgba?\([^)]*\)|oklab\([^)]*\)|color\([^)]*\)), \1\)$/;
  const fails = [];
  const seen = new Set();
  /* `elementsFromPoint` skips anything with `pointer-events: none`, which is
     exactly how decorative grounds (a segmented control's capsule, a scrim)
     are written. Everything is made hit-testable for the length of the probe. */
  const probeStyle = document.createElement("style");
  probeStyle.textContent = "*{pointer-events:auto!important}";
  document.head.append(probeStyle);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const el = node.parentElement;
    if (!node.textContent.trim() || !el || seen.has(el)) continue;
    seen.add(el);
    const cs = getComputedStyle(el);
    if (cs.visibility !== "visible" || Number(cs.opacity) === 0) continue;
    if (el.closest("[aria-hidden='true'],.sr-only,script,style,noscript")) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight) continue;
    /* The ground is what is PAINTED under the text's centre, not the DOM
       ancestry: a segmented control's selected capsule is a sibling behind
       the label, and walking parents alone reads the track instead. */
    const stack = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const from = stack.indexOf(el);
    /* Not painted at its own centre: covered by a sheet, off screen, or
       under the dock. Nobody can read it, so there is nothing to measure. */
    if (from < 0) continue;
    const layers = [];
    let unknown = false;
    for (const a of stack.slice(from)) {
      if (/^(IMG|PICTURE|VIDEO|CANVAS|IFRAME)$/.test(a.tagName)) { unknown = true; break; }
      const s = getComputedStyle(a);
      if (s.backgroundImage !== "none") {
        const m = s.backgroundImage.match(uniform);
        if (!m) { unknown = true; break; }
        layers.push(parse(m[1]));
        if (layers.at(-1)[3] >= 1) break;
      }
      const bg = parse(s.backgroundColor);
      if (bg[3] > 0) { layers.push(bg); if (bg[3] >= 1) break; }
    }
    if (unknown) continue;
    let base = [255, 255, 255, 1];
    for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
    const fg = over(parse(cs.color), base);
    const [hi, lo] = [lum(fg), lum(base)].sort((x, y) => y - x);
    const ratio = (hi + 0.05) / (lo + 0.05);
    const size = parseFloat(cs.fontSize);
    const large = size >= 24 || (Number(cs.fontWeight) >= 700 && size >= 18.66);
    if (ratio < (large ? 3 : 4.5)) {
      fails.push(`${ratio.toFixed(2)}:1 "${node.textContent.trim().slice(0, 32)}" <${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 60)}">`);
    }
  }
  probeStyle.remove();
  return fails;
}

function edgeOffenders() {
  const vw = document.documentElement.clientWidth;
  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility !== "visible" || cs.position === "fixed") continue;
    if (el.closest("[aria-hidden='true'],[inert],.nf-skip-link")) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || (r.right <= vw + 1 && r.left >= -1)) continue;
    let contained = false;
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      if (/(hidden|clip|auto|scroll)/.test(getComputedStyle(p).overflowX)) { contained = true; break; }
    }
    if (!contained) out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)} ${Math.round(r.left)}..${Math.round(r.right)}`);
  }
  return out.slice(0, 5);
}

async function session(browser, who) {
  const email = who === "admin" ? process.env.QA_ADMIN_EMAIL : process.env.QA_MEMBER_EMAIL;
  const password = process.env.QA_PASSWORD;
  if (!email || !password) return null;
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

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(EXECUTABLE ? { executablePath: EXECUTABLE } : {});
let failedRoutes = 0;
const sessions = { member: await session(browser, "member"), admin: await session(browser, "admin"), none: undefined };
for (const theme of THEMES) {
  for (const [who, list] of [["member", MEMBER], ["none", PUBLIC], ["admin", ADMIN]]) {
    const routes = list.filter(([name]) => !ONLY || ONLY.includes(name));
    if (routes.length === 0) continue;
    if (who !== "none" && !sessions[who]) {
      console.log(`${theme}: skipping ${routes.length} ${who} route(s), no ${who} credentials in the environment`);
      continue;
    }
    const ctx = await browser.newContext({ ...PHONE, storageState: sessions[who] ?? undefined, colorScheme: theme });
    await ctx.addCookies([{ name: "nf_theme", value: theme, url: BASE }]);
    const page = await ctx.newPage();
    for (const [name, path] of routes) {
      await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 90_000 });
      await page.waitForTimeout(2000);
      const painted = await page.evaluate(() => document.documentElement.dataset.theme);
      const contrast = await page.evaluate(contrastProbe);
      const edges = await page.evaluate(edgeOffenders);
      await page.screenshot({ path: `${OUT}/${name}-${theme}.png` });
      const bad = painted !== theme || contrast.length > 0 || edges.length > 0;
      if (bad) failedRoutes += 1;
      console.log(`${bad ? "FAIL" : "ok  "} ${theme} ${name} painted=${painted} contrast=${contrast.length} edges=${edges.length}`);
      for (const line of [...contrast.slice(0, 8), ...edges]) console.log(`       ${line}`);
    }
    await ctx.close();
  }
}
await browser.close();
console.log(`\n${failedRoutes} route(s) with a failure. Screenshots in ${OUT}.`);
process.exit(Math.min(failedRoutes, 100));
