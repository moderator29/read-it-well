/**
 * Overlays, truncation, image boxes, status colour and gradient contrast.
 *
 * Self-contained: no runner, no config. This is the proof behind items 6 to 10
 * of docs/POLISH_PASS.md.
 *
 *  6. Every overlay closes on Escape, traps Tab and locks the page behind it,
 *     through the ONE shared implementation rather than sixteen hand-rolled
 *     copies of three quarters of it.
 *  7. No sentence is truncated. Measured, not grepped: the browser reports
 *     which elements are ACTUALLY clipping right now, at 390px and at 1280px.
 *  8. Every image reserves its box before it loads.
 *  9. The four status colours resolve to four distinct tokens and mean one
 *     thing each.
 * 10. Gradient text clears WCAG AA for large text in both themes.
 *
 * WHICH PAGES. Since 23 September every product route answers a signed-out
 * visitor with the sign-in wall (asserted for each below). Items 7 and 8 are
 * swept on the public pages directly and on each product screen's preview-
 * harness twin (the real components inside the real AppShell with fixture
 * rows, which carry real text and real images to clip and to reserve), and
 * signed in as the QA member on the real routes (SKIP without QA_MEMBER_EMAIL
 * / QA_MEMBER_PASSWORD). Item 6's trap is driven on the real FilterDrawer
 * behind its real opener at `/preview/f4/sheets`. `/wallet` and `/agents/*`
 * are redirects now and are not swept as pages of their own.
 *
 * Run with the server already up:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/polish-overlays-copy-status.spec.mjs
 */

import { chromium } from "playwright-core";
import { expectSignInWall, qaContext, signInAsQa, skip } from "./_gate.mjs";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const EXECUTABLE_PATH = "/opt/pw-browsers/chromium";
const WAIT = 1200;

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, "../src");

let failures = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
    if (detail) for (const line of [].concat(detail).slice(0, 14)) console.log(`            ${line}`);
  }
}

const SOCIAL = [
  "lib/social/",
  "components/social/",
  "app/(app)/around/",
  "app/(app)/u/",
  "app/(app)/post/",
  "app/(app)/stories/",
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}
const files = walk(SRC)
  .map((f) => ({ path: f, rel: relative(SRC, f).split("\\").join("/") }))
  .filter((f) => !SOCIAL.some((s) => f.rel.startsWith(s)));

/* ---------------------------------------------------- 6. overlays, static */

console.log("\nOverlays");

const dialogs = [];
const notUsingHook = [];
const handRolled = [];
for (const f of files) {
  if (f.rel === "lib/ui/use-overlay.ts") continue;
  /* A DOM test that queries role="dialog" is not an overlay. */
  if (/\.test\.tsx?$/.test(f.rel)) continue;
  const src = readFileSync(f.path, "utf8");
  if (!/aria-modal|role="dialog"/.test(src)) continue;
  dialogs.push(f.rel);
  if (!/useOverlay/.test(src)) notUsingHook.push(f.rel);
  /* The three things every one of them used to write out by hand. Any one of
     them still present means a second, disagreeing implementation is back. */
  if (/document\.body\.style\.overflow/.test(src)) handRolled.push(`${f.rel} (own scroll lock)`);
  if (/key === "Escape"/.test(src)) handRolled.push(`${f.rel} (own Escape handler)`);
}
check(`all ${dialogs.length} overlays outside the social layer use useOverlay`, notUsingHook.length === 0, notUsingHook);
check("no overlay hand-rolls its own scroll lock or Escape handler", handRolled.length === 0, handRolled);

const hook = readFileSync(join(SRC, "lib/ui/use-overlay.ts"), "utf8");
check("the shared hook still does all four: Escape, Tab, scroll lock, focus return", [
  /event\.key === "Escape"/,
  /event\.key !== "Tab"/,
  /document\.body\.style\.overflow = "hidden"/,
  /opener\?\.focus/,
].every((re) => re.test(hook)));

/* -------------------------------------------- 9. status colours, static */

console.log("\nStatus colours");

/* globals.css is now nothing but an ordered list of imports, so read it and
   everything it pulls in. Reading the one file was a check on where a rule
   lived rather than on whether it exists, and moving the badge rules into
   chips.css broke it without changing a single declaration. */
const stylesheet = (() => {
  const seen = new Set();
  const read = (rel) => {
    if (seen.has(rel)) return "";
    seen.add(rel);
    const text = readFileSync(join(SRC, "app", rel), "utf8");
    const dir = rel.includes("/") ? `${rel.slice(0, rel.lastIndexOf("/"))}/` : "";
    let out = text;
    for (const m of text.matchAll(/@import\s+"\.\/([^"]+)"/g)) out += read(`${dir}${m[1]}`);
    return out;
  };
  return read("globals.css");
})();
for (const state of ["pending", "approved", "rejected", "verified"]) {
  check(
    `.nf-badge--${state} reads --nf-status-${state}`,
    /* The rule may be one selector in a group (`.nf-badge--pending,
       .nf-badge--warning, ... {`), as chips.css writes them now. */
    new RegExp(`\\.nf-badge--${state}\\s*[,{][^}]*var\\(--nf-status-${state}\\)`, "s").test(stylesheet),
  );
}
/* A status must never be written as a hand-made colour pair again. Rejected
   was the one that had been, in the agent's listings workspace. */
const inlineStatus = [];
for (const f of files) {
  const src = readFileSync(f.path, "utf8");
  /* A badge, with a hand-written state colour inside the same tag. An inline
     notice tint elsewhere in the file is not a status and is left alone. */
  for (const m of src.matchAll(/<[a-zA-Z][^>]{0,600}?nf-badge[^>]{0,600}?>/gs)) {
    if (/var\(--nf-state-(success|warning|error)-surface\)/.test(m[0])) {
      inlineStatus.push(`${f.rel}:${src.slice(0, m.index).split("\n").length}`);
    }
  }
}
check("no surface hand-writes a status colour pair inline", inlineStatus.length === 0, inlineStatus);

/* ------------------------------------------------------------- the browser */

/*
 * Forty-three routes, not the twenty-two this started with.
 *
 * The image check below is item 8, and an image with no reserved box shifts the
 * page under a thumb at the moment it loads, which is a defect that only ever
 * appears on the route carrying that image. Checking a third of the platform
 * for it proves a third of the platform. Every route a signed-out visitor or a
 * signed-in reader can reach is swept now, at 390 and at 1280.
 */
const PUBLIC_ROUTES = [
  "/", "/help", "/contact", "/about", "/careers", "/safety", "/standards", "/cancellations",
  "/docs", "/privacy", "/terms", "/sign-in", "/sign-up", "/sign-up/email", "/sign-up/verify",
];

/** Each gated product route with its preview-harness twin (null: none). */
const PRODUCT = [
  ["/home", "/preview/session-b/sweep-home/home"],
  ["/search", "/preview/session-b/sweep-home/search"],
  ["/search?view=map", null],
  ["/listing/lekki-palm-grove", "/preview/f3/listing"],
  ["/saved", "/preview/f3/saved"],
  ["/messages", "/preview/f5/inbox"],
  ["/notifications", "/preview/f4/notifications"],
  ["/profile", "/preview/session-b/profile"],
  ["/settings", "/preview/session-b/sweep-settings?v=hub"],
  ["/settings/interests", "/preview/session-b/sweep-settings?v=interests"],
  ["/settings/place", "/preview/session-b/sweep-settings?v=place"],
  ["/bookings", "/preview/f3/bookings"],
  ["/search?market=rent", null],
  ["/assistant", "/preview/f1/assistant"],
  ["/around", "/preview/session-b/feed"],
  ["/u", null],
  ["/stories", null],
  ["/styleguide", null],
  ["/agent/dashboard", "/preview/f5/agent-dashboard"],
  ["/agent/bookings", "/preview/f5/agent-bookings"],
  ["/agent/listings", "/preview/f5/agent-listings"],
  ["/agent/earnings", "/preview/f5/agent-earnings"],
  ["/agent/reviews", "/preview/f5/agent-reviews"],
  ["/admin", "/preview/f5/admin-overview"],
  ["/admin/support", null],
];
const ROUTES = [...PUBLIC_ROUTES, ...PRODUCT.map(([, twin]) => twin).filter(Boolean)];

/*
 * Text that is clipping RIGHT NOW, and images with no reserved box.
 *
 * ALLOWED is the justification the item asks for, and it is deliberately short.
 * An excerpt of somebody else's message is an excerpt by design: an inbox row
 * cannot show a whole conversation, and clamping it is what makes the list a
 * list. Everything else on this platform that clips is a defect, because it is
 * copy WE wrote, and copy we wrote should fit the box we put it in.
 */
const SWEEP = () => {
  const ALLOWED = [
    /* The last message in a conversation, in the inbox list. */
    "leading-relaxed",
  ];
  /* The same excerpt as the inbox row draws it now (Inbox.tsx: the last
     message is the row's `nf-body-sm ... truncate` line). */
  const isInboxExcerpt = (el, cls) => Boolean(el.closest('[data-testid="inbox-row"]')) && cls.includes("nf-body-sm");
  /* The whole text is one hover or long-press away: the element, or the
     link or button it sits in, carries it as its title. That is the "proper
     ellipsis with the full text available" the polish pass asks for. */
  const titled = (el) => {
    const text = (el.textContent || "").trim().replace(/\s+/g, " ");
    const holder = el.closest("[title]");
    return Boolean(holder && text && holder.getAttribute("title").includes(text.replace(/…$/, "")));
  };
  /* A clamp inside the region a collapsed disclosure owns ("Read more"). */
  const expandable = (el) => {
    const region = el.closest("[id]");
    return Boolean(region && document.querySelector(`[aria-controls="${CSS.escape(region.id)}"][aria-expanded="false"]`));
  };
  const clipped = [];
  const images = [];
  for (const el of document.querySelectorAll("*")) {
    const cs = getComputedStyle(el);
    const cls = typeof el.className === "string" ? el.className : "";
    if (cs.textOverflow === "ellipsis" && cs.overflow !== "visible") {
      if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth) {
        if (!ALLOWED.some((a) => cls.includes(a)) && !isInboxExcerpt(el, cls) && !titled(el)) {
          clipped.push(`${el.tagName.toLowerCase()} ${el.clientWidth}/${el.scrollWidth} "${(el.textContent || "").trim().slice(0, 44)}" .${cls.slice(0, 50)}`);
        }
      }
    }
    if (cs.webkitLineClamp && cs.webkitLineClamp !== "none") {
      /* One line-height of slack: a single-line `-webkit-box` reports a
         scrollHeight two pixels past its clientHeight from the descender
         alone, which is not a clamp. */
      const line = parseFloat(cs.lineHeight) || 20;
      if (el.scrollHeight > el.clientHeight + line * 0.5 && !expandable(el) && !titled(el)) {
        clipped.push(`clamp-${cs.webkitLineClamp} "${(el.textContent || "").trim().slice(0, 44)}" .${cls.slice(0, 50)}`);
      }
    }
  }
  for (const img of document.querySelectorAll("img")) {
    /* Leaflet lays its own tiles out absolutely inside a fixed-height map, so
       they cannot shift anything. Everything else is ours. */
    if (img.closest(".leaflet-container")) continue;
    const cs = getComputedStyle(img);
    const parent = img.parentElement;
    const pcs = parent ? getComputedStyle(parent) : null;
    const reserved =
      cs.aspectRatio !== "auto" ||
      (img.getAttribute("width") && img.getAttribute("height")) ||
      (pcs && pcs.aspectRatio !== "auto") ||
      (pcs && parseFloat(pcs.height) > 0 && cs.position === "absolute");
    if (!reserved) {
      images.push(`${(img.currentSrc || img.src || "?").slice(-46)} .${(typeof img.className === "string" ? img.className : "").slice(0, 50)}`);
    }
  }
  return { clipped, images };
};

const browser = await chromium.launch({ executablePath: EXECUTABLE_PATH });

console.log("\nSigned out, every product route is behind the wall");
for (const [route] of PRODUCT) await expectSignInWall(check, route, BASE_URL);

console.log("\nThe QA session, for the real routes");
const qaState = await signInAsQa(browser, { base: BASE_URL });
const passes = [["public pages and harness twins", ROUTES, null]];
if (qaState) passes.push(["the real routes, signed in", PRODUCT.map(([route]) => route), qaState]);

try {
  for (const [which, routes, state] of passes)
  for (const [width, label] of [[390, "390px"], [1280, "desktop"]]) {
    console.log(`\nCopy and images, ${label}: ${which}`);
    const options = { viewport: { width, height: 900 }, colorScheme: "dark" };
    const context = state ? await qaContext(browser, state, options) : await browser.newContext(options);
    await context.addInitScript(() => {
      try {
        window.localStorage.setItem("nf_theme", "dark");
      } catch {
        /* storage can be unavailable */
      }
    });
    const clipped = [];
    const images = [];
    for (const route of routes) {
      const page = await context.newPage();
      try {
        const response = await page.goto(BASE_URL + route, { waitUntil: "load", timeout: 45000 });
        if (route.startsWith("/preview/") && response?.status() === 404) {
          skip(`${route}: the preview harness is closed on this server (VALLO_PREVIEW_HARNESS=1)`);
          continue;
        }
        await page.waitForTimeout(WAIT);
        const res = await page.evaluate(SWEEP);
        for (const c of res.clipped) clipped.push(`${route} ${c}`);
        for (const i of res.images) images.push(`${route} ${i}`);
      } catch (err) {
        failures += 1;
        console.log(`  FAILED  ${route} ${String(err).split("\n")[0]}`);
      } finally {
        await page.close();
      }
    }
    check("no written copy is clipped", clipped.length === 0, clipped);
    check("every image reserves its box", images.length === 0, images);
    await context.close();
  }

  /* ------------------------------------------- 6. the trap, in the browser */

  console.log("\nThe filters drawer, for real (the real FilterDrawer at /preview/f4/sheets)");
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });
    await context.addInitScript(() => {
      try {
        window.localStorage.setItem("nf_theme", "dark");
      } catch {
        /* storage can be unavailable */
      }
    });
    const page = await context.newPage();
    await page.goto(BASE_URL + "/preview/f4/sheets", { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(WAIT);
    await page.locator('[data-testid="filters-open"]').click();
    await page.waitForTimeout(400);

    const locked = await page.evaluate(() => getComputedStyle(document.body).overflow);
    check("the page behind the drawer cannot scroll", locked === "hidden", [`body overflow: ${locked}`]);

    /* Tab all the way round. Focus must never leave the drawer. */
    let escaped = null;
    for (let i = 0; i < 60; i += 1) {
      await page.keyboard.press("Tab");
      const inside = await page.evaluate(() => {
        const drawer = document.querySelector('[data-testid="filters-drawer"]');
        const active = document.activeElement;
        return Boolean(drawer && active && drawer.contains(active));
      });
      if (!inside) {
        escaped = i;
        break;
      }
    }
    check("60 presses of Tab never leave the drawer", escaped === null, [`focus left on press ${escaped}`]);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(350);
    const closed = await page.evaluate(() => ({
      gone: !document.querySelector('[data-testid="filters-drawer"]'),
      overflow: getComputedStyle(document.body).overflow,
      focus: document.activeElement?.getAttribute("data-testid") ?? document.activeElement?.tagName,
    }));
    check("Escape closes it", closed.gone, [JSON.stringify(closed)]);
    check("the page scrolls again", closed.overflow !== "hidden", [`body overflow: ${closed.overflow}`]);
    check("focus lands back on the control that opened it", closed.focus === "filters-open", [`focus: ${closed.focus}`]);
    await context.close();
  }

  /* ------------------------- 9 and 10. colour, measured in the running page */

  for (const theme of ["dark", "light"]) {
    console.log(`\nColour, ${theme}`);
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: theme });
    await context.addInitScript((c) => {
      try {
        window.localStorage.setItem("nf_theme", c);
      } catch {
        /* storage can be unavailable */
      }
    }, theme);
    const page = await context.newPage();
    await page.goto(BASE_URL + "/", { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(800);

    const rendered = await page.evaluate(() => document.documentElement.dataset.theme ?? "dark");
    check(`the page really rendered ${theme}`, rendered === theme, [`rendered ${rendered}`]);

    const read = await page.evaluate(() => {
      const probe = document.createElement("span");
      document.body.appendChild(probe);
      const resolve = (value) => {
        probe.style.color = value;
        return getComputedStyle(probe).color;
      };
      const root = getComputedStyle(document.documentElement);
      const token = (n) => resolve(root.getPropertyValue(n).trim());
      const gradient = root.getPropertyValue("--nf-gradient-text").trim();
      const stops = [...gradient.matchAll(/#[0-9a-fA-F]{6}/g)].map((m) => resolve(m[0]));
      /* The canvas is what sits behind the headline; the deepest surface the
         gradient is ever set on is the one to measure against. */
      const canvas = token("--nf-canvas-base");
      /* Read everything BEFORE the probe leaves the document: a detached
         element has no computed style, so every token after the removal came
         back as an empty string and every ratio as NaN. */
      const status = {
        pending: token("--nf-status-pending"),
        approved: token("--nf-status-approved"),
        rejected: token("--nf-status-rejected"),
        verified: token("--nf-status-verified"),
      };
      probe.remove();
      return { canvas, stops, status };
    });

    const rgb = (s) => (s.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    const lum = (c) => {
      const [r, g, b] = rgb(c).map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a, b) => {
      const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
      return (x + 0.05) / (y + 0.05);
    };

    const worst = Math.min(...read.stops.map((s) => ratio(s, read.canvas)));
    check(
      `gradient text clears 3:1 at every stop (worst ${worst.toFixed(2)}:1)`,
      read.stops.length >= 2 && worst >= 3,
      [`stops ${read.stops.join(" ")} on ${read.canvas}`],
    );

    const values = Object.values(read.status);
    check(
      "the four status colours are four different colours",
      new Set(values).size === 4,
      [JSON.stringify(read.status)],
    );
    for (const [name, value] of Object.entries(read.status)) {
      const r = ratio(value, read.canvas);
      check(`status ${name} clears 3:1 as badge text (${r.toFixed(2)}:1)`, r >= 3, [`${value} on ${read.canvas}`]);
    }
    await context.close();
  }
} finally {
  await browser.close();
}

console.log("");
if (failures > 0) {
  console.log(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log("All overlay, copy, image, status and contrast checks passed.");
