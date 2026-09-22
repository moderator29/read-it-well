/*
 * CONTRAST FROM THE PIXELS THAT WERE ACTUALLY PAINTED, ACROSS THE WHOLE
 * PREVIEW HARNESS, IN BOTH THEMES.
 *
 * Two earlier probes computed it from the cascade and both were wrong: one took
 * a 15%-alpha `color-mix` surface as if it were opaque, and one walked past a
 * gradient because it only ever read `background-color`. The second was caught
 * by a sanity case reading 1.09 for white on a brand button, which cannot
 * happen. Nothing derived from `getComputedStyle` is trusted here.
 *
 * WHAT CHANGED ON 22 SEPTEMBER, AND WHY. The previous version of this file
 * measured FOUR named elements on ONE route. That is not a contrast check, it
 * is four assertions, and it is one of the three reasons the light theme had
 * never been tested once: the light survey's worst confirmed failure is the
 * settings hub's avatar initials at 1.00:1, white ink on a white plate, on a
 * route this file never opened. A check that cannot reach the defect is not
 * evidence about the defect.
 *
 * So it now SWEEPS. Every text-bearing leaf element on every route of the
 * preview harness, at phone width, in dark and in light, measured off the
 * pixels. The harness is the right surface to sweep because it renders the
 * product's own components with fixtures and without a session, which is what
 * lets a check reach `/settings`, `/wallet` and the admin desks at all.
 *
 * WHY ONE SCREENSHOT PER PAGE AND NOT ONE PER ELEMENT. The old file shot each
 * element separately. At roughly a hundred routes, two themes and a few hundred
 * text nodes a page that is a quarter of a million screenshots. This takes one
 * full-page shot, puts it in a canvas inside the page, and reads each element's
 * own rectangle back out of it. Same pixels, same arithmetic, three orders of
 * magnitude less work.
 *
 * Usage:
 *   node scripts/probe-contrast.mjs --base http://127.0.0.1:3184
 *   node scripts/probe-contrast.mjs --base ... --routes /preview/f4/settings --themes light
 *   node scripts/probe-contrast.mjs --base ... --json
 *
 * The server must be a PRODUCTION server with `VALLO_PREVIEW_HARNESS=1`.
 * `next dev` does not hydrate reliably on this box, so no proof from it counts.
 */
import { chromium } from "playwright-core";
import { readdirSync, statSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PREVIEW_ROOT = join(HERE, "..", "src", "app", "(dev)", "preview");

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const BASE = arg("base", "http://127.0.0.1:3184").replace(/\/$/, "");
const JSON_OUT = process.argv.includes("--json");
const WIDTH = Number(arg("width", "390"));
const THEMES = arg("themes", "dark,light")
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean);

/*
 * THE ROUTE LIST IS READ OFF DISK, NOT WRITTEN DOWN HERE.
 *
 * A hardcoded list is a list that is wrong the week after it is written, and a
 * route added to the harness by a worker who has never opened this file is
 * exactly the route that will carry the next defect. So the sweep walks
 * `src/app/(dev)/preview` for `page.tsx` and opens what it finds. A group index
 * page is a list of links and carries no product surface, so the bare group
 * routes are skipped; `/preview` itself is skipped for the same reason.
 */
function harnessRoutes() {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry === "page.tsx") {
        const rel = relative(PREVIEW_ROOT, dir).split(sep).filter(Boolean);
        /* Depth 0 is `/preview`, depth 1 is a group index. Both are link lists. */
        if (rel.length >= 2) out.push("/preview/" + rel.join("/"));
      }
    }
  };
  walk(PREVIEW_ROOT);
  return out.sort();
}

const ROUTES = (arg("routes", null) ?? harnessRoutes().join(","))
  .split(",")
  .map((r) => r.trim())
  .filter(Boolean);

function lum([r, g, b]) {
  const f = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return +((x + 0.05) / (y + 0.05)).toFixed(2);
};

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  /*
   * WITHOUT THESE, HEADLESS CHROMIUM SILENTLY DROPS `backdrop-filter`, so every
   * glass surface measures as a flat fill and the measurement looks
   * authoritative. Same argument, same flags, as `compare-surface.mjs`.
   */
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
});

const findings = [];
const errors = [];

for (const theme of THEMES) {
  for (const route of ROUTES) {
    const page = await browser.newPage({
      viewport: { width: WIDTH, height: 1400 },
      colorScheme: theme,
      deviceScaleFactor: 2,
    });
    try {
      /* Seeded before the first byte, so the root layout's before-paint script
         reads it and the page is never painted in the wrong theme first. Dark
         carries NO attribute, which is how the token sheet is keyed. */
      await page.addInitScript((t) => {
        try {
          window.localStorage.setItem("nf_theme", t);
        } catch {
          /* A storage-blocked context still gets the attribute below. */
        }
      }, theme);
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 45_000 });
      await page.evaluate((t) => {
        if (t === "light") document.documentElement.setAttribute("data-theme", "light");
        else document.documentElement.removeAttribute("data-theme");
      }, theme);
      await page.waitForTimeout(350);

      const shot = (await page.screenshot({ type: "png", fullPage: true })).toString("base64");
      const found = await page.evaluate(
        async ({ src, dpr }) => {
          const img = new Image();
          img.src = "data:image/png;base64," + src;
          await img.decode();
          const c = document.createElement("canvas");
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          const ctx = c.getContext("2d", { willReadFrequently: true });
          ctx.drawImage(img, 0, 0);

          const L = (v) => {
            const f = (x) => {
              const s = x / 255;
              return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
            };
            return 0.2126 * f(v[0]) + 0.7152 * f(v[1]) + 0.0722 * f(v[2]);
          };

          /*
           * A TEXT-BEARING LEAF, and leaf is the whole precision of it. A
           * wrapper whose descendants carry the words would be measured with
           * every colour in the subtree inside its rectangle, so the "surface"
           * would be whatever happened to cover the most pixels and the "ink"
           * would be some unrelated glyph two elements away. Only an element
           * whose OWN child text nodes carry non-whitespace is measured.
           */
          const own = (el) => {
            let s = "";
            for (const n of el.childNodes) {
              if (n.nodeType === Node.TEXT_NODE) s += n.nodeValue;
            }
            return s.replace(/\s+/g, " ").trim();
          };

          const out = [];
          for (const el of document.querySelectorAll("body *")) {
            const text = own(el);
            if (!text) continue;
            const cs = getComputedStyle(el);
            if (cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") continue;
            /*
             * THE RECT HAS TO BE CLIPPED TO WHAT IS ACTUALLY ON SCREEN, AND
             * THE ODOMETER IS WHY.
             *
             * `.nf-odometer__digit` is a vertical strip of ten numerals in a
             * window one numeral tall. Its bounding rect is the whole strip,
             * nine tenths of which the ancestor clips away, so the first
             * version of this sweep measured nine invisible digits against
             * whatever happened to be behind them and reported sixteen
             * failures on one balance figure. None of them is a fact about
             * anything a person sees.
             *
             * So the rect is intersected with every ancestor that clips, which
             * is the browser's own answer to "what is visible", and an element
             * whose visible remainder is a sliver is dropped rather than
             * guessed at.
             */
            let box = el.getBoundingClientRect();
            for (let a = el.parentElement; a; a = a.parentElement) {
              const acs = getComputedStyle(a);
              if (acs.overflow === "visible" && acs.overflowX === "visible" && acs.overflowY === "visible")
                continue;
              const ar = a.getBoundingClientRect();
              box = {
                top: Math.max(box.top, ar.top),
                left: Math.max(box.left, ar.left),
                bottom: Math.min(box.bottom, ar.bottom),
                right: Math.min(box.right, ar.right),
              };
              box.width = box.right - box.left;
              box.height = box.bottom - box.top;
            }
            const r = {
              top: box.top,
              left: box.left,
              width: box.right - box.left,
              height: box.bottom - box.top,
            };
            const top = r.top + window.scrollY;
            const left = r.left + window.scrollX;
            if (r.width < 12 || r.height < 8) continue;
            /* A clipped remainder shorter than the type cannot hold a whole
               glyph, so whatever is in it is a fragment and not a reading. */
            if (r.height < (parseFloat(cs.fontSize) || 16) * 0.7) continue;
            /* sr-only: clipped to nothing and taken out of flow. Nobody sees it,
               so its contrast is not a fact about the product. */
            if (cs.clipPath === "inset(50%)" || cs.clip === "rect(0px, 0px, 0px, 0px)") continue;

            const px = Math.round(left * dpr);
            const py = Math.round(top * dpr);
            const pw = Math.round(r.width * dpr);
            const ph = Math.round(r.height * dpr);
            if (px < 0 || py < 0 || px + pw > c.width || py + ph > c.height) continue;
            if (pw < 4 || ph < 4) continue;

            const d = ctx.getImageData(px, py, pw, ph).data;
            const hist = new Map();
            for (let i = 0; i < d.length; i += 4) {
              const k = `${d[i]},${d[i + 1]},${d[i + 2]}`;
              hist.set(k, (hist.get(k) || 0) + 1);
            }
            const sorted = [...hist.entries()].sort((a, b) => b[1] - a[1]);
            const toPx = (k) => k.split(",").map(Number);
            const total = pw * ph;
            const surface = toPx(sorted[0][0]);
            const surfaceShare = sorted[0][1] / total;

            /*
             * THE INK IS THE MOST COMMON COLOUR FURTHEST FROM THE SURFACE IN
             * LUMINANCE, taken from the head of the histogram so it is the
             * glyph core rather than an antialiasing fringe. The 0.5 per cent
             * floor is what keeps a single stray pixel from being called ink.
             */
            let ink = surface;
            let best = 0;
            for (const [k, n] of sorted.slice(0, 60)) {
              const v = toPx(k);
              const gap = Math.abs(L(v) - L(surface));
              if (gap > best && n > total * 0.005) {
                best = gap;
                ink = v;
              }
            }

            const size = parseFloat(cs.fontSize) || 16;
            const weight = Number(cs.fontWeight) || 400;
            const large = size >= 24 || (size >= 18.66 && weight >= 700);
            out.push({
              text: text.slice(0, 44),
              tag: el.tagName.toLowerCase(),
              cls:
                typeof el.className === "string"
                  ? el.className.split(/\s+/).filter(Boolean).slice(0, 3).join(".")
                  : "",
              ink,
              surface,
              surfaceShare: Math.round(surfaceShare * 100) / 100,
              size: Math.round(size * 10) / 10,
              large,
            });
          }
          return out;
        },
        { src: shot, dpr: 2 },
      );

      for (const f of found) {
        findings.push({ route, theme, ...f, ratio: ratio(f.ink, f.surface) });
      }
    } catch (e) {
      errors.push(`${theme} ${route}: ${e.message.split("\n")[0]}`);
    } finally {
      await page.close();
    }
  }
}
await browser.close();

/*
 * WHAT IS REPORTED, AND WHAT IS HELD BACK AS UNPROVEN.
 *
 * An element sitting on a PHOTOGRAPH has no single surface colour, so the
 * histogram's most common pixel is not "the background" and the ratio computed
 * from it is not a fact. Rather than drop those silently or report them as
 * failures, they are counted separately and named as needing a human. The
 * threshold is the surface's share of the element's own rectangle: below half,
 * there is no flat ground under the words.
 */
const FLAT = 0.5;
const fails = findings.filter(
  (f) => f.surfaceShare >= FLAT && f.ratio < (f.large ? 3 : 4.5),
);
const onMedia = findings.filter((f) => f.surfaceShare < FLAT && f.ratio < 4.5);

if (JSON_OUT) {
  console.log(JSON.stringify({ fails, onMedia, errors, measured: findings.length }, null, 2));
} else {
  const line = (f) =>
    `  ${f.theme.padEnd(5)} ${f.route}  ${f.tag}.${f.cls}  "${f.text}"  ${f.size}px  ` +
    `ink rgb(${f.ink}) on rgb(${f.surface}) = ${f.ratio.toFixed(2)}:1`;
  console.log(
    `contrast sweep: ${ROUTES.length} route(s) x ${THEMES.join(", ")} at ${WIDTH}px. ` +
      `${findings.length} text-bearing leaves measured off the pixels.\n`,
  );
  console.log(`BELOW THE FLOOR (4.5:1, or 3:1 for large text), on a flat ground: ${fails.length}`);
  fails.sort((a, b) => a.ratio - b.ratio).forEach((f) => console.log(line(f)));
  console.log(
    `\nON A PATTERNED OR PHOTOGRAPHIC GROUND, so the number is not a verdict: ${onMedia.length}`,
  );
  onMedia
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, 40)
    .forEach((f) => console.log(line(f)));
  if (errors.length) {
    console.log(`\nROUTES THAT DID NOT OPEN: ${errors.length}`);
    errors.forEach((e) => console.log(`  ${e}`));
  }
  const byTheme = Object.fromEntries(
    THEMES.map((t) => [t, fails.filter((f) => f.theme === t).length]),
  );
  console.log(
    `\n${fails.length === 0 ? "every measured leaf on a flat ground clears its floor." : `${fails.length} below the floor (` + THEMES.map((t) => `${t} ${byTheme[t]}`).join(", ") + ")."}`,
  );
}
process.exit(fails.length === 0 && errors.length === 0 ? 0 : 1);
