#!/usr/bin/env node
/**
 * R2 ROUTE INVENTORY CHECK.
 *
 * Enumerates every route under apps/web/src/app, resolves its public URL
 * (route groups stripped, dynamic segments kept as :param), and then decides
 * for each whether the product can actually reach it:
 *
 *   LINKED      some file outside the route's own directory points at it,
 *               through href=, router.push/replace, redirect(), the nav model,
 *               a route constant, or a middleware/proxy rewrite
 *   SELF_ONLY   only linked from inside its own subtree (reachable once you are
 *               already there, but with no way in from the rest of the product)
 *   ORPHAN      nothing anywhere points at it
 *
 * It also reports whether the route file exports a default component (renders)
 * and whether it is a server or client surface.
 *
 * Usage: node scripts/audit/route-inventory.mjs [--json] [--orphans]
 *
 * Exit code 1 when a non-dev, non-api route is an ORPHAN.
 */

import path from "node:path";
import { ROOT, SRC, APP, walkFiles, read, rel, heading } from "./lib/tsx.mjs";

const argv = process.argv.slice(2);
const AS_JSON = argv.includes("--json");
const ONLY_ORPHANS = argv.includes("--orphans");

/* ---------------------------------------------------------------- routes -- */

function urlFor(file) {
  let dir = path.dirname(path.relative(APP, file));
  if (dir === ".") return "/";
  const parts = dir
    .split(path.sep)
    /* Route groups `(app)` and private folders `_components` are not URL. */
    .filter((p) => !(p.startsWith("(") && p.endsWith(")")))
    .filter((p) => !p.startsWith("@"));
  if (parts.some((p) => p.startsWith("_"))) return null;
  const url = "/" + parts.join("/");
  return url === "/" ? "/" : url;
}

function kindOf(file) {
  const base = path.basename(file);
  if (base === "route.ts" || base === "route.tsx") return "api";
  return "page";
}

const routeFiles = walkFiles(APP, [".tsx", ".ts"]).filter((f) => {
  const base = path.basename(f);
  return base === "page.tsx" || base === "page.ts" || base === "route.ts" || base === "route.tsx";
});

const routes = [];
for (const file of routeFiles) {
  const url = urlFor(file);
  if (url === null) continue;
  const text = read(file);
  const hasDefault =
    /export\s+default\s/.test(text) ||
    /export\s*\{[^}]*\bas\s+default\b/.test(text);
  const isApi = kindOf(file) === "api";
  const httpVerbs = isApi
    ? [...text.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g)].map(
        (m) => m[1],
      )
    : [];
  routes.push({
    url,
    file: rel(file),
    abs: file,
    kind: isApi ? "api" : "page",
    dynamic: /\[/.test(url),
    renders: isApi ? httpVerbs.length > 0 : hasDefault,
    verbs: httpVerbs,
    dev: url.startsWith("/preview") || url.startsWith("/gallery"),
    group: path
      .relative(APP, file)
      .split(path.sep)
      .find((p) => p.startsWith("(") && p.endsWith(")")) ?? "",
  });
}

/* ------------------------------------------------------------- referrers -- */

/**
 * Every string literal and template head in the tree that looks like a path,
 * with the file it came from. This is the reachability corpus: hrefs, pushes,
 * redirects, nav models, route constants, tests, docs of record.
 */
const corpus = [];
const scan = [
  ...walkFiles(SRC, [".ts", ".tsx"]),
  ...walkFiles(path.join(ROOT, "apps", "web", "tests"), [".ts", ".tsx"]),
];
/*
 * A regex rather than a TypeScript parse, and deliberately.
 *
 * The first version of this script parsed all 1,100 files with the compiler's
 * AST so it could ask for string literals and template heads by node kind. It
 * was correct and it took four and a half minutes on a box under load, which
 * means nobody runs it. Every path in this codebase is written as a quoted
 * literal or a template that opens with one, so one pass of this expression
 * finds the same set in under a second. `dead-controls.mjs` still parses,
 * because a handler's emptiness genuinely needs the tree.
 *
 * THREE ALTERNATIVES rather than one with a backreference.
 *
 * `(["'`])(\/[^\n]*?)\1` is the obvious spelling and it is quadratic: on a
 * line that opens a quote and never closes it - a generated types file has
 * many - the lazy body backtracks over the whole line for every start
 * position, and this script went from one second to ninety. Each quote style
 * gets its own character class instead, which cannot backtrack at all.
 */
const PATHY = /"(\/[^"\n]*)"|'(\/[^'\n]*)'|`(\/[^`\n]*)`/g;
/* A navigation context: this path is somewhere the product sends a person. */
const NAV =
  /(?:href\s*=\s*\{?\s*|\bhref:\s*|router\.(?:push|replace|prefetch)\(\s*|\bredirect\(\s*|permanentRedirect\(\s*|NextResponse\.redirect\(\s*(?:new URL\()?\s*)(?:"(\/[^"\n]*)"|'(\/[^'\n]*)'|`(\/[^`\n]*)`)/g;

/**
 * Every template hole becomes a single wildcard segment, so
 * `/u/${handle}/followers` is recorded as a two-fixed-segment path with an
 * unknown middle and matches the `/u/[handle]/followers` route.
 */
function normaliseTemplate(raw) {
  return raw
    .replace(/\$\{[^}]*\}/g, "*")
    .split("?")[0]
    .split("#")[0]
    .replace(/\/+$/, "") || "/";
}

for (const file of scan) {
  const text = read(file);
  const strings = [];
  for (const match of text.matchAll(PATHY)) {
    strings.push(normaliseTemplate(match[1] ?? match[2] ?? match[3]));
  }
  const nav = [];
  for (const match of text.matchAll(NAV)) {
    nav.push(normaliseTemplate(match[1] ?? match[2] ?? match[3]));
  }
  if (strings.length) corpus.push({ file, strings, nav });
}

/**
 * Every distinct candidate path in the tree, normalised once, mapped to the
 * files that hold it. Normalising per route-by-file pair was 126 million
 * string splits and took this script past ten minutes on a loaded box; doing
 * it once takes it under ten seconds.
 */
const candidates = new Map(); // normalised path -> Set<abs file>
for (const entry of corpus) {
  for (const clean of entry.strings) {
    let set = candidates.get(clean);
    if (!set) candidates.set(clean, (set = new Set()));
    set.add(entry.file);
  }
}

/* The narrower corpus: only paths written where the product navigates. */
const navCandidates = new Map();
for (const entry of corpus) {
  for (const clean of entry.nav) {
    let set = navCandidates.get(clean);
    if (!set) navCandidates.set(clean, (set = new Set()));
    set.add(entry.file);
  }
}

/* Bucket candidates by segment count so a dynamic route only compares against
   paths of its own depth. */
const bySegments = new Map();
for (const key of candidates.keys()) {
  const n = key.split("/").length;
  let arr = bySegments.get(n);
  if (!arr) bySegments.set(n, (arr = []));
  arr.push(key);
}

const ownDir = (r) => path.dirname(r.abs);

/**
 * A route segment accepts a candidate segment. A bare `*` is a whole template
 * hole; a segment ENDING in `*` is a literal prefix followed by a hole, which
 * is how `/sign-in${suffix}` (a query string) is written, so it must not read
 * as a link to a route nobody serves.
 */
function segMatches(routeSeg, candSeg) {
  if (candSeg === undefined) return false;
  if (routeSeg.startsWith("[")) return candSeg.length > 0;
  if (candSeg === "*") return true;
  if (candSeg.endsWith("*")) return routeSeg.startsWith(candSeg.slice(0, -1));
  return routeSeg === candSeg;
}

function referrersFor(route) {
  const target = route.url.replace(/\/+$/, "") || "/";
  const files = new Set();
  const exact = candidates.get(target);
  if (exact) for (const f of exact) files.add(f);
  const tp = target.split("/");
  for (const key of bySegments.get(tp.length) ?? []) {
    if (key === target) continue;
    const cp = key.split("/");
    if (tp.every((seg, i) => segMatches(seg, cp[i]))) {
      for (const f of candidates.get(key)) files.add(f);
    }
  }
  return files;
}

for (const route of routes) {
  const linkers = new Set();
  const selfLinkers = new Set();
  const dir = ownDir(route);
  for (const file of referrersFor(route)) {
    if (file === route.abs) continue;
    if (file.startsWith(dir + path.sep) || path.dirname(file) === dir) selfLinkers.add(rel(file));
    else linkers.add(rel(file));
  }
  route.linkers = [...linkers].sort();
  route.selfLinkers = [...selfLinkers].sort();
  route.reach = linkers.size ? "LINKED" : selfLinkers.size ? "SELF_ONLY" : "ORPHAN";
}

/* ------------------------------------------------- links that go nowhere -- */

/**
 * The reverse question, and the more urgent one: which in-app links point at
 * a path this build does not serve? A dead href is a control that renders and
 * then 404s.
 */
const routeIndex = routes.map((r) => ({
  segs: (r.url.replace(/\/+$/, "") || "/").split("/"),
  url: r.url,
}));

/*
 * `next.config.ts` REDIRECTS AND REWRITES ARE ROUTES TOO.
 *
 * The first version of this script did not read them and reported `/agents`
 * and `/agents/status` as dead links offered from the in-app home screen and
 * the site footer. They are not dead: next.config.ts 307s both to a real
 * destination. A tool that cries wolf about the product's own front door is
 * worse than no tool, so the config's sources join the route table. Read from
 * the source text rather than by importing it, because the config is TypeScript
 * with ESM imports and this script must stay a plain `node` run.
 */
/*
 * ONLY redirects() AND rewrites(). `headers()` uses the same `source:` key and
 * its last entry is `/:path*`, which matches every path there is; reading the
 * whole file indiscriminately made the tool declare every link in the product
 * served and report zero dead links, which is the opposite failure to the one
 * it had before and just as useless.
 */
const CONFIG = path.join(ROOT, "apps", "web", "next.config.ts");
const configured = [];
try {
  const text = read(CONFIG);
  for (const name of ["redirects", "rewrites"]) {
    const start = text.search(new RegExp(`async\\s+${name}\\s*\\(`));
    if (start < 0) continue;
    /* The block runs to the next `async <name>(` or to the end of the file. */
    const rest = text.slice(start + 1);
    const nextBlock = rest.search(/async\s+\w+\s*\(/);
    const block = nextBlock < 0 ? rest : rest.slice(0, nextBlock);
    for (const m of block.matchAll(/source:\s*["'`](\/[^"'`\n]*)["'`]/g)) {
      configured.push(m[1].replace(/\/+$/, "") || "/");
    }
  }
} catch {
  /* No config, or unreadable: the route table stands on its own. */
}
for (const source of configured) {
  /* `/fonts/:file*` and `/:path*` are Next's own param syntax; a `:param`
     segment matches anything, and a trailing `*` makes it match the rest. */
  const segs = source.split("/").map((seg) => (seg.startsWith(":") ? "[param]" : seg));
  routeIndex.push({ segs, url: source, fromConfig: true, catchAll: source.includes("*") });
}

function isServed(candidate) {
  const cp = candidate.split("/");
  return routeIndex.some((r) => {
    if (r.catchAll) {
      /* A trailing wildcard source covers itself and everything under it. */
      const head = r.segs.filter((seg) => !seg.endsWith("*"));
      return head.every((seg, i) => segMatches(seg, cp[i]));
    }
    return r.segs.length === cp.length && r.segs.every((seg, i) => segMatches(seg, cp[i]));
  });
}

/* Paths that are legitimately not app routes: static assets, the proxy's own
   rewrites, and third-party API paths written as bare strings in a client. */
const NOT_A_ROUTE =
  /^\/(_next|img\/|icons?\/|assets\/|fonts?\b|brand\/|photos?\/|scenes?\/|plates?\/|storage\/|\.well-known|favicon|manifest|robots|sitemap|opensearch|sw\.js)/;
const ASSET_EXT = /\.(png|jpe?g|webp|avif|svg|ico|json|xml|txt|css|js|mjs|tsx?|woff2?|mp4|webm|pdf)$/i;

const deadLinks = [];
for (const [candidate, files] of navCandidates) {
  if (candidate === "/") continue;
  if (NOT_A_ROUTE.test(candidate) || ASSET_EXT.test(candidate)) continue;
  if (isServed(candidate)) continue;
  deadLinks.push({ path: candidate, files: [...files].map(rel).sort() });
}
deadLinks.sort((a, b) => a.path.localeCompare(b.path));

/* ---------------------------------------------------------------- report -- */

const productRoutes = routes.filter((r) => !r.dev);
const orphans = productRoutes.filter((r) => r.reach === "ORPHAN");
const selfOnly = productRoutes.filter((r) => r.reach === "SELF_ONLY");
const broken = routes.filter((r) => !r.renders);
const failing = orphans.filter((r) => r.kind === "page");

if (AS_JSON) {
  process.stdout.write(JSON.stringify(routes, null, 2) + "\n");
} else {
  console.log(heading("R2 route inventory"));
  console.log(
    `${routes.length} routes (${routes.filter((r) => r.kind === "page").length} pages, ${routes.filter((r) => r.kind === "api").length} API), ${productRoutes.length} outside the dev harness.`,
  );

  if (!ONLY_ORPHANS) {
    console.log(heading("Every route"));
    for (const r of routes) {
      const mark = r.renders ? " " : "!";
      console.log(
        `${mark} ${r.reach.padEnd(9)} ${r.kind.padEnd(4)} ${r.url.padEnd(48)} ${r.file}${r.reach === "LINKED" ? `  <- ${r.linkers.length} referrer(s)` : ""}`,
      );
    }
  }

  console.log(heading("Orphans: nothing in the tree points at these"));
  if (orphans.length === 0) console.log("  none");
  for (const r of orphans) console.log(`  ${r.kind.padEnd(4)} ${r.url.padEnd(48)} ${r.file}`);

  console.log(heading("Self-only: reachable once you are inside, no way in"));
  if (selfOnly.length === 0) console.log("  none");
  for (const r of selfOnly) console.log(`  ${r.kind.padEnd(4)} ${r.url.padEnd(48)} ${r.file}`);

  console.log(heading("Does not render: no default export / no HTTP verb"));
  if (broken.length === 0) console.log("  none");
  for (const r of broken) console.log(`  ${r.url.padEnd(48)} ${r.file}`);

  console.log(heading("Links to paths this build does not serve"));
  if (deadLinks.length === 0) console.log("  none");
  for (const d of deadLinks) console.log(`  ${d.path.padEnd(44)} from ${d.files.join(", ")}`);

  console.log(heading("Summary"));
  console.log(`  routes            ${routes.length}`);
  console.log(`  product routes    ${productRoutes.length}`);
  console.log(`  orphan pages      ${failing.length}`);
  console.log(`  orphan API        ${orphans.length - failing.length}`);
  console.log(`  self-only         ${selfOnly.length}`);
  console.log(`  non-rendering     ${broken.length}`);
  console.log(`  dead links        ${deadLinks.length}`);
  console.log(
    failing.length === 0 && broken.length === 0
      ? "\nPASS: every product page is reachable and renders.\n"
      : `\nFAIL: ${failing.length} orphan pages, ${broken.length} non-rendering routes.\n`,
  );
}

process.exit(failing.length || broken.length || deadLinks.length ? 1 : 0);
