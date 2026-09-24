/*
 * THE ORPHANS SWEEP: shoot and measure every route and state (ledger 13, orphans).
 *
 *   node apps/web/scripts/design/session-b-shots/sweep-orphans.mjs <base> <phase> [only]
 *
 * Two lists. The fixture harness (`/preview/session-b/sweep-orphans?v=`) is
 * shot signed out; the live routes are shot signed in as the QA member, whose
 * credentials come from the environment only (QA_MEMBER_EMAIL /
 * QA_MEMBER_PASSWORD) and are never written anywhere. READ ONLY: the script
 * opens pages and, for one state, a form; it never submits anything.
 *
 * Every page, at 390 (2x) and 1440 (1x), dark, reduced motion, is measured in
 * the browser the way the independent audit measured it (audit-sweep
 * shoot.mjs.txt): layout wider than the viewport, text under 11px, text
 * controls at or over 0.35 radius to short side, controls under 44px tall,
 * unlit primaries, flat selected states, legacy material classes still in the
 * markup, and boxes on a corner other than the container's.
 * Shots go to docs/design/proofs/session-b/sweep-orphans/<phase>/.
 */
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://127.0.0.1:3391";
const PHASE = process.argv[3] ?? "before";
const ONLY = process.argv[4] ? new RegExp(process.argv[4]) : null;
const OUT = `docs/design/proofs/session-b/sweep-orphans/${PHASE}`;
mkdirSync(OUT, { recursive: true });

const H = "/preview/session-b/sweep-orphans?v=";
const HARNESS = [
  ["h-place", `${H}place`],
  ["h-place-apply", `${H}place`, "button:has-text('Look after Yaba')"],
  ["h-place-new", `${H}place-new`],
  ["h-place-new-out", `${H}place-new&s=out`],
  ["h-places", `${H}places`],
  ["h-bookings", `${H}bookings`],
  ["h-booking", `${H}booking`],
  ["h-booking-cancel", `${H}booking-cancel`],
  ["h-review", `${H}review`],
  ["h-reviewed", `${H}reviewed`],
  ["h-kyc", `${H}kyc`],
  ["h-kyc-rejected", `${H}kyc-status&s=rejected`],
  ["h-kyc-pending", `${H}kyc-status&s=pending`],
  ["h-kyc-approved", `${H}kyc-status&s=approved`],
  ["h-rent-pay", `${H}rent-pay`],
  ["h-rent-pay-wallet", `${H}rent-pay&s=wallet`],
  ["h-saved", `${H}saved`],
  ["h-saved-searches", `${H}saved-searches`],
  ["h-post", `${H}post`],
  ["h-inspection-rows", `${H}inspection-rows`],
  /* Added with SW-O2 (the fix worker): the district tabs and the place picker. */
  ["h-district", `${H}district`],
  ["h-district-picked", `${H}district`, "button[role=tab]:has-text('Stories')"],
  ["h-picker", `${H}picker`],
  ["h-picker-states", `${H}picker&s=none`],
  ...[
    "place", "manage", "place-new", "places", "bookings", "review", "kyc",
    "rent", "saved", "saved-searches", "post", "story-new", "story", "inspections",
  ].map((k) => [`h-loading-${k}`, `${H}loading-${k}`]),
  ["h-setup-agent", "/preview/b1b/agent"],
  ["h-setup-firm", "/preview/b1b/firm"],
  ["h-setup-owner", "/preview/b1b/owner"],
];

/* The live routes, signed in as the QA member. Ids that do not resolve for
   this account draw the route's own not-found or missing state. */
const MISSING = "00000000-0000-4000-8000-000000000000";
const LIVE = [
  ["l-around-slug", "/around/yaba-unilag"],
  ["l-around-manage", "/around/manage"],
  ["l-around-new", "/around/new"],
  ["l-around-settings", "/around/settings"],
  ["l-bookings", "/bookings"],
  ["l-booking-missing", `/bookings/${MISSING}`],
  ["l-review-missing", `/bookings/${MISSING}/review`],
  ["l-verification", "/verification"],
  ["l-rent-pay-missing", `/rent/pay/${MISSING}`],
  ["l-saved", "/saved"],
  ["l-saved-searches", "/saved/searches"],
  ["l-post", "/post/07de48f8-6fdf-4983-b2af-b1eaa990f8a8"],
  ["l-story-missing", `/stories/${MISSING}`],
  ["l-story-new", "/stories/new"],
  ["l-application", "/profile/application"],
  ["l-setup-role", "/profile/setup/professional"],
  ["l-setup-agent", "/profile/setup/agent"],
  ["l-setup-firm", "/profile/setup/firm"],
  ["l-setup-owner", "/profile/setup/owner"],
];

const measure = () => {
  const out = { overflow: 0, small: [], capsules: [], short: [], primaries: [], flatSelected: [], legacy: [], oddContainers: [] };
  const de = document.documentElement;
  out.overflow = Math.max(de.scrollWidth, document.body.scrollWidth) - window.innerWidth;
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return null;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) return null;
    return r;
  };
  const cls = (el) => (el.tagName.toLowerCase() + "." + (typeof el.className === "string" ? el.className : "").trim().split(/\s+/).slice(0, 4).join(".")).slice(0, 90);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const n = walker.currentNode;
    const t = n.textContent.trim();
    if (!t || !n.parentElement) continue;
    const p = n.parentElement;
    if (seen.has(p)) continue;
    seen.add(p);
    if (p.closest("script,style,noscript,[aria-hidden='true'] svg,.sr-only,.nf-tabbar,.nf-app-header,nav[aria-label='Primary']")) continue;
    if (!vis(p)) continue;
    const fs = parseFloat(getComputedStyle(p).fontSize);
    if (fs < 11) out.small.push({ t: t.slice(0, 30), fs: +fs.toFixed(1), el: cls(p) });
  }
  const main = document.querySelector("main") ?? document.body;
  const ctrlSel = "button,a,[role=button],[role=tab],input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=hidden]):not([type=file]),select,textarea,[class*=chip],[class*=badge],[class*=pill],[class*=seg]";
  for (const el of main.querySelectorAll(ctrlSel)) {
    const r = vis(el);
    if (!r) continue;
    /* The shared app header (chrome group) and its round avatar are not a
       route's own controls. */
    if (el.closest(".nf-app-header")) continue;
    const isField = /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName);
    const txt = isField ? "field" : (el.innerText || "").trim();
    if (!txt) continue;
    const cs = getComputedStyle(el);
    const shortSide = Math.min(r.width, r.height);
    const rad = (v) => (v.endsWith("%") ? (parseFloat(v) / 100) * shortSide : parseFloat(v) || 0);
    const radius = Math.max(rad(cs.borderTopLeftRadius), rad(cs.borderTopRightRadius), rad(cs.borderBottomLeftRadius), rad(cs.borderBottomRightRadius));
    const drawn = cs.backgroundColor !== "rgba(0, 0, 0, 0)" || cs.backgroundImage !== "none" || parseFloat(cs.borderTopWidth) > 0 || cs.boxShadow !== "none";
    if (drawn && radius > 0) {
      const ratio = Math.min(radius, shortSide / 2) / shortSide;
      if (ratio >= 0.35) out.capsules.push({ t: txt.slice(0, 24), ratio: +ratio.toFixed(2), w: Math.round(r.width), h: Math.round(r.height), el: cls(el) });
    }
    /* A drawn button or field under 44px tall. Inline text links and status
       badges are not tap targets of their own and are left out. */
    const isBadge = /badge|pill|status/.test(typeof el.className === "string" ? el.className : "");
    if (drawn && !isBadge && /^(BUTTON|INPUT|SELECT|A)$/.test(el.tagName) && r.height < 43.5) {
      out.short.push({ t: txt.slice(0, 24), h: Math.round(r.height), el: cls(el) });
    }
  }
  for (const el of main.querySelectorAll(".nf-btn--primary")) {
    const r = vis(el);
    if (!r) continue;
    const cs = getComputedStyle(el);
    const lit = cs.backgroundImage.includes("gradient");
    out.primaries.push({ t: (el.innerText || "").trim().slice(0, 24), lit, grey: !lit || Number(cs.opacity) < 0.75 });
  }
  const selSel = "[aria-selected=true],[aria-pressed=true],[aria-current=true],[aria-current=step],[class*='--on'],[class*='--active'],[role=radio][aria-checked=true]";
  for (const el of main.querySelectorAll(selSel)) {
    const r = vis(el);
    if (!r) continue;
    const cs = getComputedStyle(el);
    const bgc = cs.backgroundColor;
    const flat = cs.backgroundImage === "none" && bgc !== "rgba(0, 0, 0, 0)" && bgc !== "transparent";
    if (flat) out.flatSelected.push({ t: (el.innerText || "").trim().slice(0, 24), bg: bgc, el: cls(el) });
  }
  for (const el of main.querySelectorAll(".nf-card:not(.nf-panel),.nf-glass--card,.nf-glass--tile,.nf-social-card,.nf-glyph-tile")) {
    if (!vis(el)) continue;
    out.legacy.push(cls(el));
  }
  for (const el of main.querySelectorAll("*")) {
    if (/^(IMG|VIDEO|SVG|PATH|CANVAS|PICTURE|INPUT|SELECT|TEXTAREA|BUTTON|A|LABEL)$/i.test(el.tagName)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 120 || r.height < 48) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const radius = parseFloat(cs.borderTopLeftRadius) || 0;
    if (radius < 12 || radius > 40) continue;
    const hasBox = (cs.backgroundColor !== "rgba(0, 0, 0, 0)" || cs.backgroundImage !== "none") && (parseFloat(cs.borderTopWidth) > 0 || cs.boxShadow !== "none");
    if (!hasBox) continue;
    const c = typeof el.className === "string" ? el.className : "";
    if (/nf-panel|nf-plate|nf-btn|nf-field|avatar|nf-sheet|nf-tabbar|nf-skeleton/.test(c)) continue;
    out.oddContainers.push({ r: radius, w: Math.round(r.width), h: Math.round(r.height), el: cls(el) });
  }
  out.smallCount = out.small.length;
  out.small = out.small.slice(0, 10);
  out.oddContainers = out.oddContainers.slice(0, 12);
  out.legacyCount = out.legacy.length;
  out.legacy = [...new Set(out.legacy)].slice(0, 8);
  return out;
};

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function signedInState() {
  const email = process.env.QA_MEMBER_EMAIL;
  const password = process.env.QA_MEMBER_PASSWORD;
  if (!email || !password) return null;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addCookies([{ name: "vallo_first_run", value: "seen", url: BASE }]);
  const page = await ctx.newPage();
  const fill = async (sel, value) => {
    for (let i = 0; i < 40; i++) {
      await page.fill(sel, value);
      if ((await page.inputValue(sel)) === value) return;
      await page.waitForTimeout(250);
    }
  };
  await page.goto(`${BASE}/sign-in?next=${encodeURIComponent("/profile")}`, { waitUntil: "domcontentloaded" });
  await fill("#auth-email", email);
  await page.click("button:has-text('Continue')");
  await page.waitForURL(/\/sign-in\/email/, { timeout: 20000 });
  await fill("#password", password);
  await page.click("button[type=submit]:has-text('Sign in')");
  await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 40000 });
  const state = await ctx.storageState();
  await ctx.close();
  return state;
}

const results = {};
async function shoot(list, storageState) {
  for (const [name, route, click] of list) {
    if (ONLY && !ONLY.test(name)) continue;
    results[name] = { route };
    for (const w of [390, 1440]) {
      const ctx = await browser.newContext({
        viewport: { width: w, height: w === 390 ? 844 : 900 },
        deviceScaleFactor: w === 390 ? 2 : 1,
        colorScheme: "dark",
        reducedMotion: "reduce",
        ...(storageState ? { storageState } : {}),
      });
      await ctx.addCookies([{ name: "vallo_first_run", value: "seen", url: BASE }]);
      const page = await ctx.newPage();
      let status = 0;
      try {
        const resp = await page.goto(BASE + route, { waitUntil: "load", timeout: 45000 });
        status = resp?.status() ?? 0;
      } catch {
        status = -1;
      }
      await page.waitForTimeout(1500);
      if (click) {
        await page.click(click, { timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(600);
      }
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 400) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 40));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(300);
      let m;
      try {
        m = await page.evaluate(measure);
      } catch (e) {
        m = { error: String(e) };
      }
      m.status = status;
      m.finalUrl = page.url().replace(BASE, "");
      await page.screenshot({ path: `${OUT}/${name}-${w}.jpg`, fullPage: true, type: "jpeg", quality: 70 }).catch(() => {});
      results[name][w] = m;
      await ctx.close();
      console.log(
        `${status} ${w} ${name} -> ${m.finalUrl} ovf=${m.overflow} small=${m.smallCount} caps=${m.capsules?.length} short=${m.short?.length} flatSel=${m.flatSelected?.length} legacy=${m.legacyCount} odd=${m.oddContainers?.length} grey=${m.primaries?.filter((p) => p.grey).length}`,
      );
    }
  }
}

console.log(`orphans sweep, ${PHASE}, ${new Date().toISOString()}, ${BASE}`);
await shoot(HARNESS, null);
const state = await signedInState().catch((e) => {
  console.log(`sign-in failed: ${String(e).slice(0, 120)}`);
  return null;
});
if (state) await shoot(LIVE, state);
else console.log("WAITING ON QA CREDENTIALS or sign-in failed: live routes not shot");
writeFileSync(`${OUT}/measure.json`, JSON.stringify(results, null, 1));
await browser.close();
