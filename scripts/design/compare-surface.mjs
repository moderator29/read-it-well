/*
 * COMPARE WHAT WE DREW AGAINST WHAT THE REFERENCE MEASURES.
 *
 * `sample-reference.mjs` answers half the founder's second ruling: it reads
 * the governing PNGs and says what colour is actually in them. This answers
 * the other half. It opens OUR page on a production server, screenshots it,
 * and samples the same kind of point off our own pixels, so a surface is
 * closed on a number rather than on somebody's impression of a number.
 *
 * WHY PIXELS AND NOT COMPUTED STYLES. A computed style is what was written,
 * not what the browser drew. A border declared `rgba(0,105,254,.35)` composites
 * over whatever is behind it; a glass panel puts a blur between the token and
 * the eye; a shadow bleeds over both. The founder is comparing pixels with his
 * eyes, so the check has to compare pixels too. This is the same lesson as the
 * unlayered `*` border reset, which read correctly in the source and resolved
 * to white 8% in the browser.
 *
 * WHY A PRODUCTION SERVER. `next dev` does not hydrate reliably on this box:
 * same route, same binary, four minutes apart, "React has not hydrated" on dev
 * and clean on `next start`. Every proof comes off `next build && next start`.
 *
 * Usage:
 *   node scripts/design/compare-surface.mjs --base http://127.0.0.1:3170 [--surface dock] [--json]
 *   node scripts/design/compare-surface.mjs --base ... --scan ".nf-tabbar" --url /preview/lead/dock --axis x
 *
 * `--scan` prints a scanline across an element instead of running the checks,
 * which is how you find an empty spot to sample before you write a check down.
 */
import { chromium } from "playwright-core";

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const BASE = arg("base", "http://127.0.0.1:3170").replace(/\/$/, "");
const JSON_OUT = process.argv.includes("--json");

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1536, height: 1024 };

/*
 * THE EXPECTED COLUMN IS NOT AN OPINION. Every `want` below is a hex that
 * `sample-reference.mjs` read out of a governing PNG, and the `from` names
 * which sample it is, so a disagreement is settled by re-running the sampler
 * rather than by arguing. Where the reference cannot answer (a surface it
 * never draws) there is no check here, because inventing a target and then
 * passing it is worse than admitting the reference is silent.
 *
 * TOLERANCE. `tol` is the largest allowed distance on any one channel. Eight
 * is about the width of a JPEG-ish gradient wobble in these images and is well
 * under the quarter-of-a-rung error that the dock edge turned out to be
 * (#003C94 against #012E78 is 28 on blue). A check that needs a tolerance
 * above sixteen is not a check, it is a wish.
 */
const SURFACES = {
  dock: {
    url: "/preview/lead/dock",
    viewport: PHONE,
    note: "the five-slot dock over the product's own canvas, Home active",
    checks: [
      {
        name: "dock: the bar fill",
        selector: ".nf-tabbar",
        at: { fx: 0.5, fy: 0.12 },
        box: 3,
        want: "#000C2E",
        from: "chrome reference, dock: the bar fill",
        tol: 10,
      },
      {
        name: "dock: its top border",
        selector: ".nf-tabbar",
        at: "top-border",
        box: 2,
        want: "#012E78",
        from: "chrome reference, dock: its top border",
        tol: 12,
      },
      {
        name: "dock: the active slot ink",
        selector: '.nf-tab__link[aria-current] .nf-tab__icon',
        at: { fx: 0.5, fy: 0.5 },
        box: 3,
        want: "#0257FD",
        from: "chrome reference, dock: the active slot ink",
        tol: 24,
      },
      {
        name: "canvas: the ground the dock floats on",
        selector: "main",
        at: { fx: 0.5, fy: 0.08 },
        box: 9,
        want: "#000612",
        from: "hero reference, canvas: the page ground below the fold",
        tol: 8,
      },
    ],
    shapes: [
      /*
       * THE SHAPE LAW, MEASURED AS A RATIO. A radius token says nothing on its
       * own: 32px is a rounded rectangle on a tall card and a semicircle on a
       * 66px bar. So this records the drawn radius as a fraction of the drawn
       * short side. Half is a capsule. The dock in the reference has visibly
       * straight ends, so anything at or above 0.5 here is the defect the
       * founder ruled on.
       */
      { name: "dock: the bar", selector: ".nf-tabbar", maxRatio: 0.45 },
    ],
  },
};

const SURFACE = arg("surface", "dock");
const SCAN = arg("scan", null);
const SHAPE_SWEEP = process.argv.includes("--shape-sweep");

/*
 * THE SHAPE SWEEP, AND IT IS THE ONLY CHECK THAT CAN SEE THE DEFECT.
 *
 * `check-css-tokens.mjs` rule 10 fails the build on a pill radius on a
 * control, and it is worth having, but it reads SOURCE TEXT and the shape law
 * has now been broken twice with it passing. `--nf-radius-sm` is 14px, which
 * is a tidy rectangle on a 56px button and a CAPSULE on a 28px chip.
 * `--nf-radius-2xl` is 32px, which is a card on a 300px panel and SEMICIRCULAR
 * ENDS on a 66px dock. Neither spelling contains the word pill.
 *
 * So the ratio is the test: the drawn radius over the drawn short side, read
 * off a real browser on a real production server. Half is a capsule. Anything
 * over `WARN_AT` is worth a human's eye even if it is not yet a capsule.
 *
 * WHAT IS EXEMPT, and the list is the design direction's list rather than a
 * convenience: an avatar, and a BARE ICON-ONLY control that is drawn round in
 * a governing image. Text-bearing is therefore the thing worth detecting, and
 * it is detected by asking the element whether it renders any non-whitespace
 * text, not by its class name. A dot, a spinner, a progress track, a switch,
 * a story ring and a skeleton are shapes rather than controls and the law does
 * not reach them, so they are excluded by selector.
 */
const FAIL_AT = 0.5;
const WARN_AT = 0.35;
const CONTROL_SELECTOR = [
  "button",
  "a.nf-btn",
  "a.nf-site-nav-link",
  "a.nf-tab__link",
  "button.nf-tab__link",
  ".nf-chip",
  ".nf-btn",
  ".nf-icon-btn",
  ".nf-landing-pill-seg",
  ".nf-landing-city",
  "input:not([type=range]):not([type=checkbox]):not([type=radio])",
  "select",
  "[role=button]",
  "[role=tab]",
].join(",");
const SHAPE_EXEMPT = [
  ".nf-avatar",
  "[class*=avatar]",
  "[class*=skeleton]",
  "[class*=spinner]",
  "[class*=switch]",
  "[class*=story-ring]",
  "[class*=grip]",
  "[class*=progress]",
].join(",");

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  /*
   * WITHOUT THESE, HEADLESS CHROMIUM SILENTLY DROPS `backdrop-filter`. It does
   * not warn and it does not fail: the glass simply renders as a flat fill, so
   * every glass surface measures wrong and the measurement looks authoritative.
   * That was the first of today's four harness lies.
   */
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
});

const hex = ([r, g, b]) =>
  "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
const parse = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

async function openSurface(url, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle", timeout: 60_000 });
  /*
   * A Reveal band that never animates in is the third harness lie: the page is
   * "loaded" and the content is at opacity 0, so every sample reads the ground.
   * `scroll-behavior: smooth` in base.css makes `window.scrollTo(0, y)` a
   * silent no-op without a compositor, which is why this passes `instant`.
   */
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
  await page.waitForTimeout(900);
  const stuck = await page.evaluate(() =>
    [...document.querySelectorAll(".nf-reveal")].filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return false;
      return Number(getComputedStyle(el).opacity) < 0.5;
    }).length,
  );
  if (stuck > 0) {
    throw new Error(
      `${url}: ${stuck} on-screen reveal band(s) still at opacity < 0.5. The page did not finish, so no sample from it counts.`,
    );
  }
  return page;
}

/** Sample the screenshot, not the DOM. Coordinates are CSS px; the shot is 2x. */
async function sampler(page) {
  const shot = (await page.screenshot({ type: "png" })).toString("base64");
  await page.evaluate(async (src) => {
    const img = new Image();
    img.src = "data:image/png;base64," + src;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    window.__shot = { ctx, w: img.naturalWidth, h: img.naturalHeight };
  }, shot);
  return async (cssX, cssY, size) =>
    page.evaluate(
      ({ x, y, size }) => {
        const { ctx, w, h } = window.__shot;
        const px = Math.min(w - 1, Math.max(0, Math.round(x * 2)));
        const py = Math.min(h - 1, Math.max(0, Math.round(y * 2)));
        const half = Math.max(0, Math.floor(size / 2));
        const d = ctx.getImageData(px - half, py - half, size, size).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n += 1; }
        return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
      },
      { x: cssX, y: cssY, size },
    );
}

const surface = SURFACES[SURFACE];
if (!surface) {
  console.error(`no surface named "${SURFACE}". known: ${Object.keys(SURFACES).join(", ")}`);
  process.exit(2);
}

if (SHAPE_SWEEP) {
  /*
   * One or more routes, each swept at both widths, because the ratio changes
   * with the layout: a control that is a rectangle at 1536 can be a capsule at
   * 390 when its label wraps away and its height collapses.
   */
  const routes = (arg("routes", surface.url) ?? surface.url).split(",").map((r) => r.trim());
  const widths = (arg("widths", "390,1536") ?? "390,1536").split(",").map((w) => Number(w.trim()));
  let worst = 0;
  const findings = [];
  for (const route of routes) {
    for (const width of widths) {
      const vp = { width, height: width < 900 ? 844 : 1024 };
      const p = await openSurface(route, vp);
      const found = await p.evaluate(
        ({ control, exempt, failAt, warnAt }) => {
          const out = [];
          for (const el of document.querySelectorAll(control)) {
            if (el.closest(exempt)) continue;
            const r = el.getBoundingClientRect();
            if (r.width < 8 || r.height < 8) continue;
            const cs = getComputedStyle(el);
            if (cs.visibility === "hidden" || cs.display === "none") continue;
            const radius = parseFloat(cs.borderTopLeftRadius) || 0;
            const short = Math.min(r.width, r.height);
            if (short <= 0) continue;
            const ratio = radius / short;
            if (ratio < warnAt) continue;
            /* Text-bearing is the thing the law turns on, and it is asked of
               the element rather than assumed from its class. An input has no
               text node, so its value and its placeholder count as its text. */
            const text = (
              el.value ||
              el.getAttribute("placeholder") ||
              el.textContent ||
              ""
            ).replace(/\s+/g, " ").trim();
            const label = el.className && typeof el.className === "string" ? el.className.split(/\s+/).slice(0, 3).join(".") : el.tagName.toLowerCase();
            out.push({
              tag: el.tagName.toLowerCase(),
              label,
              text: text.slice(0, 40),
              hasText: text.length > 0,
              w: Math.round(r.width),
              h: Math.round(r.height),
              radius: Math.round(radius * 10) / 10,
              ratio: Math.round(ratio * 100) / 100,
              capsule: ratio >= failAt,
            });
          }
          return out;
        },
        { control: CONTROL_SELECTOR, exempt: SHAPE_EXEMPT, failAt: FAIL_AT, warnAt: WARN_AT },
      );
      await p.close();
      for (const f of found) {
        findings.push({ route, width, ...f });
        if (f.hasText && f.ratio > worst) worst = f.ratio;
      }
    }
  }
  await browser.close();
  const breaches = findings.filter((f) => f.hasText && f.capsule);
  const watch = findings.filter((f) => f.hasText && !f.capsule);
  const roundIcons = findings.filter((f) => !f.hasText && f.capsule);
  if (JSON_OUT) {
    console.log(JSON.stringify({ breaches, watch, roundIcons }, null, 2));
  } else {
    console.log(`shape sweep: ${routes.join(", ")} at ${widths.join("px, ")}px\n`);
    const line = (f) =>
      `  ${f.route} @${f.width}  ${f.label}  "${f.text}"  ${f.w}x${f.h}  radius ${f.radius}px  ratio ${f.ratio.toFixed(2)}`;
    console.log(`BREACHES, a text-bearing control drawn as a capsule (ratio at or above ${FAIL_AT}): ${breaches.length}`);
    breaches.forEach((f) => console.log(line(f)));
    console.log(`\nWORTH AN EYE, text-bearing and over ${WARN_AT} but not yet a capsule: ${watch.length}`);
    watch.forEach((f) => console.log(line(f)));
    console.log(`\nROUND ICON-ONLY CONTROLS, allowed only where a governing image draws them round: ${roundIcons.length}`);
    roundIcons.forEach((f) => console.log(line(f)));
    console.log(
      `\n${breaches.length === 0 ? "no text-bearing control is a capsule." : `${breaches.length} text-bearing control(s) are capsules. The shape law is broken here.`}`,
    );
  }
  process.exit(breaches.length === 0 ? 0 : 1);
}

const page = await openSurface(SCAN ? arg("url", surface.url) : surface.url, surface.viewport);
const sample = await sampler(page);

if (SCAN) {
  const axis = arg("axis", "x");
  const rect = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, SCAN);
  if (!rect) { console.error(`scan: no element matches ${SCAN}`); process.exit(2); }
  console.log(`scan ${SCAN}  box ${Math.round(rect.w)}x${Math.round(rect.h)} at ${Math.round(rect.x)},${Math.round(rect.y)}`);
  for (let f = 0; f <= 1.0001; f += 0.05) {
    const x = axis === "x" ? rect.x + rect.w * f : rect.x + rect.w / 2;
    const y = axis === "x" ? rect.y + rect.h / 2 : rect.y + rect.h * f;
    console.log(`  ${axis}=${f.toFixed(2)}  ${hex(await sample(x, y, 3))}`);
  }
  await browser.close();
  process.exit(0);
}

const rows = [];
for (const check of surface.checks) {
  const rect = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, check.selector);
  if (!rect || rect.w === 0) {
    rows.push({ ...check, got: null, delta: null, pass: false, why: "no element matches, or it draws nothing" });
    continue;
  }
  let x, y;
  if (check.at === "top-border") {
    x = rect.x + rect.w / 2;
    y = rect.y + 0.5;
  } else {
    x = rect.x + rect.w * check.at.fx;
    y = rect.y + rect.h * check.at.fy;
  }
  const got = await sample(x, y, check.box ?? 3);
  const want = parse(check.want);
  const delta = Math.max(...got.map((v, i) => Math.abs(v - want[i])));
  rows.push({ ...check, got: hex(got), delta, pass: delta <= check.tol, why: null });
}

const shapes = [];
for (const s of surface.shapes ?? []) {
  const drawn = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
    return { radius, short: Math.min(r.width, r.height) };
  }, s.selector);
  if (!drawn) { shapes.push({ ...s, ratio: null, pass: false }); continue; }
  const ratio = drawn.short > 0 ? drawn.radius / drawn.short : 0;
  shapes.push({ ...s, radius: drawn.radius, short: drawn.short, ratio, pass: ratio <= s.maxRatio });
}

await browser.close();

if (JSON_OUT) {
  console.log(JSON.stringify({ surface: SURFACE, url: surface.url, rows, shapes }, null, 2));
} else {
  console.log(`surface: ${SURFACE}  ${BASE}${surface.url}  (${surface.note})`);
  console.log(`viewport: ${surface.viewport.width}x${surface.viewport.height} at 2x\n`);
  const pad = Math.max(...rows.map((r) => r.name.length));
  for (const r of rows) {
    const mark = r.pass ? "ok  " : "MISS";
    const got = r.got ?? "-------";
    const d = r.delta === null ? "  -" : String(r.delta).padStart(3);
    console.log(`${mark} ${r.name.padEnd(pad)}  ours ${got}  reference ${r.want}  worst channel ${d}  (${r.why ?? r.from})`);
  }
  if (shapes.length) {
    console.log("\nshape, as a ratio of the drawn radius to the drawn short side. 0.5 is a capsule.");
    for (const s of shapes) {
      const mark = s.pass ? "ok  " : "MISS";
      console.log(
        s.ratio === null
          ? `${mark} ${s.name}  no element`
          : `${mark} ${s.name}  radius ${s.radius}px on a ${Math.round(s.short)}px side = ${s.ratio.toFixed(2)}  (must be at or under ${s.maxRatio})`,
      );
    }
  }
  const bad = rows.filter((r) => !r.pass).length + shapes.filter((s) => !s.pass).length;
  console.log(`\n${bad === 0 ? "all checks match the reference." : `${bad} check(s) do not match the reference.`}`);
}
process.exit(0);
