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
 *   settled      and this one was paid for by the instrument contradicting
 *                itself. The same URL, the same server, ten minutes apart,
 *                answered "not-found body served at 200" once and "no control
 *                drawn" the other time, because a fixed settle is a guess about
 *                a React commit. A row is now read TWICE and refused unless the
 *                two reads agree about the not-found body and about whether a
 *                control is drawn.
 *   asked        the control's OWN answer, taken off the requests it made,
 *                separately from where the browser came to rest. `/escrow`
 *                pushes `/wallet` and a signed-out visitor is gated onto
 *                `/sign-in`: the control is right and the row read MISMATCH
 *                until this column existed. A wrong destination and a correct
 *                destination behind a gate are opposite findings with different
 *                owners.
 *
 * Every one of these can turn a row into REFUSED, and a refused row is never
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
  const whole = readFileSync(MAP_FILE, "utf8");
  /* ONLY THE HIERARCHY OBJECT, AND THIS COST A RUN.
   *
   * The regex below matches `"key": "value",` and that shape now appears twice
   * more in the file: `NON_NAVIGABLE`, which names every route handler with the
   * reason it can never carry a back control, and `LITERAL_EXPANSIONS`. Read
   * whole, the survey walked twenty eight API handlers as if they were screens,
   * with an English sentence in the "declared parent" column, and reported
   * `/api/push/key` as a route with no back control. It is JSON.
   *
   * So the source is cut to the `ROUTE_PARENTS` literal first. The floor below
   * is what catches a cut that took too much. */
  const from = whole.indexOf("export const ROUTE_PARENTS");
  if (from === -1) throw new Error("REFUSING: ROUTE_PARENTS not found in route-parents.ts");
  const to = whole.indexOf("\n};", from);
  if (to === -1) throw new Error("REFUSING: could not find the end of the ROUTE_PARENTS literal");
  const src = whole.slice(from, to);
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

/**
 * THE ROUTES THE SECOND PASS DECLARED, AND THE ONES IT RE-POINTED.
 *
 * `PROOF_SET=added`. Every one of these answered `no-parent-declared` this
 * morning, or named a parent that was not a screen. Some of them are behind
 * the signed-out gate and this walk cannot reach them; those rows come back
 * REFUSED with the redirect that refused them, which is the point. A gated
 * route shown as a green row would be the same lie as a blank page shown as a
 * missing control.
 */
const ADDED = [
  { pattern: "/escrow", url: "/escrow" },
  /* A well-formed id with no row behind it. `readHeldPayment` returns nothing
     under RLS and the page answers not-found, which the third guard catches.
     Walked anyway so the refusal is on the record rather than the route being
     quietly left out. */
  { pattern: "/escrow/[id]", url: "/escrow/2f1d4c6e-0000-4000-8000-000000000001" },
  { pattern: "/price", url: "/price" },
  { pattern: "/price/area/[id]", url: "/price/area/2f1d4c6e-0000-4000-8000-000000000002" },
  /* The door. These three named `/start`, which is a 307 and not a screen. */
  { pattern: "/sign-in", url: "/sign-in" },
  { pattern: "/sign-up", url: "/sign-up" },
  { pattern: "/auth/callback", url: "/auth/callback" },
  /* The six console desks nobody had declared. Gated: the proxy sends a
     signed-out visitor to `/sign-in` before the page runs, so these are
     expected to refuse here and are R16 to the session that owns them. */
  { pattern: "/admin/analytics", url: "/admin/analytics" },
  { pattern: "/admin/operations", url: "/admin/operations" },
  { pattern: "/admin/queue", url: "/admin/queue" },
  { pattern: "/admin/settings", url: "/admin/settings" },
  { pattern: "/admin/supply", url: "/admin/supply" },
  { pattern: "/admin/listings/[id]", url: "/admin/listings/ed000000-0000-4000-8000-000000000001" },
  /* The four decks with no index page. Before this pass each of these had a
     back control pointing at `/preview/<deck>`, which answers not-found. */
  { pattern: "/preview/b1b/[screen]", url: "/preview/b1b/chooser" },
  { pattern: "/preview/c1/[screen]", url: "/preview/c1/listing-review" },
  { pattern: "/preview/imgc/[screen]", url: "/preview/imgc/hotel" },
  { pattern: "/preview/session-b/[screen]", url: "/preview/session-b/profile" },
  { pattern: "/preview/session-b/admin/[screen]", url: "/preview/session-b/admin/overview" },
  { pattern: "/preview/session-b/admin-money/[screen]", url: "/preview/session-b/admin-money/money" },
  { pattern: "/preview/session-b/admin-review/[desk]", url: "/preview/session-b/admin-review/kyc" },
  /* THE CONTROL ROW. A deck that DOES have an index page must still go up to
     its own folder. Without this the seven above would prove only that
     `/preview` is reachable, not that the rule discriminates. */
  { pattern: "/preview/[deck]/[screen]/[variant]", url: "/preview/f3/listing/sale" },
  { pattern: "/preview/[deck]/[screen]", url: "/preview/f3/listing" },
];

/**
 * THE DYNAMIC ROUTES THE FIRST SURVEY COULD NOT REACH.
 *
 * `PROOF_SET=dynamic`. The first survey walked 110 STATIC declared routes and
 * left every `[segment]` out, on the correct ground that an invented id 404s
 * and a 404 counted as "no control" puts good routes on the gap list. The
 * answer is not to invent an id: it is to use a REAL one. Every id below was
 * read out of the live database with a SELECT, and the two that have no row
 * anywhere are marked so rather than fabricated.
 *
 * `/u/nobody-holds-this` is deliberately a handle nobody holds. That page
 * answers for every handle whether it is taken or not, by its own docstring,
 * so an unclaimed one is a real rendering of the route and avoids putting a
 * person's address into a proof file.
 */
const DYNAMIC = [
  { pattern: "/listing/[id]", url: "/listing/ed000000-0000-4000-8000-000000000001" },
  { pattern: "/stay/[id]", url: "/stay/ea000000-0000-4000-8000-000000000001" },
  { pattern: "/restaurant/[id]", url: "/restaurant/eb000000-0000-4000-8000-000000000006" },
  { pattern: "/docs/[slug]", url: "/docs/what-vallo-is" },
  { pattern: "/around/[slug]", url: "/around/yaba-unilag" },
  { pattern: "/post/[id]", url: "/post/7675fef6-11e0-486a-aff2-c61803b051ec" },
  { pattern: "/u/[handle]", url: "/u/nobody-holds-this" },
  { pattern: "/u/[handle]/followers", url: "/u/nobody-holds-this/followers" },
  { pattern: "/u/[handle]/following", url: "/u/nobody-holds-this/following" },
  { pattern: "/u/[handle]/edit", url: "/u/nobody-holds-this/edit" },
  { pattern: "/crypto/[id]", url: "/crypto/btc" },
  { pattern: "/rent/move-in/[listingId]", url: "/rent/move-in/ed000000-0000-4000-8000-000000000001" },
  { pattern: "/rent/pay/[inspectionId]", url: "/rent/pay/2f1d4c6e-0000-4000-8000-000000000003" },
  { pattern: "/profile/setup/[role]", url: "/profile/setup/agent" },
  { pattern: "/preview/[deck]/[screen]", url: "/preview/f5/agent-dashboard" },
  /* Signed-in only, every one of them. Walked so the refusal is recorded with
     the redirect that produced it. */
  { pattern: "/messages/[id]", url: "/messages/2f1d4c6e-0000-4000-8000-000000000004" },
  { pattern: "/messages/share/listing/[id]", url: "/messages/share/listing/ed000000-0000-4000-8000-000000000001" },
  { pattern: "/bookings/[bookingId]", url: "/bookings/2f1d4c6e-0000-4000-8000-000000000005" },
  { pattern: "/bookings/[bookingId]/review", url: "/bookings/2f1d4c6e-0000-4000-8000-000000000005/review" },
  { pattern: "/wallet/transactions/[id]", url: "/wallet/transactions/2f1d4c6e-0000-4000-8000-000000000006" },
  { pattern: "/checkout/[bookingId]", url: "/checkout/2f1d4c6e-0000-4000-8000-000000000005" },
  { pattern: "/agent/listings/[listingId]/calendar", url: "/agent/listings/ed000000-0000-4000-8000-000000000001/calendar" },
];

/**
 * THE FOUR THE FIRST PASS NAMED AS UNREACHABLE, ASKED AGAIN.
 *
 * `PROOF_SET=gated`. `/inspections`, `/checkout`, `/assistant` and
 * `/verification` were reported as drawing their control only behind a
 * signed-in branch. Three of them sit on a gated first segment and the fourth
 * does not, which is a distinction the first pass could not make because it
 * ran against a build with no platform keys at all, where the gate never runs.
 */
const GATED = [
  { pattern: "/inspections", url: "/inspections" },
  { pattern: "/checkout", url: "/checkout" },
  { pattern: "/assistant", url: "/assistant" },
  { pattern: "/verification", url: "/verification" },
  { pattern: "/settings", url: "/settings" },
  { pattern: "/styleguide", url: "/styleguide" },
];

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
         which on a box running several servers at once is a dropped connection
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

  /* A SIXTH GUARD, AND THE FIRST FIVE WERE WHAT FOUND IT.
   *
   * `/crypto/btc` was walked twice in one session, against one server, ten
   * minutes apart, and answered "not-found body served at 200" once and "no
   * control drawn" the other time. Both readings came out of this instrument
   * and they are opposite findings: one says the route is a 404, one says the
   * route is a page missing its way back. A fixed 700ms settle is a guess about
   * a React commit, and a guess that is usually right is exactly the shape of
   * thing that hides the times it is wrong.
   *
   * So the page is read TWICE and the two readings must agree about the two
   * facts a verdict rests on: whether the not-found body is up, and whether a
   * control is drawn. A third read breaks a tie. A page that never settles is
   * REFUSED rather than reported, because an unstable page has no answer and
   * printing one of its two answers is choosing at random. */
  const same = (a, b) => a.notFound === b.notFound && a.controlCount > 0 === (b.controlCount > 0);
  let facts = await inspect(page);
  let second = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.waitForTimeout(600);
    second = await inspect(page);
    if (same(facts, second)) break;
    facts = second;
    second = null;
  }
  if (second === null) {
    return {
      ok: false,
      refused: "the page never settled: two reads 600ms apart disagreed about the not-found body or the control",
      status,
      landed,
      ...facts,
    };
  }
  facts = second;
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

/**
 * Press the control and report where the browser ended up, AND EVERY PLACE IT
 * WENT THROUGH ON THE WAY.
 *
 * THE FINAL URL IS NOT THE CONTROL'S ANSWER. `/escrow` declares `/wallet`, and
 * `wallet` is a gated segment, so a signed-out press lands on `/sign-in`: the
 * control did exactly the right thing and the row read MISMATCH. Reporting
 * only where the browser settled cannot tell a wrong destination from a
 * correct destination behind a gate, and those are opposite findings with
 * opposite owners - one is `route-parents.ts` and one is `proxy.ts`.
 *
 * So the main frame's committed navigations are collected, same-document
 * pushes included, and the row carries the whole trail. `asked` is the first
 * place the control went, which IS the control's answer; `landedAfter` is
 * where the browser came to rest, which is the person's experience. Both are
 * written down and neither is allowed to stand in for the other.
 */
async function press(page) {
  const before = path(page.url());
  const trail = [];
  const onNav = (frame) => {
    if (frame !== page.mainFrame()) return;
    const at = path(frame.url());
    if (trail[trail.length - 1] !== at) trail.push(at);
  };

  /* WHAT THE CONTROL ASKED FOR CANNOT BE READ OFF `framenavigated`, AND THIS
     WAS MEASURED RATHER THAN ASSUMED. The first version of this collected
     committed navigations, and on `/escrow` it reported `asked: /sign-in`. The
     App Router fetches the parent as an RSC payload first; the proxy answers
     that fetch with a 307, and the browser only ever COMMITS to `/sign-in`. It
     never commits to `/wallet`, so a walk watching commits cannot see the
     destination the control chose, which is the one thing this field exists to
     report.
     The REQUEST is where the choice is visible. Everything the page fetches
     after the click is recorded, minus the static chunks and the assets, and
     the first same-origin path that is not where we started is what the control
     asked for. */
  const requested = [];
  const ORIGIN = new URL(BASE).origin;
  const onRequest = (request) => {
    let at;
    try {
      const url = new URL(request.url());
      if (url.origin !== ORIGIN) return;
      at = path(request.url());
    } catch {
      return;
    }
    if (at.startsWith("/_next/") || at.startsWith("/api/") || /\.[a-z0-9]+$/i.test(at)) return;
    /* A PREFETCH IS NOT A DESTINATION. The App Router fetches the RSC payload
       of any link that scrolls into view, and one of those arriving inside the
       press window would be read as the place the control chose. Next marks
       them with `Next-Router-Prefetch`, so they are dropped by name rather
       than by timing. */
    const headers = request.headers();
    if (headers["next-router-prefetch"] || headers["purpose"] === "prefetch") return;
    if (requested[requested.length - 1] !== at) requested.push(at);
  };

  page.on("framenavigated", onNav);
  page.on("request", onRequest);
  const finish = (result) => {
    page.off("framenavigated", onNav);
    page.off("request", onRequest);
    const after = trail.filter((at) => at !== before);
    const asked = requested.filter((at) => at !== before);
    return { ...result, trail: after, requested: asked, asked: asked[0] ?? after[0] ?? null };
  };
  const control = page.locator(BACK).first();
  try {
    await control.click({ timeout: 10_000 });
  } catch (error) {
    return finish({ landedAfter: before, note: `click failed: ${String(error).slice(0, 100)}` });
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
    return finish({ landedAfter: before, note: "the URL never changed" });
  }
  /* One settle, so a gate's redirect is part of the trail rather than arriving
     after the row was written. Without it `/escrow` would read as landing on
     `/wallet` and the gate would be invisible, which is the failure in the
     other direction. */
  await page.waitForLoadState("load", { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(700);
  return finish({ landedAfter: path(page.url()), note: null });
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
    /* 5. AND THE TRAIL SAW IT. `asked` is how this walk tells a wrong
          destination from a correct one behind a gate, and it is read off
          `framenavigated`, which is a Chromium behaviour and not a promise. If
          same-document pushes did not raise it, `asked` would be null on every
          row, `gatedParent` would be false on every row, and every gated
          parent would be reported as a WRONG DESTINATION with complete
          confidence. `/about` pushes `/` and the trail must say so. */
    if (moved.asked !== "/") {
      problems.push(
        `the press on /about landed on ${moved.landedAfter} but the trail read ${JSON.stringify(moved.trail)}: ` +
          "a client-side push is not being observed, so the 'control asked for' column would be blind",
      );
    }
  } else {
    problems.push("/about has no back control, so the press path could not be proved at all");
  }

  return problems;
}

/* ------------------------------------------------------------------ the walk */
/**
 * A DEVICE THAT HAS BEEN OPENED BEFORE, WHICH IS EVERY DEVICE BUT ONCE.
 *
 * `PROOF_FIRST_RUN_SEEN=1` sets `vallo_first_run=seen`, the one first-party
 * cookie `components/app/welcome/first-run-seen.ts` writes, whose value is the
 * word `seen` and which identifies nobody.
 *
 * Without it `/sign-in` cannot be walked at all: a browser with no cookies is
 * forwarded to `/welcome?next=/sign-in` before the page runs, so the row comes
 * back REFUSED with the redirect rather than with anything about the door. A
 * fresh Chromium context is a first launch, and a first launch is the ONE state
 * this screen is not usually in. Off by default, because a walk that quietly
 * arranged its own conditions is a walk nobody can read.
 */
const CONTEXT_COOKIES =
  process.env.PROOF_FIRST_RUN_SEEN === "1"
    ? [{ name: "vallo_first_run", value: "seen", url: BASE }]
    : [];

const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  colorScheme: "dark",
});
if (CONTEXT_COOKIES.length > 0) {
  await context.addCookies(CONTEXT_COOKIES);
  console.log("context: first run already seen on this device\n");
}
const page = await context.newPage();

const problems = await selfTest(page);
if (problems.length > 0) {
  console.error("THE INSTRUMENT FAILED ITS OWN TEST. Nothing below would mean anything.\n");
  for (const p of problems) console.error("  - " + p);
  await browser.close();
  process.exit(1);
}
console.log("self test: passed (root draws none, not-found refuses, blank is reported, a press moves the URL)\n");

const SURVEYING = process.env.PROOF_SURVEY === "1";
/* `PROOF_SET` picks a subject list. It never changes a guard, a press or a
   verdict: the same instrument walks every list, which is the whole reason
   there is one instrument. */
const SETS = { added: ADDED, dynamic: DYNAMIC, gated: GATED, subjects: SUBJECTS };
const SET_NAME = process.env.PROOF_SET ?? "";
if (SET_NAME && !SETS[SET_NAME]) {
  console.error(`REFUSING: PROOF_SET="${SET_NAME}" is not one of ${Object.keys(SETS).join(", ")}`);
  await browser.close();
  process.exit(1);
}
const WORK = SURVEYING ? SURVEY : (SETS[SET_NAME] ?? SUBJECTS);
console.log(`walking ${WORK.length} route(s)${SURVEYING ? " (survey: every static declared route)" : SET_NAME ? ` (set: ${SET_NAME})` : ""}\n`);

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
  row.coldAsked = coldPress.asked;
  row.coldTrail = coldPress.trail;
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
        row.warmAsked = warmPress.asked;
        row.warmTrail = warmPress.trail;
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
  /* The control's own answer, separately from the browser's resting place. A
     route where these disagree is a route whose parent is behind a gate, and
     the difference is the finding. */
  row.coldAskedCorrect = row.coldAsked === want;
  row.gatedParent = row.coldAskedCorrect && !row.coldCorrect;
  rows.push(row);
  say(
    `${subject.url.padEnd(20)} drawn  asked->${String(row.coldAsked).padEnd(14)} cold->${String(row.coldLanded).padEnd(14)} warm->${String(row.warmLanded).padEnd(14)} want ${want} ${
      row.coldCorrect && row.warmCorrect
        ? "OK"
        : row.gatedParent
          ? "CORRECT PUSH, GATED PARENT"
          : "MISMATCH"
    }`,
  );
}

await browser.close();

mkdirSync(OUT, { recursive: true });
const when = new Date().toISOString();
const stem = SURVEYING ? "survey" : SET_NAME ? `walk-${SET_NAME}` : "walk";
writeFileSync(join(OUT, `${stem}.json`), JSON.stringify({ base: BASE, when, set: SET_NAME || null, surveying: SURVEYING, firstRunSeen: CONTEXT_COOKIES.length > 0, rows }, null, 2));

const lines = [
  "| route | reachable | control drawn | control asked for | cold press lands | warm press lands | declared parent | verdict |",
  "|---|---|---|---|---|---|---|---|",
];
for (const r of rows) {
  const verdict = !r.reachable
    ? `NOT REACHED: ${r.refused}`
    : !r.drawn
      ? "NO CONTROL"
      : r.coldCorrect && r.warmCorrect
        ? "correct"
        : r.gatedParent
          ? `control correct, parent gated: settled on ${r.coldLanded}`
          : "WRONG DESTINATION";
  lines.push(
    `| \`${r.url}\` | ${r.reachable ? "yes" : "no"} | ${r.reachable ? (r.drawn ? "yes" : "NO") : "-"} | ${r.coldAsked ?? "-"} | ${r.coldLanded ?? "-"} | ${r.warmLanded ?? "-"} | ${r.declaredParent ?? "ROOT"} | ${verdict} |`,
  );
}
writeFileSync(join(OUT, `${stem}.md`), lines.join("\n") + "\n");

const walked = rows.filter((r) => r.reachable);
const good = walked.filter((r) => r.drawn && r.coldCorrect && r.warmCorrect);
const gated = walked.filter((r) => r.drawn && r.gatedParent);
console.log(
  `\n${good.length}/${rows.length} correct; ${gated.length} pushed the right parent and were gated on arrival; ${rows.length - walked.length} not reached.`,
);
console.log(`written: ${join(OUT, `${stem}.md`)}`);
