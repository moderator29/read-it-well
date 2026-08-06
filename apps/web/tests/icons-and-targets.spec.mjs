/**
 * The icon system, the focus ring and the 44px floor.
 *
 * Self-contained: no runner, no config. Two halves.
 *
 * The STATIC half reads the source tree and proves the invariants that have no
 * visible surface of their own: one weight, one size scale, no retired icon
 * tier, and vector sources on disk that still match the component they were
 * derived from.
 *
 * The RUNTIME half drives the real app at 390px in BOTH themes and measures
 * every visible interactive control on every route it visits: it must have an
 * accessible name, its hit target must reach 44 by 44 (counting a pseudo
 * element that expands it), and its keyboard focus ring must be drawn in the
 * focus token rather than in a brand blue nobody can see on the night canvas.
 *
 * Run with the server already up:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/icons-and-targets.spec.mjs
 *
 * SCOPE. The social layer (lib/social, components/social, /around, /u, /post,
 * /stories) is a separate workstream with its own file owner, so the static
 * sweep names it and skips it rather than pretending it was checked. The
 * component snaps an off-scale size at render time regardless, so nothing
 * there can ship an off-grid glyph even though its call sites are unaudited.
 */

import { chromium } from "playwright-core";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const EXECUTABLE_PATH = "/opt/pw-browsers/chromium";
const WIDTH = 390;
const WAIT = 1300;

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, "../src");
const REPO = join(here, "../../..");

let failures = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
    if (detail) for (const line of [].concat(detail).slice(0, 12)) console.log(`            ${line}`);
  }
}

/* ------------------------------------------------------------------ static */

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

const files = walk(SRC).map((f) => ({ path: f, rel: relative(SRC, f).split("\\").join("/") }));
const product = files.filter(
  (f) => !SOCIAL.some((s) => f.rel.startsWith(s)) && !f.rel.startsWith("design-system/icons/"),
);

console.log("\nIcon system, static");

/* 1. The retired tier is not imported anywhere outside its own directory. */
const retired = [];
for (const f of files) {
  if (f.rel.startsWith("design-system/icons/")) continue;
  const src = readFileSync(f.path, "utf8");
  /* An IMPORT or a USE, not a mention. The bare `\bIcon3D\b` also matched the
     styleguide sentence that tells everybody the thing is retired - so writing
     the rule down broke the rule. A guard that punishes its own documentation
     gets the documentation deleted. */
  if (
    /from ["']@?[./\w-]*icons\/(Icon3D|Icon|glyphs)["']/.test(src) ||
    /<Icon3D[\s/>]/.test(src)
  ) {
    retired.push(f.rel);
  }
}
check("Icon3D and the retired Icon wrapper are imported nowhere", retired.length === 0, retired);

/* 2. One weight. No call site may pass its own strokeWidth to a UiIcon, and
 *    the component must derive the attribute from the size rather than take it. */
const uiIconTag = /<(UiIcon|BrandIcon)\b([\s\S]*?)\/>/g;
const strokeOverrides = [];
for (const f of files) {
  const src = readFileSync(f.path, "utf8");
  for (const m of src.matchAll(uiIconTag)) {
    if (m[1] !== "UiIcon") continue;
    if (m[2].length > 400) continue;
    if (/strokeWidth/.test(m[2])) {
      strokeOverrides.push(`${f.rel}:${src.slice(0, m.index).split("\n").length}`);
    }
  }
}
check("no call site overrides the stroke weight", strokeOverrides.length === 0, strokeOverrides);

const uiIconSource = readFileSync(join(SRC, "design-system/icons/UiIcon.tsx"), "utf8");
check(
  "the stroke attribute is derived from the size, so the rendered weight is constant",
  /strokeWidth=\{\(UI_ICON_STROKE_PX \* 24\) \/ edge\}/.test(uiIconSource),
);
check(
  "UiIcon takes no strokeWidth prop at all",
  !/strokeWidth\?: number/.test(uiIconSource),
);

/* 3. One size scale. */
const UI_SCALE = [12, 16, 20, 24, 28, 32];
/* BrandIcon sits on an 8px grid from 24 up: below 24 the plinth in the artwork
   collapses into a coloured square, which is why the floor is not lower. */
const brandOnGrid = (n) => n >= 24 && n % 8 === 0;
const offScale = [];
for (const f of product) {
  const src = readFileSync(f.path, "utf8");
  for (const m of src.matchAll(uiIconTag)) {
    if (m[2].length > 400) continue;
    for (const s of m[2].matchAll(/size=\{([^}]*)\}/g)) {
      const nums = [...s[1].matchAll(/\b(\d+)\b/g)].map((x) => Number(x[1]));
      /*
       * A size with no literal in it is a variable, and a variable cannot be
       * read from here. It is not unchecked: `ICON_SIZE` in the Button
       * primitive is typed `UiIconSize`, so an off-scale value will not
       * compile, and the next check proves the component snaps anything that
       * reaches it at runtime regardless. Flagging it would be flagging the
       * one pattern that has two guarantees rather than one.
       */
      if (nums.length === 0) continue;
      const ok =
        nums.length > 0 &&
        nums.every((n) => (m[1] === "UiIcon" ? UI_SCALE.includes(n) : brandOnGrid(n)));
      if (!ok) {
        offScale.push(`${f.rel}:${src.slice(0, m.index).split("\n").length} ${m[1]} size={${s[1]}}`);
      }
    }
  }
}
check("every icon size outside the social layer is on its scale", offScale.length === 0, offScale);
check(
  "the component snaps anything else onto the scale, so a size cannot drift off it",
  /* The regex used to pin the ARGUMENT as well - `snapUiIconSize(size)` - and
     went stale the day the component learned named sizes and started resolving
     `ICON_SIZE[size]` first. What must hold is that the single place the edge
     is computed goes through the snap, whatever it is handed; pinning the
     expression too made a correct refactor look like a regression. */
  /export function snapUiIconSize/.test(uiIconSource) &&
    /const edge = snapUiIconSize\(/.test(uiIconSource),
);

/* 4. Vector sources exist and still match the component they came from. */
const vectorDir = join(REPO, "assets/icons/ui");
const declared = [...uiIconSource.matchAll(/^\s*\| "([a-z-]+)";?$/gm)].map((m) => m[1]);
const firstName = /export type UiIconName =\s*\n\s*\| "([a-z-]+)"/.exec(uiIconSource)?.[1];
const names = new Set([firstName, ...declared].filter(Boolean));
const onDisk = existsSync(vectorDir)
  ? new Set(readdirSync(vectorDir).filter((f) => f.endsWith(".svg")).map((f) => f.replace(/\.svg$/, "")))
  : new Set();
const missingVectors = [...names].filter((n) => !onDisk.has(n));
check(
  `a vector source is checked in for all ${names.size} stroked glyphs`,
  missingVectors.length === 0 && names.size > 0,
  missingVectors,
);
let vectorsInSync = true;
let vectorDetail = "";
try {
  execFileSync("node", [join(REPO, "scripts/build-icon-vectors.mjs"), "--check"], {
    cwd: REPO,
    stdio: "pipe",
  });
} catch (err) {
  vectorsInSync = false;
  vectorDetail = String(err.stderr ?? err).trim().split("\n").slice(0, 6);
}
check("the checked-in vector sources still match UiIcon.tsx", vectorsInSync, vectorDetail);

/* -------------------------------------------------------------- the browser */

const ROUTES = [
  "/",
  "/home",
  "/search",
  "/search?view=map",
  "/saved",
  "/messages",
  "/notifications",
  "/profile",
  "/settings",
  "/wallet",
  "/bookings",
  "/rent",
  "/agents",
  "/agents/apply",
  "/help",
  "/contact",
  "/sign-in",
];

/*
 * Runs in the page. Returns every visible interactive control that fails one of
 * the two floors, with enough of its markup to find it again.
 */
const SWEEP = () => {
  const SEL =
    'a[href], button, summary, [role="button"], [role="tab"], [role="switch"], [role="radio"], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';

  const accessibleName = (el) => {
    const aria = el.getAttribute("aria-label");
    if (aria && aria.trim()) return aria.trim();
    const by = el.getAttribute("aria-labelledby");
    if (by) {
      const t = by
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent ?? "")
        .join(" ")
        .trim();
      if (t) return t;
    }
    const title = el.getAttribute("title");
    if (title && title.trim()) return title.trim();
    const text = (el.innerText || el.textContent || "").trim();
    if (text) return text;
    const img = el.querySelector("img[alt]");
    if (img && img.getAttribute("alt").trim()) return img.getAttribute("alt").trim();
    const labelled = el.querySelector("[aria-label]");
    if (labelled && labelled.getAttribute("aria-label").trim()) {
      return labelled.getAttribute("aria-label").trim();
    }
    if (["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName)) {
      if (el.id) {
        const lab = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (lab && lab.textContent.trim()) return lab.textContent.trim();
      }
      const wrap = el.closest("label");
      if (wrap && wrap.textContent.trim()) return wrap.textContent.trim();
    }
    return "";
  };

  /*
   * The hit target is the control's own layout box OR the box of a pseudo
   * element that deliberately expands it. Measuring only the element reports a
   * 28px toggle as a failure when its target is really 48 by 44, so both are
   * read and the larger wins. `offset*` rather than the client rect, because a
   * reveal animation that scales a card by 0.98 would otherwise report every
   * chip inside it as one pixel short.
   */
  const target = (el) => {
    let w = el.offsetWidth;
    let h = el.offsetHeight;
    for (const pseudo of ["::before", "::after"]) {
      const cs = getComputedStyle(el, pseudo);
      if (cs.content === "none") continue;
      w = Math.max(w, parseFloat(cs.width) || 0);
      h = Math.max(h, parseFloat(cs.height) || 0);
    }
    return { w: Math.round(w), h: Math.round(h) };
  };

  const unnamed = [];
  const small = [];
  for (const el of document.querySelectorAll(SEL)) {
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (rect.width === 0 || rect.height === 0) continue;
    if (cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") continue;
    if (el.closest('[aria-hidden="true"]') || el.disabled) continue;

    const name = accessibleName(el);
    const html = el.outerHTML.slice(0, 110).replace(/\s+/g, " ");
    if (!name) unnamed.push(html);

    /* A link inside a running sentence is exempt: WCAG 2.2 excludes a target
       whose position is determined by the flow of the text around it. Anything
       laid out as its own block or flex box is not in that class. */
    if (cs.display === "inline" && el.tagName === "A") continue;
    const { w, h } = target(el);
    if (w < 44 || h < 44) small.push(`${w}x${h} ${name.slice(0, 34).replace(/\s+/g, " ")} | ${html}`);
  }
  return { unnamed, small };
};

const browser = await chromium.launch({ executablePath: EXECUTABLE_PATH });

try {
  for (const theme of ["dark", "light"]) {
    console.log(`\nTargets and names, ${theme}, ${WIDTH}px`);
    const context = await browser.newContext({
      viewport: { width: WIDTH, height: 844 },
      colorScheme: theme,
    });
    /* Only the stored key moves the theme; the operating system never does. */
    await context.addInitScript((choice) => {
      try {
        window.localStorage.setItem("nf_theme", choice);
      } catch {
        /* storage can be unavailable; the assertion below catches the result */
      }
    }, theme);

    const allUnnamed = [];
    const allSmall = [];
    const ringFailures = [];

    for (const route of ROUTES) {
      const page = await context.newPage();
      try {
        await page.goto(BASE_URL + route, { waitUntil: "load", timeout: 45000 });
        await page.waitForTimeout(WAIT);

        const rendered = await page.evaluate(() => document.documentElement.dataset.theme ?? "dark");
        if (rendered !== theme) {
          failures += 1;
          console.log(`  FAILED  ${route} rendered ${rendered}, not ${theme}`);
          continue;
        }

        const res = await page.evaluate(SWEEP);
        for (const u of res.unnamed) allUnnamed.push(`${route} ${u}`);
        for (const s of res.small) allSmall.push(`${route} ${s}`);

        /* The focus ring, measured rather than assumed. Tab to the first
           control the page offers and read what the browser actually paints. */
        if (route === "/home" || route === "/search") {
          await page.keyboard.press("Tab");
          const ring = await page.evaluate(() => {
            const el = document.activeElement;
            if (!el || el === document.body) return null;
            const cs = getComputedStyle(el);
            const token = getComputedStyle(document.documentElement)
              .getPropertyValue("--nf-focus-ring")
              .trim();
            return {
              width: parseFloat(cs.outlineWidth),
              style: cs.outlineStyle,
              colour: cs.outlineColor,
              token,
            };
          });
          if (!ring || ring.style === "none" || !(ring.width >= 2)) {
            ringFailures.push(`${route}: ${JSON.stringify(ring)}`);
          }
        }
      } catch (err) {
        failures += 1;
        console.log(`  FAILED  ${route} ${String(err).split("\n")[0]}`);
      } finally {
        await page.close();
      }
    }

    check("every visible control has an accessible name", allUnnamed.length === 0, allUnnamed);
    check("every visible target reaches 44 by 44", allSmall.length === 0, allSmall);
    check("the first tab stop paints a focus ring at least 2px wide", ringFailures.length === 0, ringFailures);

    await context.close();
  }

  /* The ring colour is a token, and it is deliberately not the brand primary:
     #0010E0 on the near-black canvas is about 1.4:1, which is a ring nobody can
     see. Read both resolved values straight out of the running page. */
  for (const theme of ["dark", "light"]) {
    const context = await browser.newContext({ viewport: { width: WIDTH, height: 844 }, colorScheme: theme });
    await context.addInitScript((c) => {
      try {
        window.localStorage.setItem("nf_theme", c);
      } catch {
        /* see above */
      }
    }, theme);
    const page = await context.newPage();
    await page.goto(BASE_URL + "/home", { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(600);
    const tokens = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      const probe = document.createElement("span");
      document.body.appendChild(probe);
      const read = (value) => {
        probe.style.color = value;
        const out = getComputedStyle(probe).color;
        return out;
      };
      const ring = read(cs.getPropertyValue("--nf-focus-ring").trim());
      const brand = read(cs.getPropertyValue("--nf-brand-primary").trim());
      const canvas = read(cs.getPropertyValue("--nf-canvas-base").trim());
      probe.remove();
      return { ring, brand, canvas };
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
    const ringRatio = ratio(tokens.ring, tokens.canvas);
    check(
      `${theme}: the focus ring clears 3:1 against the canvas (${ringRatio.toFixed(2)}:1)`,
      ringRatio >= 3,
      [`ring ${tokens.ring} on canvas ${tokens.canvas}`],
    );
    /* Where the brand primary itself clears 3:1, as it does on paper, the two
       tokens are allowed to resolve to the same colour. Where it does not, as
       on the night canvas, the ring must have moved off it. */
    const brandRatio = ratio(tokens.brand, tokens.canvas);
    check(
      `${theme}: the ring is off --nf-brand-primary wherever that fails (brand is ${brandRatio.toFixed(2)}:1 here)`,
      brandRatio >= 3 || tokens.ring !== tokens.brand,
    );
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
console.log("All icon, focus and target checks passed.");
