#!/usr/bin/env node
/**
 * ROUTE REACH: can a person get to each page, and from where?
 *
 * `route-inventory.mjs` answers "does any file mention this path". That is too
 * generous: a path written in a sitemap or a label table is not a way in. This
 * script builds the real graph instead:
 *
 *   1. Every page (page.tsx outside `(dev)`, `/preview` and private folders) is
 *      a node.
 *   2. A page's surface is its page.tsx, every layout/template above it, and
 *      everything those files import, transitively (`@/` and relative imports,
 *      static and `import()`).
 *   3. A link is a path written where the product navigates: `href=`, `href:`,
 *      `to:`, `router.push/replace`, `redirect(`, `NextResponse.redirect`,
 *      `location.assign/href`, `new URL("/x"`. Template literals count with the
 *      `${...}` parts treated as wildcards, which is how a list reaches its
 *      dynamic child.
 *   4. Files that name routes without sending anybody there are not linkers:
 *      `lib/nav/*` (labels and back-parents), sitemap, robots, the proxy,
 *      tests, and `(dev)`.
 *
 * Each page then gets one class:
 *
 *   NAV        a row in `components/app/nav-model.ts` or a tab on the dock
 *   ONE_TAP    linked from the surface of a NAV destination
 *   DEEPER     reachable by following links from NAV rows, the dock or the
 *              landing page, two or more taps in
 *   DYN_CHILD  a dynamic route (`[id]`) reached from a reachable list
 *   EXTERNAL   not reachable in the graph, but an email template, an auth
 *              callback or a `next.config` redirect sends people there
 *   ORPHAN     only by address: nothing reachable points at it
 *
 * Usage:
 *   node scripts/audit/route-reach.mjs            table to stdout
 *   node scripts/audit/route-reach.mjs --json     machine readable
 *   node scripts/audit/route-reach.mjs --md       the table in ROUTE-AUDIT.md
 *   node scripts/audit/route-reach.mjs --nav <file>  read nav rows from another
 *                                                    copy of nav-model.ts
 */

import path from "node:path";
import { existsSync, statSync } from "node:fs";
import { ROOT, SRC, APP, walkFiles, read, rel } from "./lib/tsx.mjs";

const argv = process.argv.slice(2);
const AS_JSON = argv.includes("--json");
const navArg = argv.indexOf("--nav");
const NAV_FILE = navArg >= 0 ? path.resolve(argv[navArg + 1]) : path.join(SRC, "components/app/nav-model.ts");
const DOCK_FILES = ["components/app/MobileTabBar.tsx"].map((f) => path.join(SRC, f));

/* --------------------------------------------------------------- routes -- */

function urlFor(file) {
  const parts = path
    .dirname(path.relative(APP, file))
    .split(path.sep)
    .filter((p) => p !== ".")
    .filter((p) => !(p.startsWith("(") && p.endsWith(")")))
    .filter((p) => !p.startsWith("@"));
  if (parts.some((p) => p.startsWith("_"))) return null;
  return "/" + parts.join("/");
}

const pages = walkFiles(APP, [".tsx", ".ts"])
  .filter((f) => /\/page\.tsx?$/.test(f))
  .filter((f) => !f.includes(`${path.sep}(dev)${path.sep}`))
  .map((abs) => ({ abs, url: urlFor(abs) }))
  .filter((r) => r.url !== null && !r.url.startsWith("/preview") && !r.url.startsWith("/gallery"))
  .map((r) => ({ ...r, file: rel(r.abs), segs: r.url === "/" ? [""] : r.url.split("/"), dynamic: r.url.includes("[") }));

/* ------------------------------------------------------------- imports -- */

const EXTS = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];
function resolveImport(from, spec) {
  let base;
  if (spec.startsWith("@/")) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else return null;
  for (const ext of EXTS) {
    const p = base + ext;
    if (existsSync(p) && statSync(p).isFile() && /\.tsx?$/.test(p)) return p;
  }
  return null;
}

const IMPORT_RE = /(?:from\s+|import\s*\(\s*|import\s+|require\(\s*)["']([^"']+)["']/g;
const importCache = new Map();
function importsOf(file) {
  if (importCache.has(file)) return importCache.get(file);
  const out = [];
  for (const m of read(file).matchAll(IMPORT_RE)) {
    const r = resolveImport(file, m[1]);
    if (r) out.push(r);
  }
  importCache.set(file, out);
  return out;
}

function closure(roots) {
  const seen = new Set();
  const stack = [...roots];
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    for (const g of importsOf(f)) if (!seen.has(g)) stack.push(g);
  }
  return seen;
}

function layoutsAbove(pageAbs) {
  const out = [];
  let dir = path.dirname(pageAbs);
  while (dir.startsWith(APP)) {
    for (const name of ["layout.tsx", "template.tsx"]) {
      const p = path.join(dir, name);
      if (existsSync(p)) out.push(p);
    }
    if (dir === APP) break;
    dir = path.dirname(dir);
  }
  return out;
}

/* --------------------------------------------------------------- links -- */

const NOT_LINKERS = [
  /\/lib\/nav\//,
  /\/app\/sitemap\.ts$/,
  /\/app\/robots\.ts$/,
  /\/proxy\.ts$/,
  /\.test\.tsx?$/,
  /\/\(dev\)\//,
];
const LINK_RE =
  /(?:\b(?:href|Href|to|link|destination|returnTo|redirectTo|backHref|cta(?:Href)?|action)\s*[:=]\s*\{?\s*\(?\s*|router\.(?:push|replace|prefetch)\(\s*|\b(?:permanentRedirect|redirect)\(\s*|NextResponse\.redirect\(\s*(?:new URL\()?\s*|location\.(?:assign|replace)\(\s*|location\.href\s*=\s*|new URL\(\s*)(?:"(\/[^"\n]*)"|'(\/[^'\n]*)'|`(\/[^`\n]*)`)/g;
/* Ternaries and `??` fallbacks put the second path after an operator. */
const ALT_RE = /(?:\?|:|\?\?|\|\|)\s*(?:"(\/[^"\n]*)"|'(\/[^'\n]*)'|`(\/[^`\n]*)`)/g;

const BUILDER_RE =
  /(?:\breturn\s+|\bconst\s+[A-Z][A-Z0-9_]*(?:HREF|PATH|ROUTE|URL)\s*=\s*|=>\s*)(?:"(\/[a-z][^"\n]*)"|'(\/[a-z][^'\n]*)'|`(\/[a-z][^`\n]*)`)/g;

function norm(raw) {
  const s = raw.replace(/\$\{[^}]*\}/g, "*").split("?")[0].split("#")[0].replace(/\/+$/, "");
  return s || "/";
}

const linkCache = new Map();
function linksOf(file) {
  if (linkCache.has(file)) return linkCache.get(file);
  let out = [];
  if (!NOT_LINKERS.some((re) => re.test(file))) {
    const text = read(file).replace(/revalidatePath\([^)]*\)/g, "");
    for (const m of text.matchAll(LINK_RE)) out.push(norm(m[1] ?? m[2] ?? m[3]));
    for (const m of text.matchAll(ALT_RE)) out.push(norm(m[1] ?? m[2] ?? m[3]));
    /* Route builders: `return \`/join/${code}\`` and `export const X_HREF =
       "/agent/promotion"`. A surface that imports the builder uses it. */
    for (const m of text.matchAll(BUILDER_RE)) out.push(norm(m[1] ?? m[2] ?? m[3]));
    /* Any template literal that builds an address with a literal first
       segment and an interpolated id is a link to a dynamic child, wherever
       it is written (`out.set(id, \`/rent/review/${r.id}\`)`). */
    for (const m of text.matchAll(/`(\/[a-z][a-z0-9-]*\/[^`\n]*\$\{[^`\n]*)`/g)) out.push(norm(m[1]));
    /* A path whose first segment is computed (`/${locale}${path}`, a share
       door built from a constant) says nothing about where it lands. */
    out = out.filter((p) => !p.startsWith("/api") && !p.startsWith("//") && !p.startsWith("/*"));
    /* Two maps that name where features live without a tap behind them: the
       first-run table (it only sends people to /first-run/*) and the desks'
       keyboard shortcuts (a laptop with a keyboard, never a phone). */
    if (/feature-onboarding\/first-runs\.ts$/.test(file)) out = out.filter((p) => p.startsWith("/first-run"));
    if (/desk\/desk-keys\.ts$/.test(file)) out = [];
  }
  linkCache.set(file, out);
  return out;
}

function segMatch(routeSeg, candSeg) {
  if (candSeg === undefined) return false;
  if (routeSeg.startsWith("[[...")) return true;
  if (routeSeg.startsWith("[")) return candSeg.length > 0;
  if (candSeg === "*") return true;
  if (candSeg.includes("*")) return new RegExp("^" + candSeg.split("*").map(esc).join(".*") + "$").test(routeSeg);
  return routeSeg === candSeg;
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The pages a written path can land on. A dynamic page only matches a path
 *  that does not also match a static sibling exactly. */
function targetsOf(p) {
  const cs = p === "/" ? [""] : p.split("/");
  const hits = pages.filter((r) => {
    const catchAll = r.segs.some((s) => s.startsWith("[..."));
    if (catchAll) {
      const head = r.segs.filter((s) => !s.startsWith("[..."));
      return cs.length >= head.length && head.every((s, i) => segMatch(s, cs[i]));
    }
    return r.segs.length === cs.length && r.segs.every((s, i) => segMatch(s, cs[i]));
  });
  const exact = hits.filter((r) => !r.dynamic && r.url === p);
  return exact.length ? exact : hits;
}

/* --------------------------------------------------------------- graph -- */

for (const r of pages) {
  r.surface = closure([r.abs, ...layoutsAbove(r.abs)]);
  r.ownSurface = closure([r.abs]);
  const out = new Map(); // target url -> linking file
  for (const f of r.surface) {
    for (const p of linksOf(f)) {
      for (const t of targetsOf(p)) if (t !== r && !out.has(t.url)) out.set(t.url, rel(f));
    }
  }
  r.out = out;
}
const byUrl = new Map(pages.map((r) => [r.url, r]));
const inbound = new Map(pages.map((r) => [r.url, []]));
for (const r of pages) for (const [t, via] of r.out) inbound.get(t).push({ from: r.url, via });

/* NAV rows: every `href:` in nav-model.ts, both arms of any ternary. Comments
   and route lists that only decide where the dock shows do not count. */
function hrefsIn(file) {
  const out = new Set();
  for (const line of read(file).split("\n")) {
    if (!/\bhref:/.test(line) || /^\s*(\*|\/\/)/.test(line)) continue;
    for (const m of line.matchAll(/["'`](\/[a-z0-9/_\-[\]]*)(?:[?#][^"'`]*)?["'`]/gi)) out.add(norm(m[1]));
  }
  return out;
}
const navRows = [...hrefsIn(NAV_FILE)].filter((u) => byUrl.has(u));
const dockRows = DOCK_FILES.filter(existsSync).flatMap((f) => [...hrefsIn(f)]).filter((u) => byUrl.has(u) && !navRows.includes(u));

/* EXTERNAL entries: email templates, auth emails, next.config redirects. */
const external = new Map();
const tplDir = path.join(ROOT, "supabase", "templates");
for (const f of existsSync(tplDir) ? walkFiles(tplDir, [".html", ".txt"]) : []) {
  for (const m of read(f).matchAll(/\}\}(\/[a-z0-9/_-]+)/gi)) for (const t of targetsOf(norm(m[1]))) external.set(t.url, rel(f));
}
for (const f of walkFiles(path.join(SRC, "lib"), [".ts", ".tsx"]).filter((f) => /email|mail|notify|push|sms|whatsapp/i.test(f) && !/\.test\./.test(f))) {
  for (const m of read(f).matchAll(/["'`](?:\$\{[^}]+\})(\/[a-z][^"'`\s]*)["'`]/gi)) {
    for (const t of targetsOf(norm(m[1]))) if (!external.has(t.url)) external.set(t.url, rel(f));
  }
}
{
  const cfg = path.join(ROOT, "apps", "web", "next.config.ts");
  if (existsSync(cfg)) {
    for (const m of read(cfg).matchAll(/destination:\s*["'`](\/[^"'`]*)["'`]/g)) {
      for (const t of targetsOf(norm(m[1].replace(/:[a-z]+\*?/gi, "*")))) if (!external.has(t.url)) external.set(t.url, "next.config.ts redirect");
    }
  }
  const proxy = path.join(SRC, "proxy.ts");
  if (existsSync(proxy)) {
    for (const m of read(proxy).matchAll(/(?:redirect|rewrite)\(\s*new URL\(\s*["'`](\/[^"'`]*)["'`]/g)) {
      for (const t of targetsOf(norm(m[1]))) if (!external.has(t.url)) external.set(t.url, "proxy.ts");
    }
  }
}

/* API routes are where an email link lands before it redirects (unsubscribe,
   OAuth return, payment return). Their redirects are entries from outside. */
for (const f of walkFiles(path.join(APP, "api"), [".ts"]).concat(walkFiles(path.join(APP, "auth"), [".ts"]))) {
  if (!/\/route\.ts$/.test(f)) continue;
  for (const p of linksOf(f)) for (const t of targetsOf(p)) if (!external.has(t.url)) external.set(t.url, rel(f));
}
/* Doors that are only ever sent, never linked: checked by hand, named here so
   the classification says why rather than calling them orphans. */
for (const [url, why] of [
  ["/landlord/[token]", "SMS to the landlord on the mandate (single-use token)"],
  ["/safe/[token]", "safety share link sent to a friend (SafetyShareControl, SAFE_DOOR)"],
]) if (byUrl.has(url)) external.set(url, why);
/* The service worker's offline fallback. */
{
  const sw = path.join(ROOT, "apps", "web", "public", "sw.js");
  if (existsSync(sw)) for (const m of read(sw).matchAll(/["'`](\/offline)["'`]/g)) for (const t of targetsOf(m[1])) external.set(t.url, "public/sw.js");
}
/* Notification rows the database writes carry an href; the Notifications list
   renders it as a tap. So each one is an edge from /notifications. */
{
  const mig = path.join(ROOT, "supabase", "migrations");
  const note = byUrl.get("/notifications");
  if (note && existsSync(mig)) {
    for (const f of walkFiles(mig, [".sql"])) {
      for (const m of read(f).matchAll(/'(\/[a-z][a-z0-9/_-]*)(?:[?#][^']*)?'\s*(\|\|)?/g)) {
        const p = norm(m[1] + (m[2] ? "*" : ""));
        for (const t of targetsOf(p)) if (t !== note && !note.out.has(t.url)) {
          note.out.set(t.url, `notification href in ${rel(f)}`);
          inbound.get(t.url).push({ from: "/notifications", via: `notification href in ${path.basename(f)}` });
        }
      }
    }
  }
}

/* BFS from the nav rows, the dock and the landing page. */
const depth = new Map();
const parent = new Map();
const queue = [];
for (const u of [...navRows, ...dockRows, "/"]) if (byUrl.has(u) && !depth.has(u)) { depth.set(u, 0); queue.push(u); }
while (queue.length) {
  const u = queue.shift();
  for (const [t] of byUrl.get(u).out) {
    if (depth.has(t)) continue;
    depth.set(t, depth.get(u) + 1);
    parent.set(t, u);
    queue.push(t);
  }
}

const navSet = new Set([...navRows, ...dockRows]);
for (const r of pages) {
  const d = depth.get(r.url);
  const fromNav = inbound.get(r.url).filter((e) => navSet.has(e.from));
  if (navSet.has(r.url)) r.reach = "NAV";
  else if (d !== undefined && r.dynamic) r.reach = "DYN_CHILD";
  else if (fromNav.length) r.reach = "ONE_TAP";
  else if (d !== undefined) r.reach = "DEEPER";
  else if (external.has(r.url)) r.reach = "EXTERNAL";
  else r.reach = "ORPHAN";
  const first = fromNav[0] ?? inbound.get(r.url).find((e) => depth.has(e.from)) ?? inbound.get(r.url)[0];
  r.via = navSet.has(r.url) ? (navRows.includes(r.url) ? "nav-model.ts" : "dock") : r.reach === "EXTERNAL" ? external.get(r.url) : first ? `${first.from} (${first.via})` : "";
  r.taps = navSet.has(r.url) ? 0 : d;
  r.inboundCount = inbound.get(r.url).length;
  /* Thin redirect stubs are not screens; say so instead of scoring them. */
  const text = read(r.abs);
  r.stub = /\bredirect\(|permanentRedirect\(/.test(text) && text.split("\n").length < 40 && !/return\s*\(\s*</.test(text);
  r.lines = text.split("\n").length;
}

/* --------------------------------------------------------------- score -- */

/**
 * "Is it good", read from source. A heuristic, never a signed-in walk: it
 * rewards the shared primitives from docs/design/ONE-PRODUCT-DECISIONS.md, the
 * four designed states, and real copy, and it marks placeholders down. The
 * route audit says so next to every score.
 */
const PRIMS = ["ListGroup", "Money", "HeroFigure", "Sheet", "BackControl", "State", "Skeleton", "DragToConfirm", "InnerNav", "PageHeader", "EmptyState", "Row", "RowList", "Section", "Surface", "ResultScreen", "Unreachable", "ButtonLink"];
function boundary(r, name) {
  let dir = path.dirname(r.abs);
  let level = 0;
  while (dir.startsWith(APP)) {
    if (existsSync(path.join(dir, name))) return dir === APP ? "root" : level === 0 ? "own" : "parent";
    if (dir === APP) break;
    dir = path.dirname(dir);
    level++;
  }
  return "none";
}
function scoreRoute(r) {
  if (r.stub) return { score: null, notes: "redirect stub" };
  const dir = path.dirname(r.abs);
  const local = [...r.ownSurface].filter((f) => f.startsWith(dir + path.sep) || importsOf(r.abs).includes(f)).filter((f) => !/\.test\./.test(f));
  const text = local
    .map(read)
    .join("\n")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const notes = [];
  let score = 40;
  const prims = PRIMS.filter((n) => new RegExp(`<${n}[\\s>/]`).test(text));
  score += Math.min(15, prims.length * 4);
  if (!prims.length) notes.push("no shared primitives");
  const loading = boundary(r, "loading.tsx");
  if (loading === "own") score += 10; else if (loading === "parent") score += 6; else notes.push("no loading state");
  const error = boundary(r, "error.tsx");
  const handled = /<Unreachable|ResultScreen|notFound\(\)|catch\s*[({]|\berror\b.*\?/.test(text);
  if (error === "own" || error === "parent") score += 8; else if (handled) score += 6; else { score += 1; notes.push("errors fall to the root boundary"); }
  const empty = /<EmptyState|<State\b|empty|nothing yet|No [a-z]+ yet/i.test(text);
  if (empty) score += 8; else notes.push("no empty state");
  if (/getDictionary|useDictionary|copy\.|\bt\.[a-z]/.test(text)) score += 5; else notes.push("copy not in the dictionary");
  if (/generateMetadata|export const metadata/.test(read(r.abs))) score += 4;
  if (/coming soon|lorem|TODO|placeholder text/i.test(text)) { score -= 15; notes.push("placeholder copy"); }
  if (/window\.(?:confirm|alert)\(|(?<![.\w])(?:confirm|alert)\(\s*["'`A-Z]/.test(text)) { score -= 8; notes.push("browser confirm/alert"); }
  if (/<table[\s>]/.test(text) && !/overflow-x-auto|overflow-auto|nf-table-scroll|-dt-wrap|nf-admin-dt--stack/.test(text)) { score -= 8; notes.push("table without a scroll wrapper"); }
  const pageLines = read(r.abs).split("\n").length;
  /* A short page that reads nothing but the locale and draws an empty state is
     a placeholder, however tidy. */
  const pageText = read(r.abs);
  const readsData = /from "@\/lib\/(?!locale")/.test(pageText) || /from "\.\//.test(pageText);
  if (pageLines < 60 && !readsData && /<EmptyState/.test(pageText)) { score -= 20; notes.push("placeholder screen (empty state only)"); }
  return { score: Math.max(10, Math.min(88, score)), notes: notes.join("; ") };
}
for (const r of pages) Object.assign(r, scoreRoute(r));

/* -------------------------------------------------------------- report -- */

const order = ["NAV", "ONE_TAP", "DEEPER", "DYN_CHILD", "EXTERNAL", "ORPHAN"];
if (argv.includes("--md")) {
  /* The full table for docs/sessions/ROUTE-AUDIT.md, one row per page. */
  const cell = (v) => String(v ?? "").replace(/\|/g, "/").replace(/apps\/web\/src\//g, "");
  console.log("| Route | Reach | Taps | Score | Way in | Notes |");
  console.log("| --- | --- | --- | --- | --- | --- |");
  for (const c of order) {
    for (const r of pages.filter((p) => p.reach === c).sort((a, b) => a.url.localeCompare(b.url))) {
      console.log(`| \`${r.url}\` | ${c} | ${r.taps ?? "-"} | ${r.score ?? "stub"} | ${cell(r.via)} | ${cell(r.notes)} |`);
    }
  }
} else if (AS_JSON) {
  const rows = pages.map(({ url, file, reach, via, taps, inboundCount, dynamic, stub, lines, score, notes }) => ({ url, file, reach, via, taps, inboundCount, dynamic, stub, lines, score, notes }));
  process.stdout.write(JSON.stringify({ navFile: rel(NAV_FILE), navRows, dockRows, rows }, null, 2) + "\n");
} else {
  console.log(`${pages.length} pages. Nav rows read from ${rel(NAV_FILE)}.`);
  for (const c of order) console.log(`  ${c.padEnd(10)} ${pages.filter((r) => r.reach === c).length}`);
  for (const c of order) {
    console.log(`\n${c}`);
    for (const r of pages.filter((p) => p.reach === c).sort((a, b) => a.url.localeCompare(b.url))) {
      console.log(`  ${r.url.padEnd(46)} ${String(r.taps ?? "-").padEnd(3)} ${String(r.score ?? "--").padEnd(3)} ${r.stub ? "stub " : ""}${r.via}`);
    }
  }
}
