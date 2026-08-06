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
 * Run with the server already up:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/polish-overlays-copy-status.spec.mjs
 */

import { chromium } from "playwright-core";
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
    new RegExp(`\\.nf-badge--${state}\\s*\\{[^}]*var\\(--nf-status-${state}\\)`, "s").test(stylesheet),
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

const ROUTES = [
  "/", "/home", "/search", "/search?view=map", "/listing/lekki-palm-grove", "/saved",
  "/messages", "/notifications", "/profile", "/settings", "/wallet", "/bookings",
  "/rent", "/agents", "/agents/apply", "/help", "/contact",
  "/agent/dashboard", "/agent/bookings", "/agent/listings", "/admin", "/admin/support",
];

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
  const clipped = [];
  const images = [];
  for (const el of document.querySelectorAll("*")) {
    const cs = getComputedStyle(el);
    const cls = typeof el.className === "string" ? el.className : "";
    if (cs.textOverflow === "ellipsis" && cs.overflow !== "visible") {
      if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth) {
        if (!ALLOWED.some((a) => cls.includes(a))) {
          clipped.push(`${el.tagName.toLowerCase()} ${el.clientWidth}/${el.scrollWidth} "${(el.textContent || "").trim().slice(0, 44)}" .${cls.slice(0, 50)}`);
        }
      }
    }
    if (cs.webkitLineClamp && cs.webkitLineClamp !== "none") {
      /* One line-height of slack: a single-line `-webkit-box` reports a
         scrollHeight two pixels past its clientHeight from the descender
         alone, which is not a clamp. */
      const line = parseFloat(cs.lineHeight) || 20;
      if (el.scrollHeight > el.clientHeight + line * 0.5) {
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

try {
  for (const [width, label] of [[390, "390px"], [1280, "desktop"]]) {
    console.log(`\nCopy and images, ${label}`);
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      colorScheme: "dark",
    });
    await context.addInitScript(() => {
      try {
        window.localStorage.setItem("nf_theme", "dark");
      } catch {
        /* storage can be unavailable */
      }
    });
    const clipped = [];
    const images = [];
    for (const route of ROUTES) {
      const page = await context.newPage();
      try {
        await page.goto(BASE_URL + route, { waitUntil: "load", timeout: 45000 });
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

  console.log("\nThe filters drawer, for real");
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
    await page.goto(BASE_URL + "/search", { waitUntil: "load", timeout: 45000 });
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
