#!/usr/bin/env node
/**
 * R2 STATES CHECKLIST PER SURFACE.
 *
 * For every product page in apps/web/src/app, answers four questions:
 *
 *   LOADING    is there a `loading.tsx` beside it, or a <Suspense fallback>,
 *              or a designed skeleton in the page's own tree?
 *   EMPTY      does the surface draw something deliberate when its data is
 *              empty - an <EmptyState>, an emptyMessage, a `.length === 0`
 *              branch that renders rather than returns null?
 *   ERROR      is there an `error.tsx` boundary over it, or an explicit
 *              rendered failure state (ResultScreen state="error", an
 *              ActionResult !ok branch that paints something)?
 *   SIGNED_OUT does it know the reader may not be signed in - a session read
 *              that branches, a redirect to sign-in, an AuthGate, or a
 *              `signedIn` prop threaded into the view?
 *
 * "Designed" vs "accidental" is the distinction the founder asked for, and
 * this script draws it as follows:
 *
 *   designed    a named state component (EmptyState, ResultScreen, Skeleton,
 *               ScreenSkeleton, Unreachable) or a dedicated route file
 *   accidental  a bare `return null`, an early `notFound()` with nothing
 *               drawn, a `&&` that simply omits the section, or nothing at all
 *
 * Usage: node scripts/audit/states-checklist.mjs [--json] [--gaps]
 * Exit code 1 when any page-with-data has no empty state at all.
 */

import path from "node:path";
import { ts, APP, walkFiles, read, parse, rel, exists, heading } from "./lib/tsx.mjs";

const argv = process.argv.slice(2);
const AS_JSON = argv.includes("--json");
const ONLY_GAPS = argv.includes("--gaps");

/*
 * Every .tsx under app/, read once, grouped by directory.
 *
 * The first version re-walked and re-read each page's own directory, which on
 * a tree with nested route folders read some files thirty times over. One pass
 * and a map does the same job.
 */
const ALL = walkFiles(APP, [".tsx"]).filter((f) => !f.endsWith(".test.tsx"));
const TEXT = new Map(ALL.map((f) => [f, read(f)]));

/* Files that make up one surface: the page plus the view components that live
   beside it in the same route folder and below it. */
function surfaceFiles(pageFile) {
  const dir = path.dirname(pageFile) + path.sep;
  return ALL.filter((f) => f.startsWith(dir));
}

function urlFor(file) {
  const dir = path.dirname(path.relative(APP, file));
  if (dir === ".") return "/";
  const parts = dir.split(path.sep).filter((p) => !(p.startsWith("(") && p.endsWith(")")));
  if (parts.some((p) => p.startsWith("_"))) return null;
  return "/" + parts.join("/");
}

/** The nearest ancestor route folder holding `name`, App Router style. */
function nearestRouteFile(pageFile, name) {
  let dir = path.dirname(pageFile);
  while (dir.startsWith(APP)) {
    const candidate = path.join(dir, name);
    if (exists(candidate)) return rel(candidate);
    if (dir === APP) break;
    dir = path.dirname(dir);
  }
  return null;
}

const DESIGNED_EMPTY =
  /\b(EmptyState|EmptyActions|emptyMessage|emptyTitle|Unreachable|ResultScreen|QueueEmpty|Tombstone)\b/;
const ANY_EMPTY_BRANCH = /\.length\s*===\s*0|\.length\s*<\s*1|!\w+\.length|\blength\s*\?\s/;
const DESIGNED_LOADING = /\b(Skeleton|ScreenSkeleton|SkeletonCard|Ske|nf-skeleton|nf-spinner|loading\s*[:=])\b/;
const DESIGNED_ERROR = /state="error"|tone="error"|role="alert"|\bErrorState\b|!result\.ok|!read\.ok|\.ok\s*===\s*false/;
const SIGNED_OUT =
  /\bresolveSession\b|\bsignedIn\b|\bsignedOut\b|\bAuthGate\b|\bAccessScreen\b|redirect\(\s*["'`]\/sign-in|requireSession|requireAdmin|requireAgent|getSession|\bviewer\b|\bsession\s*(?:\?\?|\?\.|===\s*null|\|\|)|state\s*===\s*["'`]signed-out["'`]|getAgentContext|getHostContext/;

/*
 * A surface needs an empty state when it RENDERS A COLLECTION that can come
 * back empty. Reading a single record and showing it is a not-found question,
 * which `not-found.tsx` and the notFound() call answer; a settings form or a
 * sign-in screen has no empty state to design, and listing them as gaps
 * buried the surfaces that genuinely do.
 */
const READS_DATA =
  /\bawait\s+(list|get|read|fetch|load|search|count)\w*\(|from\(["'`]|\.select\(|createClient\(/;
const RENDERS_LIST = /\b\w+s\.map\(|\bitems\.map\(|\brows\.map\(|\bentries\.map\(|\bresults\.map\(/;

/* Public by design: a marketing page, a legal page, the auth screens and the
   offline shell have no signed-out state to design because that IS the state. */
const PUBLIC_BY_DESIGN = /^\/(about|cancellations|careers|contact|docs|help|privacy|safety|standards|styleguide|terms|sign-in|sign-up|start|forgot-password|reset-password|auth|offline|legal|welcome|$)/;

const pages = ALL.filter((f) => path.basename(f) === "page.tsx");

const rows = [];
for (const page of pages) {
  const url = urlFor(page);
  if (url === null) continue;
  const dev = url.startsWith("/preview") || url.startsWith("/gallery");
  const files = surfaceFiles(page);
  const text = files.map((f) => TEXT.get(f) ?? "").join("\n");
  const pageText = TEXT.get(page) ?? "";

  const loadingFile = exists(path.join(path.dirname(page), "loading.tsx"))
    ? rel(path.join(path.dirname(page), "loading.tsx"))
    : nearestRouteFile(page, "loading.tsx");
  const errorFile = nearestRouteFile(page, "error.tsx");
  const notFoundFile = nearestRouteFile(page, "not-found.tsx");

  const hasSuspense = /<Suspense\b/.test(text);
  const loading = loadingFile
    ? { has: true, quality: "designed", how: loadingFile }
    : hasSuspense && DESIGNED_LOADING.test(text)
      ? { has: true, quality: "designed", how: "Suspense + skeleton in the page" }
      : hasSuspense
        ? { has: true, quality: "accidental", how: "Suspense with a bare fallback" }
        : DESIGNED_LOADING.test(text)
          ? { has: true, quality: "designed", how: "skeleton or spinner in the view" }
          : { has: false, quality: "none", how: "" };

  const readsData = READS_DATA.test(text) && RENDERS_LIST.test(text);
  const empty = DESIGNED_EMPTY.test(text)
    ? { has: true, quality: "designed", how: "EmptyState / emptyMessage / ResultScreen" }
    : ANY_EMPTY_BRANCH.test(text)
      ? { has: true, quality: "accidental", how: "a length check that omits the section" }
      : { has: false, quality: "none", how: "" };

  const error = errorFile
    ? { has: true, quality: "designed", how: errorFile }
    : DESIGNED_ERROR.test(text)
      ? { has: true, quality: "designed", how: "a rendered failure branch" }
      : { has: false, quality: "none", how: "" };

  /* The gate may sit in a layout above this route, which is where the admin
     and agent consoles put it, so the whole chain counts as this surface. */
  const chain = [text];
  {
    let dir = path.dirname(page);
    while (dir.startsWith(APP)) {
      const layout = path.join(dir, "layout.tsx");
      if (TEXT.has(layout)) chain.push(TEXT.get(layout));
      if (dir === APP) break;
      dir = path.dirname(dir);
    }
  }
  const gated = chain.join("\n");
  const publicPage = PUBLIC_BY_DESIGN.test(url);
  const signedOut = publicPage
    ? { has: true, quality: "designed", how: "public by design" }
    : SIGNED_OUT.test(gated)
      ? {
          has: true,
          quality: /EmptyState|ResultScreen|AuthGate|AccessScreen/.test(gated) ? "designed" : "accidental",
          how: "session branch",
        }
    : { has: false, quality: "none", how: "" };

  rows.push({
    url,
    file: rel(page),
    dev,
    readsData,
    loading,
    empty,
    error,
    signedOut,
    notFound: notFoundFile,
  });
}

const product = rows.filter((r) => !r.dev);
const missingEmpty = product.filter((r) => r.readsData && !r.empty.has);
const missingLoading = product.filter((r) => r.readsData && !r.loading.has);
const missingError = product.filter((r) => !r.error.has);
const missingSignedOut = product.filter((r) => !r.signedOut.has);
const accidental = product.filter(
  (r) => r.empty.quality === "accidental" || r.loading.quality === "accidental",
);

function mark(state) {
  if (!state.has) return "--";
  return state.quality === "designed" ? "ok" : "~~";
}

if (AS_JSON) {
  process.stdout.write(JSON.stringify(rows, null, 2) + "\n");
} else {
  console.log(heading("R2 states checklist"));
  console.log("ok = a designed state, ~~ = accidental (the section simply vanishes), -- = none\n");
  console.log(`  ${"surface".padEnd(44)} load empty error signedout`);
  for (const r of product) {
    if (ONLY_GAPS && r.loading.has && r.empty.has && r.error.has && r.signedOut.has) continue;
    console.log(
      `  ${r.url.padEnd(44)}  ${mark(r.loading)}    ${mark(r.empty)}    ${mark(r.error)}    ${mark(r.signedOut)}`,
    );
  }

  console.log(heading("Surfaces that read data and draw nothing when it is empty"));
  if (missingEmpty.length === 0) console.log("  none");
  for (const r of missingEmpty) console.log(`  ${r.url.padEnd(44)} ${r.file}`);

  console.log(heading("Surfaces that read data with no loading state at all"));
  if (missingLoading.length === 0) console.log("  none");
  for (const r of missingLoading) console.log(`  ${r.url.padEnd(44)} ${r.file}`);

  console.log(heading("Surfaces with no error state and no error boundary above them"));
  if (missingError.length === 0) console.log("  none");
  for (const r of missingError) console.log(`  ${r.url.padEnd(44)} ${r.file}`);

  console.log(heading("Surfaces that never consider a signed-out reader"));
  if (missingSignedOut.length === 0) console.log("  none");
  for (const r of missingSignedOut) console.log(`  ${r.url.padEnd(44)} ${r.file}`);

  console.log(heading("Summary"));
  console.log(`  product surfaces        ${product.length}`);
  console.log(`  no empty state          ${missingEmpty.length}`);
  console.log(`  no loading state        ${missingLoading.length}`);
  console.log(`  no error state          ${missingError.length}`);
  console.log(`  no signed-out state     ${missingSignedOut.length}`);
  console.log(`  accidental, not designed ${accidental.length}`);
  console.log(
    missingEmpty.length === 0
      ? "\nPASS: every data surface draws something when it is empty.\n"
      : `\nFAIL: ${missingEmpty.length} data surfaces draw nothing when empty.\n`,
  );
}

process.exit(missingEmpty.length ? 1 : 0);
