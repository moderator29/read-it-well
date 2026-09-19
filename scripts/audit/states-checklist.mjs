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
import { ts, APP, SRC, walkFiles, read, parse, rel, exists, heading } from "./lib/tsx.mjs";

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

/*
 * Files that make up one surface: the page, plus the view files that live in
 * its own route folder.
 *
 * TWO CORRECTIONS, both of which were making this script report the opposite
 * of the truth. They are written out because a checking script that lies is
 * worse than no script, and both faults are the kind that come back.
 *
 * ONE: IT USED TO SWALLOW NESTED ROUTES. `f.startsWith(dir)` takes everything
 * below the folder, and everything below a route folder includes OTHER ROUTES.
 * `/profile/setup` renders a two-item constant and reads nothing at all, and
 * it was reported as a data surface with no empty state because the script was
 * reading `/profile/setup/[role]/page.tsx` as part of it. A nested page.tsx is
 * a different surface with its own row in this table, so the walk now stops at
 * the segment boundary.
 *
 * TWO: IT COULD ONLY SEE VIEWS THAT HAPPENED TO SIT IN THE ROUTE FOLDER.
 * Where a page's view component lives is a filing decision, not a design one,
 * and this script was grading the filing. `/listing/[id]` draws a full
 * `EmptyState` for a listing with no reviews and `/messages/share/[kind]/[id]`
 * draws one for an account with no conversations to share into; both were
 * reported as drawing nothing, because `ListingReviews.tsx` is under
 * `components/` and `SharePicker.tsx` is one folder up. So the surface now
 * also carries what the page DIRECTLY IMPORTS, one hop, project files only.
 *
 * One hop and no further, deliberately. Two hops reaches the shared primitives
 * and then every page that imports `Screen.tsx` for its type scale inherits the
 * definition of `EmptyState` and passes. The imported files are also matched
 * with a stricter rule (below): the component has to be RENDERED there, not
 * merely defined or exported.
 */
function surfaceFiles(pageFile) {
  const dir = path.dirname(pageFile) + path.sep;
  return ALL.filter((f) => {
    if (!f.startsWith(dir)) return false;
    const inner = f.slice(dir.length);
    const segments = inner.split(path.sep);
    /* A file in a subfolder that has its own page.tsx belongs to that surface. */
    for (let i = 1; i < segments.length; i += 1) {
      const nested = path.join(dir, ...segments.slice(0, i), "page.tsx");
      if (TEXT.has(nested)) return false;
    }
    return true;
  });
}

const EXT_TRIES = [".tsx", ".ts", "/index.tsx", "/index.ts"];
const IMPORT_RE = /\bfrom\s*["']([^"']+)["']/g;

/** `@/x` and `./x` to a real file under src, or null for a package import. */
function resolveImport(spec, fromFile) {
  let base;
  if (spec.startsWith("@/")) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(fromFile), spec);
  else return null;
  for (const ext of EXT_TRIES) {
    const candidate = base + ext;
    if (exists(candidate)) return candidate;
  }
  return null;
}

const VIEW_CACHE = new Map();
function viewText(files) {
  const seen = new Set(files);
  const out = [];
  for (const file of files) {
    const text = TEXT.get(file) ?? "";
    for (const match of text.matchAll(IMPORT_RE)) {
      const target = resolveImport(match[1], file);
      if (!target || !target.endsWith(".tsx") || seen.has(target)) continue;
      seen.add(target);
      if (!VIEW_CACHE.has(target)) VIEW_CACHE.set(target, read(target));
      out.push({ file: target, text: VIEW_CACHE.get(target) });
    }
  }
  return out;
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
/*
 * The same names, but RENDERED rather than merely mentioned.
 *
 * This is the rule applied to a file the page imports rather than to the page
 * itself, and the difference matters: `components/app/Screen.tsx` is where
 * `EmptyState` is declared, so the loose rule above would pass every surface
 * that imports that module for its type scale. A `<EmptyState` in an imported
 * view is that view drawing one.
 */
const RENDERS_EMPTY =
  /<\s*(EmptyState|EmptyActions|Unreachable|ResultScreen|QueueEmpty|Tombstone)\b|\bempty(?:Message|Title)\s*[:=]/;
/*
 * The accidental shape: the code knows the collection can be empty and answers
 * by leaving the section out.
 *
 * `\.length\s*>\s*0\s*&&` was missing, which is the commonest spelling of it
 * in this tree, so a surface written that way was reported as having no empty
 * handling at all rather than as accidental. `/settings` was on the FAIL list
 * for `blockers.length > 0 && (...)` - the list of things stopping an account
 * being deleted, whose empty case is the happy path and correctly shows
 * nothing. The script's own documentation has always called this shape
 * accidental rather than missing; only the pattern disagreed.
 */
const ANY_EMPTY_BRANCH =
  /\.length\s*===\s*0|\.length\s*<\s*1|!\w+\.length|\blength\s*\?\s|\.length\s*(?:>\s*0|>=\s*1)?\s*&&/;

/*
 * A LENGTH TERNARY WHOSE EMPTY SIDE DRAWS SOMETHING.
 *
 * The regex above knows `xs.length === 0` and `!xs.length`. It does not know
 * `xs.length > 0 ? <the list/> : <what to say instead/>`, which is the single
 * most common shape a real empty state takes in this tree, and every surface
 * written that way was being reported as drawing nothing. `/restaurant/[id]`
 * says in plain words that a venue has published no hours, and this script
 * called it a hole.
 *
 * Text cannot answer this: the question is which branch of the ternary is the
 * empty one and whether that branch renders or is `null`. So this one check
 * builds a syntax tree, for the handful of files that reach it, and reads the
 * branch. `null`, `undefined`, an empty fragment and an empty string are
 * omissions; anything else is a drawn empty state.
 */
/*
 * The condition has to be an EMPTINESS test and nothing else.
 *
 * The first cut of this asked only whether the condition mentioned `.length`,
 * and `/agent/settings` promptly passed on
 * `accounts.length === 1 ? "one account" : "you have N accounts"`, which is a
 * plural, not an empty state. Zero and one-or-more, in the five spellings this
 * tree uses, and no other number.
 */
const EMPTINESS_TEST =
  /^\s*!?\s*[\w.?[\]()]+\.length\s*(?:(?:===?|!==?)\s*0|<\s*1|>\s*0|>=\s*1)?\s*$/;
/** A bare truthiness guard: `detail`, `read.ok`, `data?.rows`. */
const NULL_GUARD = /^\s*!?\s*[\w.?[\]()]+\s*$/;

/**
 * `detail && detail.windows.length > 0` is an emptiness test with a null guard
 * in front of it, and it is how half this tree writes the check. The guards
 * are stripped and the last operand is the test.
 */
function isEmptinessTest(condition) {
  const parts = condition.split("&&");
  const last = parts.pop();
  if (!EMPTINESS_TEST.test(last)) return false;
  return parts.every((part) => NULL_GUARD.test(part));
}

/** Which side of the ternary is the empty case. */
const EMPTY_IS_TRUE_BRANCH = /\.length\s*(?:===?\s*0|<\s*1)\s*$|^\s*!/;
const NOT_DRAWN = /^(null|undefined|""|''|``|<>\s*<\/>|<\/?>\s*<\/>)$/;

function drawnEmptyBranch(file, text) {
  let sourceFile;
  try {
    sourceFile = parse(file, text);
  } catch {
    return null;
  }
  let found = null;
  const visit = (node) => {
    if (found) return;
    if (ts.isConditionalExpression(node)) {
      const condition = node.condition.getText(sourceFile);
      if (isEmptinessTest(condition)) {
        const branch = EMPTY_IS_TRUE_BRANCH.test(condition.trim()) ? node.whenTrue : node.whenFalse;
        const drawn = branch.getText(sourceFile).trim();
        /* And the branch has to RENDER. A string on the empty side of a
           ternary is a sentence somewhere in a paragraph, not a state. */
        if (!NOT_DRAWN.test(drawn) && drawn.includes("<")) {
          found = RENDERS_EMPTY.test(drawn) || DESIGNED_EMPTY.test(drawn)
            ? "a named state component on the empty branch"
            : "a drawn branch for the empty case";
        }
      }
    }
    if (!found) ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  return found;
}
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

/*
 * ...AND THE MAP HAS TO PRODUCE A VIEW.
 *
 * `/settings` was on the gap list because `interests.map(t => label).join(", ")`
 * matched the pattern above. That is a sentence being assembled, not a
 * collection being rendered, and the settings index is a fixed list of rows
 * with no empty state to design. A map whose callback returns JSX is the thing
 * this report is actually about.
 */
function rendersACollection(files) {
  for (const file of files) {
    const text = TEXT.get(file) ?? "";
    if (!RENDERS_LIST.test(text)) continue;
    let sourceFile;
    try {
      sourceFile = parse(file, text);
    } catch {
      return true; /* unparseable: keep the surface on the list rather than off it */
    }
    let found = false;
    const visit = (node) => {
      if (found) return;
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.getText(sourceFile) === "map" &&
        node.arguments.length > 0
      ) {
        const body = node.arguments[0].getText(sourceFile);
        if (/<[A-Za-z>]/.test(body)) found = true;
      }
      if (!found) ts.forEachChild(node, visit);
    };
    ts.forEachChild(sourceFile, visit);
    if (found) return true;
  }
  return false;
}

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

  const readsData = READS_DATA.test(text) && RENDERS_LIST.test(text) && rendersACollection(files);

  /*
   * The order is deliberate, cheapest and most certain first. A named state
   * component in the surface's own files, then one rendered in a view the page
   * imports, then a ternary whose empty side draws, then the `&&` that merely
   * omits the section, then nothing.
   */
  let empty = DESIGNED_EMPTY.test(text)
    ? { has: true, quality: "designed", how: "EmptyState / emptyMessage / ResultScreen" }
    : null;
  if (!empty) {
    for (const view of viewText(files)) {
      if (!RENDERS_EMPTY.test(view.text)) continue;
      empty = { has: true, quality: "designed", how: `an empty state in ${rel(view.file)}` };
      break;
    }
  }
  if (!empty) {
    for (const file of files) {
      const drawn = drawnEmptyBranch(file, TEXT.get(file) ?? "");
      if (!drawn) continue;
      empty = { has: true, quality: "designed", how: `${drawn}, ${rel(file)}` };
      break;
    }
  }
  if (!empty) {
    empty = ANY_EMPTY_BRANCH.test(text)
      ? { has: true, quality: "accidental", how: "a length check that omits the section" }
      : { has: false, quality: "none", how: "" };
  }

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
