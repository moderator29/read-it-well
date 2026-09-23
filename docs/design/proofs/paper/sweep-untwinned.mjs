/**
 * WHICH SURFACES DRAW AN OBJECT THAT HAS NO LIGHT TWIN.
 *
 *   node docs/design/proofs/paper/sweep-untwinned.mjs --base http://127.0.0.1:3184
 *
 * This exists so the founder commissions from a LIST rather than from a
 * feeling. `measure-object-ground.mjs` says which objects are short of the
 * floor; it cannot say where a person meets them. A static scan of
 * `<BrandIcon name="...">` cannot either, because 63 of the call sites take
 * their name from a table and the table is the interesting half.
 *
 * So this walks the preview harness with the document in DAYLIGHT and reads
 * `data-object` and `data-twinned` off the plates the page actually rendered.
 * `BrandIcon.tsx` writes both attributes for exactly this reason. What comes
 * back is a surface, an object, and the size it was drawn at, which is the
 * three things a render order needs.
 *
 * IT REPORTS WHAT IT COULD NOT OPEN. A route that 404s, redirects or serves a
 * layout `notFound()` at 200 is named rather than counted as "no objects
 * here", because a silent zero is how a list like this goes stale.
 */
import { chromium } from "playwright-core";
import { readdirSync, statSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..", "..");
const PREVIEW_ROOT = join(ROOT, "apps", "web", "src", "app", "(dev)", "preview");
const arg = (n, d = null) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const BASE = arg("base", "http://127.0.0.1:3184").replace(/\/$/, "");

function harnessRoutes() {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry === "page.tsx") {
        const rel = relative(PREVIEW_ROOT, dir).split(sep).filter(Boolean);
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

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--disable-lcd-text"],
});

const bySurface = new Map();
const byObject = new Map();
const errors = [];

for (const route of ROUTES) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    colorScheme: "light",
    deviceScaleFactor: 1,
  });
  try {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("nf_theme", "light");
      } catch {
        /* the attribute below still lands */
      }
    });
    const res = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 45_000 });
    const status = res?.status() ?? 0;
    if (status < 200 || status >= 300) throw new Error(`server answered ${status}`);
    const landed = new URL(page.url()).pathname.replace(/\/$/, "") || "/";
    const asked = new URL(`${BASE}${route}`).pathname.replace(/\/$/, "") || "/";
    if (landed !== asked) throw new Error(`browser ended up at ${landed}`);
    if (await page.locator("[data-nf-not-found]").count())
      throw new Error("not-found body served at 200");
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
    await page.waitForTimeout(300);
    const found = await page.evaluate(() =>
      [...document.querySelectorAll(".nf-brand-icon-ground[data-object]")].map((el) => ({
        object: el.dataset.object,
        twinned: el.dataset.twinned === "true",
        size: Math.round(el.getBoundingClientRect().width),
      })),
    );
    for (const f of found) {
      if (f.twinned) continue;
      if (!bySurface.has(route)) bySurface.set(route, new Map());
      const m = bySurface.get(route);
      m.set(f.object, Math.max(m.get(f.object) ?? 0, f.size));
      if (!byObject.has(f.object)) byObject.set(f.object, new Set());
      byObject.get(f.object).add(route);
    }
  } catch (e) {
    errors.push(`${route}: ${e.message.split("\n")[0]}`);
  } finally {
    await page.close();
  }
}
await browser.close();

console.log(
  JSON.stringify(
    {
      routes: ROUTES.length,
      surfaces: [...bySurface.entries()]
        .map(([route, m]) => ({
          route,
          objects: [...m.entries()].map(([object, size]) => ({ object, size })).sort((a, b) => a.object.localeCompare(b.object)),
        }))
        .sort((a, b) => b.objects.length - a.objects.length),
      objects: [...byObject.entries()]
        .map(([object, routes]) => ({ object, routes: [...routes].sort() }))
        .sort((a, b) => b.routes.length - a.routes.length),
      errors,
    },
    null,
    1,
  ),
);
