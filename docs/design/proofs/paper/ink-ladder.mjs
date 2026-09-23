/**
 * EVERY TOKEN THE STYLESHEETS USE AS `color:`, RESOLVED IN A REAL BROWSER AND
 * MEASURED AGAINST ALL FOUR LIGHT SURFACES.
 *
 *   node docs/design/proofs/paper/ink-ladder.mjs --base http://127.0.0.1:3184
 *
 * WHY IT EXISTS. The whole-harness sweep (`apps/web/scripts/probe-contrast.mjs`)
 * takes half an hour and answers "which ELEMENTS are under the floor". Before
 * spending that, it is worth knowing whether the answer is going to be "the ink
 * ladder is too pale", because if it is, the fix is a handful of tokens and not
 * a list of elements. This answers that in about ten seconds.
 *
 * WHAT IT FOUND ON 23 SEPTEMBER, which is the reason to keep it: **the daylight
 * ink ladder is not the problem.** Every token intended to be read on paper
 * clears 4.5:1 on white, the canvas, raised and inset. `--nf-content-muted`, the
 * pale end of it, is 4.56:1 on its worst surface. So the light-theme text
 * failures the sweep reports are about the SURFACE an element ended up on, not
 * about the colour of the words.
 *
 * THE CAUTION THIS FILE HAS TO CARRY, because it was paid for the day before.
 * Four state colours were once quoted at a contrast they only reach against
 * WHITE, and the product has four light surfaces of which one is white. So this
 * reports the WORST of the four and names it, never the best.
 *
 * AND THE LIMIT THAT FOLLOWS FROM THE SAME CAUTION. An ink that always sits on
 * a KNOWN fill has no meaningful reading against the page: `--nf-content-on-brand`
 * lives on a brand button, the `-on-media` family lives on photographs, and
 * `admin.css` paints `--nf-surface-canvas` as the ink of a badge whose fill is
 * `--nf-status-pending`. All of those come out at 1.00:1 here and none of them
 * is a defect. A 1.00 row is a question, not a verdict: go and look at what the
 * thing is actually painted on.
 */
import { chromium } from "playwright-core";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..", "..");
const arg = (n, d = null) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const BASE = arg("base", "http://127.0.0.1:3184").replace(/\/$/, "");

/* Both places the product keeps stylesheets: `app/css` and a few at `app`. */
const DIRS = [join(ROOT, "apps/web/src/app/css"), join(ROOT, "apps/web/src/app")];
const files = [];
for (const d of DIRS) {
  for (const e of readdirSync(d)) {
    const f = join(d, e);
    if (statSync(f).isFile() && e.endsWith(".css")) files.push(f);
  }
}
const inkTokens = new Map();
for (const f of files) {
  /* Comments are stripped, so a token argued about in prose is never counted. */
  const text = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of text.matchAll(/(?:^|\s)color\s*:\s*var\(\s*(--nf-[a-z0-9-]+)\s*\)/g)) {
    if (!inkTokens.has(m[1])) inkTokens.set(m[1], new Set());
    inkTokens.get(m[1]).add(relative(ROOT, f));
  }
}
const names = [...inkTokens.keys()].sort();

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: "light" });
await page.addInitScript(() => {
  try {
    window.localStorage.setItem("nf_theme", "light");
  } catch {
    /* the attribute below still lands */
  }
});
const res = await page.goto(`${BASE}/preview/g2`, { waitUntil: "networkidle", timeout: 60_000 });
const status = res?.status() ?? 0;
if (status < 200 || status >= 300) throw new Error(`server answered ${status}`);
if (new URL(page.url()).pathname.replace(/\/$/, "") !== "/preview/g2")
  throw new Error(`browser ended up at ${new URL(page.url()).pathname}`);
if (await page.locator("[data-nf-not-found]").count()) throw new Error("not-found body at 200");
await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
await page.waitForTimeout(400);
const resolved = await page.evaluate((list) => {
  /* One throwaway span, so `color-mix`, `var()` chains and alpha all resolve
     exactly as the cascade would resolve them on this document. */
  const probe = document.createElement("span");
  document.body.appendChild(probe);
  const inks = {};
  for (const n of list) {
    probe.style.color = `var(${n})`;
    inks[n] = getComputedStyle(probe).color;
  }
  const surfaces = {};
  for (const s of [
    "--nf-surface-primary",
    "--nf-surface-canvas",
    "--nf-surface-raised",
    "--nf-surface-inset",
  ]) {
    probe.style.color = `var(${s})`;
    surfaces[s] = getComputedStyle(probe).color;
  }
  probe.remove();
  return { inks, surfaces };
}, names);
await browser.close();

const parse = (c) => {
  const m = c.match(/[\d.]+/g).map(Number);
  return { rgb: m.slice(0, 3), a: m.length > 3 ? m[3] : 1 };
};
const lin = (v) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => {
  const [x, y] = [L(a), L(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
/* A translucent ink has no contrast of its own; it has the contrast of what it
   composites to on the surface it is actually on. */
const over = (fg, bg) => (fg.a >= 1 ? fg.rgb : fg.rgb.map((v, i) => fg.a * v + (1 - fg.a) * bg[i]));

const rows = [];
for (const n of names) {
  const fg = parse(resolved.inks[n]);
  let worst = Infinity;
  let worstOn = "";
  for (const [sn, sv] of Object.entries(resolved.surfaces)) {
    const bg = parse(sv).rgb;
    const r = ratio(over(fg, bg), bg);
    if (r < worst) {
      worst = r;
      worstOn = sn.replace("--nf-surface-", "");
    }
  }
  rows.push({ token: n, value: resolved.inks[n], worst, worstOn, files: [...inkTokens.get(n)] });
}
rows.sort((a, b) => a.worst - b.worst);
for (const r of rows) {
  console.log(
    `${r.worst.toFixed(2).padStart(6)}  ${r.token.padEnd(32)} ${r.value.padEnd(26)} ` +
      `worst on ${r.worstOn.padEnd(8)} ${r.files.map((f) => f.split("/").pop()).slice(0, 4).join(", ")}`,
  );
}
console.log(
  `\n${rows.length} ink tokens. Under 4.5:1 on their worst light surface: ` +
    `${rows.filter((r) => r.worst < 4.5).length}. Read the note at the top before calling any of them a defect.`,
);
