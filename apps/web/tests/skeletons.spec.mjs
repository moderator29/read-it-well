/**
 * Skeletons shaped like the real screens. Not spinners.
 *
 * Item 20 of docs/POLISH_PASS.md, inbox items 41 and 205.
 *
 * Read from the source rather than from a browser, and for once that is the
 * only instrument available: a `loading.tsx` is shown while a server component
 * awaits, which on a machine with no route to Supabase is a few milliseconds
 * that no screenshot can catch. What CAN be read here is the thing the item is
 * actually about, which is whether these files exist at all, whether any of
 * them fell back to a spinner, and whether they announce themselves.
 *
 * THE RULES.
 *
 *   1. Every route that reads before it renders has a loading state. A route
 *      without one shows the PREVIOUS screen until its data lands and then
 *      replaces it wholesale, which on a slow connection reads as a tap that
 *      did nothing followed by a page that jumps.
 *   2. None of them is a spinner. A centred spinner says only that something
 *      is happening and then moves everything when it stops.
 *   3. Every one announces itself. A pile of grey boxes is nothing at all to a
 *      screen reader without `aria-busy` and a live region, and that is the
 *      single easiest thing to forget per route.
 *   4. They are built from the shared kit, so a skeleton cannot drift from the
 *      card it stands in for by being hand-drawn a second time.
 *
 * Static routes are exempt and are listed by name. A page with nothing to await
 * has nothing to wait for.
 *
 *   node apps/web/tests/skeletons.spec.mjs
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const APP = join(dirname(fileURLToPath(import.meta.url)), "../src/app");

let failures = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
    if (detail) for (const line of [].concat(detail).slice(0, 20)) console.log(`            ${line}`);
  }
}

/*
 * Routes with nothing to await.
 *
 * The public site is written prose and the auth screens are forms; both render
 * from the module rather than from a read, so a loading state would be a frame
 * of grey boxes nobody asked for. Everything else has to have one.
 */
const NO_WAIT = [
  "/", "/about", "/careers", "/contact", "/help", "/safety", "/standards",
  "/cancellations", "/privacy", "/terms", "/docs", "/docs/[slug]", "/styleguide",
  "/sign-in", "/sign-in/email", "/sign-up", "/sign-up/email", "/sign-up/verify",
  "/forgot-password", "/reset-password", "/offline", "/agents", "/agents/apply",
  "/welcome",
];

/** Walk the app directory and collect every route with a page. */
function routes(dir, url = "", out = []) {
  const entries = readdirSync(dir);
  if (entries.includes("page.tsx")) {
    out.push({ url: url || "/", dir, loading: entries.includes("loading.tsx") });
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    /* A bracketed group is not a URL segment. */
    routes(full, entry.startsWith("(") ? url : `${url}/${entry}`, out);
  }
  return out;
}

const all = routes(APP);
console.log(`\n${all.length} routes`);

/* --------------------------------------------------------- 1. coverage */

const missing = all
  .filter((r) => !r.loading && !NO_WAIT.includes(r.url))
  .map((r) => r.url)
  .sort();
check("every route that reads has a loading state", missing.length === 0, missing);

/* Nothing in the exempt list should have quietly grown a read. Stated the
   other way round: an exemption that is no longer true is a silent gap. */
const stale = NO_WAIT.filter((url) => !all.some((r) => r.url === url));
check("the exempt list has no entries for routes that no longer exist", stale.length === 0, stale);

/* -------------------------------------------- 2, 3 and 4. what they are */

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry === "loading.tsx") out.push(full);
  }
  return out;
}
const files = walk(APP);
console.log(`${files.length} loading states`);

/*
 * A loading file usually delegates to a shared shell, so "does it announce"
 * has to follow one hop. `LoadingShell`, `AgentScreenSkeleton`, `QueueSkeleton`
 * and `LoadingPeople` all carry the announcement; a file that uses one of them
 * has it, and a file that draws its own markup has to say so itself.
 */
const ANNOUNCERS = /LoadingShell|AgentScreenSkeleton|QueueSkeleton|LoadingPeople|ScreenSkeleton/;

const spinners = [];
const silent = [];
const handDrawn = [];
for (const file of files) {
  const src = readFileSync(file, "utf8");
  const rel = relative(APP, file).split("\\").join("/");

  if (/nf-spinner|<Spinner|animate-spin/.test(src)) spinners.push(rel);
  if (!ANNOUNCERS.test(src) && !/aria-busy/.test(src)) silent.push(rel);
  /* Every placeholder box comes from the shared `Skeleton`, which is what
     carries the stride shimmer. A hand-rolled grey div does not. */
  if (/className="[^"]*bg-\[var\(--nf-surface-raised\)\][^"]*"\s*\/>/.test(src)) {
    handDrawn.push(rel);
  }
}

check("no loading state is a spinner", spinners.length === 0, spinners);
check("every loading state announces itself", silent.length === 0, silent);
check("no loading state hand-draws its own grey boxes", handDrawn.length === 0, handDrawn);

/* The shared piece really is the shimmering one, so the rule above means
   something. */
const skeleton = readFileSync(join(APP, "../components/ui/Skeleton.tsx"), "utf8");
check("the shared Skeleton is the one carrying nf-skeleton", /nf-skeleton/.test(skeleton));

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
