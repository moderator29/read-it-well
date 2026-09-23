/*
 * `docs/design/NAV_STATE.md`, BUILT FROM THE EVIDENCE RATHER THAN FROM MEMORY.
 *
 * One row per route file in `apps/web/src/app`. For each: whether it declares a
 * parent, whether a browser saw a back control on it, where pressing that
 * control landed cold and warm, what Android's hardware button does there, and
 * whose file it is.
 *
 * WHY THIS IS GENERATED AND NOT WRITTEN. A hand-kept table of 328 routes is a
 * table that is wrong within a day, and a table that is wrong is worse than no
 * table because people stop checking it. Every column below comes from one of
 * three places and from nowhere else:
 *
 *   the tree     `src/app`, walked for `page` and `route` files.
 *   the map      `lib/nav/route-parents.ts`, matched with the SAME specificity
 *                rule `lib/nav/resolve.ts` uses, so this file cannot disagree
 *                with the product about which pattern wins.
 *   the walks    `docs/design/proofs/nav/*.json`, written by
 *                `scripts/design/proof-nav.mjs` from a real Chromium against a
 *                production server.
 *
 * A route with no walk row says NOT WALKED and why. It never says anything
 * else. The whole reason this document exists is that "no row" and "a row that
 * passed" were indistinguishable for sixty routes for months.
 *
 *   node scripts/design/nav-state.mjs
 */
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const APP = join(REPO, "apps/web/src/app");
const PROOFS = join(REPO, "docs/design/proofs/nav");
const OUT = join(REPO, "docs/design/NAV_STATE.md");

/* ------------------------------------------------------------------ the map */
const MAP_SRC = readFileSync(join(REPO, "apps/web/src/lib/nav/route-parents.ts"), "utf8");
function section(name) {
  const from = MAP_SRC.indexOf(`export const ${name}`);
  if (from === -1) throw new Error(`REFUSING: ${name} not found`);
  const to = MAP_SRC.indexOf("\n};", from);
  if (to === -1) throw new Error(`REFUSING: no end for ${name}`);
  return MAP_SRC.slice(from, to);
}
function pairs(src, allowRoot) {
  const out = new Map();
  const re = allowRoot
    ? /^\s*"([^"]+)":\s*(ROOT|"([^"]+)")\s*,/gm
    : /^\s*"([^"]+)":\s*"([^"]*)"\s*,/gm;
  let m;
  while ((m = re.exec(src))) out.set(m[1], allowRoot ? (m[2] === "ROOT" ? null : m[3]) : m[2]);
  return out;
}
const ROUTE_PARENTS = pairs(section("ROUTE_PARENTS"), true);
const NON_NAVIGABLE = pairs(section("NON_NAVIGABLE"), false);
if (ROUTE_PARENTS.size < 150) throw new Error(`REFUSING: only ${ROUTE_PARENTS.size} map entries parsed`);
if (NON_NAVIGABLE.size < 25) throw new Error(`REFUSING: only ${NON_NAVIGABLE.size} non-navigable entries parsed`);

/* The matcher, reproducing `resolve.ts`'s specificity rule exactly. */
const DYN = /^\[(.+)\]$/;
const segs = (p) => (p === "/" ? [] : p.slice(1).split("/"));
function scoreOf(pattern, path) {
  const w = segs(pattern);
  const h = segs(path);
  if (w.length !== h.length) return null;
  const out = [];
  for (let i = 0; i < w.length; i += 1) {
    if (DYN.test(w[i])) {
      if (!h[i]) return null;
      out.push(1);
    } else if (w[i] === h[i]) out.push(2);
    else return null;
  }
  return out;
}
const beats = (a, b) => {
  for (let i = 0; i < a.length; i += 1) if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  return false;
};
function matchRoute(path) {
  let best = null;
  for (const p of ROUTE_PARENTS.keys()) {
    const c = scoreOf(p, path);
    if (!c) continue;
    if (!best || beats(c, best.score)) best = { pattern: p, score: c };
  }
  return best?.pattern ?? null;
}
function fill(parent, pattern, path) {
  if (parent === null) return null;
  const w = segs(pattern);
  const h = segs(path);
  const params = {};
  w.forEach((s, i) => {
    const d = DYN.exec(s);
    if (d) params[d[1]] = h[i];
  });
  return "/" + segs(parent).map((s) => {
    const d = DYN.exec(s);
    return d ? (params[d[1]] ?? s) : s;
  }).join("/");
}

/* ----------------------------------------------------------------- the tree */
const FILES = [];
(function walk(dir, parts) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, /^\(.*\)$/.test(entry) ? parts : [...parts, entry]);
      continue;
    }
    const m = /^(page|route)\.tsx?$/.exec(entry);
    if (!m) continue;
    FILES.push({
      url: parts.length === 0 ? "/" : `/${parts.join("/")}`,
      kind: m[1] === "route" ? "handler" : "page",
      file: full.slice(REPO.length + 1),
    });
  }
})(APP, []);
FILES.sort((a, b) => a.url.localeCompare(b.url));
if (FILES.length < 300) throw new Error(`REFUSING: only ${FILES.length} route files found`);

/* --------------------------------------------------------------- the walks */
const WALKS = [];
for (const [name, file] of [
  ["keyless survey", "keyless/survey.json"],
  ["walk, added", "walk-added.json"],
  ["walk, dynamic", "walk-dynamic.json"],
  ["walk, gated", "walk-gated.json"],
  ["walk, subjects", "walk-subjects.json"],
  ["walk, first pass", "walk.json"],
]) {
  const path = join(PROOFS, file);
  if (!existsSync(path)) continue;
  const data = JSON.parse(readFileSync(path, "utf8"));
  WALKS.push({ name, file, when: data.when, rows: data.rows });
}
if (WALKS.length === 0) throw new Error("REFUSING: no walk output to read; NAV_STATE would claim nothing was ever walked");

/**
 * Latest row per WALKED URL, and separately a note of which pattern had a
 * sibling walked.
 *
 * KEYED BY URL AND NOT BY PATTERN, AND THE FIRST VERSION OF THIS FILE GOT IT
 * WRONG. `/preview/[deck]/[screen]` covers 130 harness screens and exactly one
 * of them was opened in a browser. Keyed by pattern, this table told all 130
 * that they had been walked and had drawn a control, on the strength of one.
 * That is the same lie as a green row for an unreachable route, one layer of
 * indirection along, and it is the lie this whole document exists to stop.
 *
 * A route whose own address was never opened says NOT WALKED. When a sibling on
 * its pattern WAS opened, that is recorded as what it is: evidence about the
 * pattern, and not about this screen.
 */
const EVIDENCE = new Map();
const SIBLING = new Map();
for (const walk of WALKS) {
  for (const row of walk.rows) {
    if (row.pattern !== row.url && !SIBLING.has(row.pattern)) SIBLING.set(row.pattern, row.url);
    const held = EVIDENCE.get(row.url);
    /* A row that REACHED the route beats one that did not, whatever the date:
       the refusals are mostly the signed-out gate, and a gate is a fact about
       the run rather than about the route. Between two that reached, the newer
       wins. */
    if (!held || (row.reachable && !held.row.reachable) || (row.reachable === held.row.reachable && walk.when > held.when)) {
      EVIDENCE.set(row.url, { row, walk: walk.name, when: walk.when, file: walk.file });
    }
  }
}

/* ------------------------------------------------------- behind the gate
 *
 * `src/proxy.ts` sends a signed-out visitor to `/sign-in` before a gated page
 * runs. THIS MATTERS TO EVERY NEGATIVE READING IN THIS TABLE AND IT IS WHY THE
 * COLUMN IS NOT A SIMPLE YES OR NO.
 *
 * The walks on this machine have no session. A gated route can therefore be
 * opened here only on a build with no platform keys at all, where the gate does
 * not run, and what that build serves is the page's SIGNED-OUT branch: a
 * sign-in wall, a console refusal screen, an unconfigured notice. Those are
 * real renderings and they are not the state a person meets, because the proxy
 * never serves them.
 *
 * So a control SEEN on a gated route is evidence (the component rendered). A
 * control NOT seen on a gated route is NOT evidence that the route lacks one:
 * `/admin`'s back control is mounted below `requireAdmin()`'s refusal, and no
 * browser without an admin session can reach it on any build. Those rows read
 * NOT PROVEN, with the reason, rather than NO.
 */
const PROXY_SRC = readFileSync(join(REPO, "apps/web/src/proxy.ts"), "utf8");
/* THE LIST IS THE OTHER WAY UP NOW, and it turned over underneath this work.
   `80097483` inverted the signed-out gate while this pass was running: PUBLIC is
   the enumerated set and everything else needs a session, so a new route is born
   locked. Read from the source rather than restated, and a parse that comes back
   small REFUSES rather than quietly classifying the whole product as open. */
function publicSegments() {
  const from = PROXY_SRC.indexOf("const PUBLIC_SEGMENTS = new Set(");
  if (from === -1) throw new Error("REFUSING: PUBLIC_SEGMENTS not found in proxy.ts");
  const to = PROXY_SRC.indexOf("]);", from);
  const set = new Set();
  for (const m of PROXY_SRC.slice(from, to).matchAll(/^\s*"([a-z-]+)",?\s*$/gm)) set.add(m[1]);
  if (set.size < 10) throw new Error(`REFUSING: only ${set.size} public segments parsed`);
  return set;
}
function publicPaths() {
  const m = /const PUBLIC_PATHS = new Set\(\[([^\]]*)\]\)/.exec(PROXY_SRC);
  if (!m) throw new Error("REFUSING: PUBLIC_PATHS not found in proxy.ts");
  return new Set([...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]));
}
const PUBLIC_SEGMENTS = publicSegments();
const PUBLIC_PATHS = publicPaths();
const gated = (url) =>
  !(PUBLIC_PATHS.has(url) || PUBLIC_SEGMENTS.has(segs(url)[0] ?? "") || url.startsWith("/api/"));

/* -------------------------------------------------------------- whose it is */
/**
 * `docs/SESSION_B_SCOPE.md` as prefixes, plus the two routes R14 assigned.
 *
 * `/profile/setup/**` and `/profile/application/**` are explicitly NOT Session
 * B's in that file, which is why the profile prefix names the page file rather
 * than the folder. The whole `(auth)` group is listed because R14 assigned all
 * eight auth screens and Session B has acknowledged R14 in its own scope file.
 * This is a reading of that document; where it is wrong the document wins.
 */
const SESSION_B = [
  "apps/web/src/app/admin/",
  "apps/web/src/app/(app)/profile/page",
  "apps/web/src/app/(app)/wallet/",
  "apps/web/src/app/(app)/inspections/",
  "apps/web/src/app/welcome/",
  "apps/web/src/app/(auth)/",
  "apps/web/src/app/auth/callback/",
  "apps/web/src/app/agent/inspections/",
  "apps/web/src/app/(dev)/preview/session-b/",
];
const owner = (file) => (SESSION_B.some((p) => file.startsWith(p)) ? "Session B" : "this session");

/* ------------------------------------------------------------------ the rows */
const rows = FILES.map((f) => {
  const pattern = matchRoute(f.url);
  const declared = pattern !== null;
  const parentPattern = declared ? ROUTE_PARENTS.get(pattern) : undefined;
  const isRoot = declared && parentPattern === null;
  const parent = declared ? fill(parentPattern ?? null, pattern, f.url) : null;
  const nonNav = NON_NAVIGABLE.get(f.url);

  const ev = EVIDENCE.get(f.url) ?? null;
  const sibling = !ev && pattern ? SIBLING.get(pattern) ?? null : null;
  let drawn = "NOT WALKED";
  let cold = "NOT WALKED";
  let warm = "NOT WALKED";
  let note = "";
  if (nonNav) {
    drawn = "n/a";
    cold = "n/a";
    warm = "n/a";
    note = `not a screen: ${nonNav}`;
  } else if (isRoot) {
    drawn = ev ? (ev.row.drawn ? "yes" : "no, and correct") : "NOT WALKED";
    cold = "n/a, ROOT";
    warm = "n/a, ROOT";
    note = "top of the hierarchy; no back control belongs here";
  } else if (ev) {
    if (!ev.row.reachable) {
      note = `NOT WALKED: ${ev.row.refused}`;
    } else if (!ev.row.drawn) {
      if (gated(f.url) && ev.walk === "keyless survey") {
        drawn = "NOT PROVEN";
        cold = "NOT WALKED";
        warm = "NOT WALKED";
        note =
          "Opened only on a keyless build, where the proxy's gate does not run and the page serves its signed-out branch. " +
          "That branch is not a state the proxy ever serves, so drawing nothing there is not evidence that this route lacks a control.";
      } else {
        drawn = "NO";
        cold = "no control to press";
        warm = "no control to press";
        note = `walked, ${ev.walk}`;
      }
    } else {
      drawn = "yes";
      cold = ev.row.coldLanded ?? "NOT WALKED";
      warm = ev.row.warmLanded ?? "not taken";
      if (ev.row.gatedParent) note = `control asked for ${ev.row.coldAsked}; the proxy gated it onto ${ev.row.coldLanded}`;
      else note = `walked, ${ev.walk}`;
    }
  } else if (sibling) {
    note = `NOT WALKED. A sibling on the same pattern was: \`${sibling}\`. That is evidence about \`${pattern}\`, not about this screen.`;
  } else if (DYN.test(segs(f.url).at(-1) ?? "")) {
    note = "NOT WALKED: a dynamic segment with no concrete address to open.";
  } else {
    note = f.kind === "handler" ? "route handler; no document is served" : "NOT WALKED: never opened.";
  }

  const android = nonNav
    ? "never asked: the web view never rests on a route handler"
    : isRoot
      ? "EXITS the shell"
      : declared
        ? `goes to ${parent}`
        : "goes to the caller's fallback; never exits";

  return { ...f, pattern, declared, parent, isRoot, drawn, cold, warm, note, android, own: owner(f.file), ev };
});

/* ------------------------------------------------------------------ counting */
const pages = rows.filter((r) => r.kind === "page");
const count = {
  files: rows.length,
  pages: pages.length,
  handlers: rows.length - pages.length,
  declared: rows.filter((r) => r.declared).length,
  roots: rows.filter((r) => r.isRoot).length,
  nonNav: rows.filter((r) => NON_NAVIGABLE.get(r.url)).length,
  drew: rows.filter((r) => r.drawn === "yes").length,
  drewNot: rows.filter((r) => r.drawn === "NO").length,
  notProven: rows.filter((r) => r.drawn === "NOT PROVEN").length,
  notWalked: rows.filter((r) => r.drawn === "NOT WALKED").length,
  theirs: rows.filter((r) => r.drawn === "NO" && r.own === "Session B").length,
};

const esc = (v) => (v === null || v === undefined ? "-" : String(v).replace(/\|/g, "\\|"));
const out = [];
out.push("# NAV_STATE: where back goes, per route, and how that is known");
out.push("");
out.push("GENERATED by `scripts/design/nav-state.mjs`. Do not hand-edit: re-run it.");
out.push("");
out.push("**WHICH TREE THE WALKS ARE ABOUT, said before anything else is read.**");
out.push("Every walk below was taken in an isolated `git worktree` at `68f30240`, with");
out.push("`node_modules` hardlinked at the root and at `apps/web`, against a production");
out.push("`next start`. They are a verdict about THAT tree. While they were running,");
out.push("`80097483` inverted the signed-out gate in `src/proxy.ts`: PUBLIC is now the");
out.push("enumerated set and everything else needs a session. So routes those walks opened");
out.push("signed out, including `/search`, `/around`, `/escrow`, `/price` and `/u/[handle]`,");
out.push("are gated on today's main and would refuse now. The declarations and the Android");
out.push("answers are unaffected, because `chooseBack` never reads the gate.");
out.push("");
out.push("The `gated` classification behind NOT PROVEN is read from TODAY's `proxy.ts`, so");
out.push("it is current even where the walk is not.");
out.push("");
out.push(`Route files in \`apps/web/src/app\`: **${count.files}** (${count.pages} pages, ${count.handlers} route handlers).`);
out.push(`Declared in \`lib/nav/route-parents.ts\`: **${count.declared}**, of which **${count.roots}** are ROOTs.`);
out.push(`Named in \`NON_NAVIGABLE\` with a reason: **${count.nonNav}**.`);
out.push(`Seen to DRAW a back control by a browser: **${count.drew}**. Seen to draw NONE: **${count.drewNot}** (${count.theirs} of them Session B's).`);
out.push(`NOT PROVEN, because the only build that can open them serves a branch the proxy never serves: **${count.notProven}**. NOT WALKED at all: **${count.notWalked}**.`);
out.push("");
out.push("## How to read this");
out.push("");
out.push("**NOT WALKED means nobody looked.** It is not a pass and it is not a failure.");
out.push("Every one carries the reason it could not be reached, and most of those reasons");
out.push("are the signed-out gate in `src/proxy.ts`: this machine has no way to hold a");
out.push("real session, so a route behind that gate cannot be opened here at all.");
out.push("");
out.push("**`control asked for` is not `where it landed`.** A control that pushes the right");
out.push("parent and is then bounced by the gate is CORRECT, and the note says so. A wrong");
out.push("destination and a correct destination behind a gate look identical from the");
out.push("address bar and have different owners.");
out.push("");
out.push("**The Android column is what `isAppRoot` answers.** A ROOT exits the shell; a");
out.push("declared route goes to its parent; an undeclared route goes to a fallback and");
out.push("never exits, which is the safe direction by design.");
out.push("");
out.push("## The walks this table is built from");
out.push("");
out.push("| run | file | taken | rows |");
out.push("|---|---|---|---|");
for (const w of WALKS) out.push(`| ${w.name} | \`docs/design/proofs/nav/${w.file}\` | ${w.when} | ${w.rows.length} |`);
out.push("");
out.push("## Every route");
out.push("");
out.push("| route | file kind | declared parent | control drawn | back lands, cold | back lands, warm | Android hardware button | whose | evidence |");
out.push("|---|---|---|---|---|---|---|---|---|");
for (const r of rows) {
  out.push(
    `| \`${esc(r.url)}\` | ${r.kind} | ${r.isRoot ? "ROOT" : esc(r.parent)} | ${esc(r.drawn)} | ${esc(r.cold)} | ${esc(r.warm)} | ${esc(r.android)} | ${r.own} | ${esc(r.note)} |`,
  );
}
out.push("");
writeFileSync(OUT, out.join("\n"));
console.log(`written: ${OUT}`);
console.log(JSON.stringify(count, null, 1));
