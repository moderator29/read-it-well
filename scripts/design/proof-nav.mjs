/*
 * THE WALK. EVERY ROUTE THAT DECLARES A PARENT, OPENED, PRESSED, AND FOLLOWED.
 *
 * ===========================================================================
 * WHY A GREP IS NOT A PROOF HERE
 * ===========================================================================
 *
 * `lib/nav/route-parents.ts` declares a parent for 143 routes and 22 of them
 * drew no back control at all. The way that survived is instructive: a static
 * read of the import graph says `/around` HAS one, because the page imports
 * `SocialPaused`, which imports `PageHeader`, which calls `useBack`. All true,
 * and the running feed has no back control, because `SocialPaused` is the
 * kill-switch branch nobody sees. An import is not a render.
 *
 * So this script opens the page in Chromium, finds the control, PRESSES it, and
 * writes down where the browser ended up. Nothing here reads source.
 *
 * ===========================================================================
 * THE GUARDS, AND WHAT EACH ONE COST SOMEBODY
 * ===========================================================================
 *
 *   status       a server can answer anything, including a redirect chain.
 *   landed       `page.url()` against what was asked for, because a signed-out
 *                visitor is bounced to `/sign-in` and a walk that does not
 *                check would cheerfully report the login page's controls under
 *                twenty-two other route names.
 *   not-found    a layout `notFound()` answers HTTP 200 with the not-found
 *                body. `/crypto` and `/gallery` both do exactly this, so a 200
 *                is not a page.
 *   BLANK        and this is the one this build keeps re-learning. ASK WHAT
 *                THIS SCRIPT WOULD REPORT IF THE PAGE WERE BLANK. Without this
 *                guard: status 200, landed right, no not-found marker, no
 *                `[data-nav-back]` - and it would print "no back control
 *                drawn", which is a true sentence about a page that rendered
 *                nothing and a completely false report about the back control.
 *                A blank page is its own finding and is never a missing
 *                control.
 *
 * Every one of the four can turn a row into REFUSED, and a refused row is never
 * counted as a pass.
 *
 * ===========================================================================
 * THE INSTRUMENT PROVES ITSELF FIRST
 * ===========================================================================
 *
 * `selfTest()` runs before the walk and refuses to go on unless all four of
 * these hold, each one an instrument failure found on this build in another
 * form:
 *
 *   1. a declared ROOT (`/`) draws NO back control - if the selector matched
 *      anything at all, every row would pass for the wrong reason;
 *   2. a route nobody has ever written answers not-found - if the guard were
 *      broken, an unreachable route would read as reachable;
 *   3. a page emptied by hand is reported BLANK and not "no control";
 *   4. clicking the control on a known-good route really changes the URL, so
 *      "landed nowhere" means the control did nothing rather than that the
 *      waiting logic never waits.
 *
 * ===========================================================================
 * RUNNING IT
 * ===========================================================================
 *
 *   cd apps/web
 *   NEXT_DIST_DIR=.next-nav npx next build
 *   NEXT_DIST_DIR=.next-nav npx next start -p 3377 &
 *   PROOF_BASE=http://127.0.0.1:3377 node ../../scripts/design/proof-nav.mjs
 *
 * `next start`, never `next dev`: dev does not hydrate reliably on this box and
 * an unhydrated button is a button that does nothing.
 *
 * AND DO NOT REBUILD INTO THE DIRECTORY THE RUNNING SERVER IS SERVING FROM.
 * Doing it once mid-run made every `/_next/static/chunks/*.js` answer 500 with
 * `text/plain`, so nothing hydrated and every back control on the site was a
 * server-rendered corpse. The fifth guard in `load()` now refuses those rows
 * rather than blaming the control, which is how that was caught, but the right
 * answer is a dist directory per server.
 *
 * `/preview` and `/gallery` are gated by `previewHarnessIsOpen`, so the harness
 * has to be opened explicitly to walk them:
 *
 *   NEXT_DIST_DIR=.next-nav VALLO_PREVIEW_HARNESS=1 npx next build
 *   NEXT_DIST_DIR=.next-nav VALLO_PREVIEW_HARNESS=1 npx next start -p 3377
 */
import { chromium } from "playwright-core";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const BASE = process.env.PROOF_BASE ?? "http://127.0.0.1:3377";
const OUT = process.env.PROOF_OUT ?? join(REPO, "docs/design/proofs/nav");

/* ------------------------------------------------------------------ the map
 *
 * Read out of the source rather than restated here. A walk holding its own
 * copy of the hierarchy is a walk that can agree with itself while disagreeing
 * with the product, which is the exact failure `route-parents.ts` exists to
 * stop one layer down.
 */
const MAP_FILE = join(REPO, "apps/web/src/lib/nav/route-parents.ts");
function readMap() {
  const src = readFileSync(MAP_FILE, "utf8");
  const map = new Map();
  const re = /^\s*"([^"]+)":\s*(ROOT|"([^"]+)")\s*,/gm;
  let m;
  while ((m = re.exec(src))) map.set(m[1], m[2] === "ROOT" ? null : m[3]);
  if (map.size < 100) throw new Error(`REFUSING: only ${map.size} routes parsed out of route-parents.ts`);
  return map;
}
const ROUTE_PARENTS = readMap();

/** `/docs/[slug]` + `/docs/listings` -> the parent with its segments filled. */
function expectedParent(pattern, url) {
  const parent = ROUTE_PARENTS.get(pattern);
  if (parent === undefined) throw new Error(`REFUSING: "${pattern}" is not in route-parents.ts`);
  if (parent === null) return null;
  const want = pattern.slice(1).split("/");
  const have = url.split("?")[0].slice(1).split("/");
  const params = {};
  want.forEach((seg, i) => {
    const d = /^\[(.+)\]$/.exec(seg);
    if (d) params[d[1]] = have[i];
  });
  return (
    "/" +
    parent
      .slice(1)
      .split("/")
      .map((seg) => {
        const d = /^\[(.+)\]$/.exec(seg);
        if (!d) return seg;
        const v = params[d[1]];
        if (v === undefined) throw new Error(`REFUSING: parent "${parent}" needs [${d[1]}]`);
        return v;
      })
      .join("/")
  );
}

/* ------------------------------------------------------------- the subjects
 *
 * The twenty-two routes that declared a parent and drew nothing, each with a
 * concrete URL. `gated` marks the ones the proxy sends a signed-out visitor
 * away from, which are walked against the keyless build (see the report).
 */
const SUBJECTS = [
  { pattern: "/about", url: "/about" },
  { pattern: "/cancellations", url: "/cancellations" },
  { pattern: "/careers", url: "/careers" },
  { pattern: "/contact", url: "/contact" },
  { pattern: "/delete-account", url: "/delete-account" },
  { pattern: "/docs", url: "/docs" },
  { pattern: "/docs/[slug]", url: "/docs/what-vallo-is" },
  { pattern: "/eula", url: "/eula" },
  { pattern: "/help", url: "/help" },
  { pattern: "/privacy", url: "/privacy" },
  { pattern: "/safety", url: "/safety" },
  { pattern: "/standards", url: "/standards" },
  { pattern: "/styleguide", url: "/styleguide", gated: true },
  { pattern: "/terms", url: "/terms" },
  { pattern: "/search", url: "/search" },
  { pattern: "/around", url: "/around" },
  { pattern: "/settings", url: "/settings", gated: true },
  { pattern: "/preview", url: "/preview" },
  { pattern: "/gallery", url: "/gallery" },
  { pattern: "/offline", url: "/offline" },
  { pattern: "/crypto", url: "/crypto" },
  { pattern: "/crypto/[id]", url: "/crypto/btc" },
];

/**
 * SURVEY MODE: every static route in the map, not just the twenty-two.
 *
 * `PROOF_SURVEY=1` replaces the subject list with every non-root pattern that
 * carries no dynamic segment, which is 110 of the 140. It is how the gap list
 * itself was checked: the static import-graph read that produced the list
 * over-credits any page whose back control lives in a branch (`/around` reaches
 * `PageHeader` through the social kill-switch notice and draws nothing), so the
 * list is only trustworthy once a browser has been down all of it.
 *
 * Dynamic routes are left out on purpose rather than walked with invented ids:
 * a made-up `[id]` 404s, and a 404 counted as "no control" would put good
 * routes on the gap list, which is the same class of lie in the other
 * direction.
 */
const SURVEY = [...ROUTE_PARENTS.entries()]
  .filter(([pattern, parent]) => parent !== null && !pattern.includes("["))
  .map(([pattern]) => ({ pattern, url: pattern }));

const BACK = "[data-nav-back]";

/* The flags are not decoration: headless Chromium silently DROPS
   `backdrop-filter` without them, and every control here is drawn on glass. */
const browser = await chromium.launch({
  executablePath: process.env.PROOF_CHROMIUM ?? "/opt/pw-browsers/chromium",
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
});

const path = (u) => {
  const p = new URL(u).pathname.replace(/\/+$/, "");
  return p === "" ? "/" : p;
};

/**
 * Everything that can be known about a loaded page WITHOUT clicking anything.
 *
 * Split out from the navigation so `selfTest` can run it against a page it has
 * deliberately emptied, which is the only way to prove the blank guard fires.
 */
async function inspect(page) {
  return page.evaluate((sel) => {
    const notFound = document.querySelectorAll("[data-nf-not-found]").length > 0;

    /* HOW MUCH DID THIS PAGE ACTUALLY RENDER, MEASURED HONESTLY.
     *
     * Both obvious measures lie here, and the first version of this script used
     * one of them. `innerText` needs layout and reports 29 characters for the
     * Around feed, whose content is real and below the fold - so a working page
     * read as blank. `textContent` counts the RSC flight payload sitting in
     * `<script>` tags, which is a hundred kilobytes on every route - so a page
     * that rendered nothing at all reads as full.
     *
     * The measure is therefore the body with the script, style and template
     * nodes taken out, on a clone so the live page is untouched. That is the
     * text a person would have in front of them. */
    const clone = document.body.cloneNode(true);
    for (const node of clone.querySelectorAll("script, style, template, noscript")) node.remove();
    const text = (clone.textContent ?? "").trim();
    const elements = clone.querySelectorAll("*").length;
    /* A page with a header, a footer and nothing between them is not blank, so
       the floor is deliberately low and the check is for a page that rendered
       essentially nothing at all. */
    const blank = text.length < 40 && elements < 15;
    const controls = [...document.querySelectorAll(sel)];
    const first = controls[0] ?? null;
    const box = first?.getBoundingClientRect() ?? null;
    return {
      notFound,
      blank,
      textLength: text.length,
      elements,
      controlCount: controls.length,
      controlLabel: first?.getAttribute("aria-label") ?? null,
      /* A control with no box is a control nobody can press, and it would
         otherwise read exactly like one that is there. */
      controlDrawn: Boolean(box && box.width > 0 && box.height > 0),
      controlBox: box ? { w: Math.round(box.width), h: Math.round(box.height) } : null,
    };
  }, BACK);
}

/**
 * Wait for the control to be HYDRATED, not merely present in the markup.
 *
 * This replaced `waitUntil: "networkidle"`, and the replacement is a
 * correctness fix rather than a speed one. Half this product's screens never go
 * network idle - an aurora, a live counter, a map tile - so the first run of
 * this script reported eighteen routes UNREACHABLE on a sixty-second timeout
 * while the pages themselves were fine. An instrument that calls a working page
 * unreachable is the same class of fault as one that calls a blank page a
 * missing control.
 *
 * A React fiber key on the element is the honest signal: it is present only
 * once React has claimed that DOM node, which is exactly the moment the click
 * handler starts working. Server-rendered markup with no fiber is a button
 * nobody can press yet, and clicking it would report "the URL never changed",
 * which would be a lie about the control.
 *
 * An element that never appears is not an error here: the row is then
 * `drawn: false`, which is the finding this whole walk is looking for.
 */
async function waitForHydration(page) {
  try {
    await page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel);
        if (!el) return true;
        return Object.keys(el).some((key) => key.startsWith("__react"));
      },
      BACK,
      { timeout: 20_000 },
    );
    return null;
  } catch {
    return "the control was in the markup but never hydrated";
  }
}

/** Load a URL and apply the four guards. Returns `{ ok: false, refused }` or the facts. */
async function load(page, url) {
  let response;
  let lastError = null;
  /* Two attempts, because a single aborted navigation against a server that is
     also serving another worker is a fact about the machine and not about the
     route. The first run of this script wrote `/preview` down as unreachable on
     one such abort, and `/preview` is fine. A route that fails twice is
     reported; a route that fails once is retried, and the retry is visible in
     the note rather than hidden. */
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      response = await page.goto(`${BASE}${url}`, { waitUntil: "load", timeout: 45_000 });
      lastError = null;
      /* A status of 0 is Chromium saying it never got a response object at all,
         which on a box running six workers' servers is a dropped connection
         rather than a fact about the route. Retried like a throw; a route that
         answers 0 three times is reported. */
      if ((response?.status() ?? 0) !== 0) break;
    } catch (error) {
      lastError = error;
      response = undefined;
    }
    await page.waitForTimeout(1000);
  }
  if (lastError) {
    return { ok: false, refused: `navigation threw: ${String(lastError).split("\n")[0].slice(0, 120)}` };
  }
  const status = response?.status() ?? 0;
  if (status < 200 || status >= 300) return { ok: false, refused: `server answered ${status}`, status };

  const unhydrated = await waitForHydration(page);
  /* A FIFTH GUARD, PAID FOR MID-RUN. Rebuilding into the dist directory the
     running server was serving from made every static chunk answer 500, so no
     JavaScript loaded at all: the back control was still in the server-rendered
     markup, still 20px by 20px, and completely dead. Without this the row would
     have read "drawn" and then "the URL never changed", which points the finger
     at the control instead of at a server with no scripts. An unhydrated
     control is a refusal, not a result. */
  /* One settle after hydration. React commits the client tree in a frame after
     the fiber keys appear, and `/crypto` and `/preview` both swap in the
     not-found body at that commit: inspected a frame too early they read as a
     page with no back control, which is a completely different finding from
     "this route is a 404". */
  await page.waitForTimeout(700);

  /* WHERE THE BROWSER SETTLED, TAKEN AFTER THE SETTLE AND NOT BEFORE.
   *
   * This check used to run the instant `goto` resolved, and it was blind to
   * exactly the redirects it exists to catch. `/messages/new` with no listing
   * in the query, and `/around/manage`, both redirect CLIENT SIDE: `page.url()`
   * still reads the route you asked for when `load` fires, and a second later
   * it is somewhere else. The walk therefore inspected `/messages` and wrote
   * the row down under `/messages/new`, then called a perfectly correct control
   * a MISMATCH because `/messages`'s parent is `/home` and `/messages/new`'s is
   * `/messages`. That is the same defect as `verify-shots.mjs` writing five
   * PNGs of the sign-in screen under five other route names, one layer in. */
  const landed = path(page.url());
  if (landed !== url.split("?")[0]) {
    return { ok: false, refused: `redirected to ${landed}`, status, landed };
  }

  const facts = await inspect(page);
  if (unhydrated && facts.controlCount > 0) {
    return { ok: false, refused: unhydrated, status, landed, ...facts };
  }
  if (facts.notFound) return { ok: false, refused: "not-found body served at 200", status, landed, ...facts };
  if (facts.blank) {
    return {
      ok: false,
      refused: `page rendered blank (${facts.textLength} chars, ${facts.elements} elements)`,
      status,
      landed,
      ...facts,
    };
  }
  return { ok: true, status, landed, ...facts };
}

/** Press the control and report where the browser ended up. */
async function press(page) {
  const before = path(page.url());
  const control = page.locator(BACK).first();
  try {
    await control.click({ timeout: 10_000 });
  } catch (error) {
    return { landedAfter: before, note: `click failed: ${String(error).slice(0, 100)}` };
  }
  /* A client-side push does not fire a load event, so the URL is polled rather
     than waited on, and a control that does nothing is reported as landing
     where it started rather than as a timeout. */
  try {
    await page.waitForFunction(
      (from) => (location.pathname.replace(/\/+$/, "") || "/") !== from,
      before,
      { timeout: 10_000 },
    );
  } catch {
    return { landedAfter: before, note: "the URL never changed" };
  }
  await page.waitForLoadState("load", { timeout: 30_000 }).catch(() => {});
  return { landedAfter: path(page.url()), note: null };
}

/* ------------------------------------------------------------- the self test */
async function selfTest(page) {
  const problems = [];

  /* 1. A declared ROOT draws nothing. If this finds a control, the selector is
        matching something other than the back control and every pass below is
        worthless. */
  const root = await load(page, "/");
  if (!root.ok) problems.push(`the landing page did not load: ${root.refused}`);
  else if (root.controlCount !== 0) problems.push(`"/" is a declared ROOT and drew ${root.controlCount} back control(s)`);

  /* 2. A route nobody has written must be refused, not reported. */
  const nowhere = await load(page, "/this-route-has-never-existed");
  if (nowhere.ok) problems.push("a nonexistent route loaded cleanly, so the not-found guard is blind");

  /* 3. The blank guard must fire on a page that rendered nothing. */
  const real = await load(page, "/about");
  if (!real.ok) problems.push(`/about did not load for the blank check: ${real.refused}`);
  else {
    await page.evaluate(() => {
      document.body.innerHTML = "";
    });
    const emptied = await inspect(page);
    if (!emptied.blank) problems.push("an emptied page was not reported blank, so a blank page would read as a missing control");
    if (emptied.controlCount !== 0) problems.push("an emptied page still reported a control");
  }

  /* 4. Pressing a control on a known-good route really moves the URL. */
  const known = await load(page, "/about");
  if (known.ok && known.controlCount > 0) {
    const moved = await press(page);
    if (moved.landedAfter === "/about") problems.push(`the control on /about did not move the URL (${moved.note ?? "no note"})`);
  } else {
    problems.push("/about has no back control, so the press path could not be proved at all");
  }

  return problems;
}

/* ------------------------------------------------------------------ the walk */
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  colorScheme: "dark",
});

const problems = await selfTest(page);
if (problems.length > 0) {
  console.error("THE INSTRUMENT FAILED ITS OWN TEST. Nothing below would mean anything.\n");
  for (const p of problems) console.error("  - " + p);
  await browser.close();
  process.exit(1);
}
console.log("self test: passed (root draws none, not-found refuses, blank is reported, a press moves the URL)\n");

const SURVEYING = process.env.PROOF_SURVEY === "1";
const WORK = SURVEYING ? SURVEY : SUBJECTS;
console.log(`walking ${WORK.length} route(s)${SURVEYING ? " (survey: every static declared route)" : ""}\n`);

const say = (line) => { process.stderr.write(line + "\n"); };

const rows = [];
for (const subject of WORK) {
  const want = expectedParent(subject.pattern, subject.url);
  const row = { ...subject, declaredParent: want };

  /* ---- COLD: opened directly, so there is no history behind. `chooseBack`
     must PUSH the declared parent; this is the deep-link case. */
  const cold = await load(page, subject.url);
  row.reachable = cold.ok;
  if (!cold.ok) {
    row.refused = cold.refused;
    rows.push(row);
    say(`${subject.url.padEnd(20)} UNREACHABLE: ${String(cold.refused).split("\n")[0]}`);
    continue;
  }
  row.drawn = cold.controlCount > 0 && cold.controlDrawn;
  row.controlCount = cold.controlCount;
  row.controlLabel = cold.controlLabel;
  row.controlBox = cold.controlBox;
  if (!row.drawn) {
    row.coldLanded = null;
    rows.push(row);
    say(`${subject.url.padEnd(20)} NO CONTROL DRAWN (${cold.controlCount} matched, box ${JSON.stringify(cold.controlBox)})`);
    continue;
  }
  /* A photograph of the control in place, when asked for. The walk's job is
     the destination, not the look, but a control that lands correctly and sits
     on top of the title is still wrong, and that is not something a landed path
     can show. `PROOF_SHOTS=1`. */
  if (process.env.PROOF_SHOTS === "1") {
    const shot = join(OUT, "shots", `${subject.url.replace(/\//g, "_") || "_root"}.png`);
    mkdirSync(join(OUT, "shots"), { recursive: true });
    await page.screenshot({ path: shot, clip: { x: 0, y: 0, width: 390, height: 420 } }).catch(() => {});
    row.shot = shot.replace(REPO + "/", "");
  }

  const coldPress = await press(page);
  row.coldLanded = coldPress.landedAfter;
  row.coldNote = coldPress.note;

  /* ---- WARM: the parent, then the child, so the entry behind really IS the
     parent. `chooseBack` should now take history, which is what restores a
     filtered hunt's scroll position. Either way it must land on the parent. */
  if (want && !SURVEYING) {
    const parentLoad = await load(page, want);
    if (parentLoad.ok) {
      const childLoad = await load(page, subject.url);
      if (childLoad.ok && childLoad.controlCount > 0) {
        const warmPress = await press(page);
        row.warmLanded = warmPress.landedAfter;
        row.warmNote = warmPress.note;
      } else {
        row.warmLanded = null;
        row.warmNote = childLoad.ok ? "no control on the second load" : childLoad.refused;
      }
    } else {
      row.warmLanded = null;
      row.warmNote = `parent ${want} did not load: ${parentLoad.refused}`;
    }
  }

  row.coldCorrect = row.coldLanded === want;
  row.warmCorrect = SURVEYING ? true : row.warmLanded === want;
  rows.push(row);
  say(
    `${subject.url.padEnd(20)} drawn  cold->${String(row.coldLanded).padEnd(14)} warm->${String(row.warmLanded).padEnd(14)} want ${want} ${row.coldCorrect && row.warmCorrect ? "OK" : "MISMATCH"}`,
  );
}

await browser.close();

mkdirSync(OUT, { recursive: true });
const when = new Date().toISOString();
const stem = SURVEYING ? "survey" : "walk";
writeFileSync(join(OUT, `${stem}.json`), JSON.stringify({ base: BASE, when, surveying: SURVEYING, rows }, null, 2));

const lines = [
  "| route | reachable | control drawn | cold press lands | warm press lands | declared parent | verdict |",
  "|---|---|---|---|---|---|---|",
];
for (const r of rows) {
  const verdict = !r.reachable
    ? `NOT REACHED: ${r.refused}`
    : !r.drawn
      ? "NO CONTROL"
      : r.coldCorrect && r.warmCorrect
        ? "correct"
        : "WRONG DESTINATION";
  lines.push(
    `| \`${r.url}\` | ${r.reachable ? "yes" : "no"} | ${r.reachable ? (r.drawn ? "yes" : "NO") : "-"} | ${r.coldLanded ?? "-"} | ${r.warmLanded ?? "-"} | ${r.declaredParent ?? "ROOT"} | ${verdict} |`,
  );
}
writeFileSync(join(OUT, `${stem}.md`), lines.join("\n") + "\n");

const walked = rows.filter((r) => r.reachable);
const good = walked.filter((r) => r.drawn && r.coldCorrect && r.warmCorrect);
console.log(`\n${good.length}/${rows.length} correct; ${rows.length - walked.length} not reached.`);
console.log(`written: ${join(OUT, `${stem}.md`)}`);
