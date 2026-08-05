/**
 * What the app remembers between screens.
 *
 * Self-contained: no runner, no config. This is the proof behind the
 * behaviour half of docs/POLISH_PASS.md, items 21 to 26 and item 16:
 *
 *   21  a filtered search survives the back button
 *   22  the scroll position survives coming back from a listing
 *   23  the last chosen view, list or map, is remembered
 *   24  recent searches are offered back as chips
 *   25  recently viewed places are offered back as chips
 *   26  unsave and draft delete offer undo instead of asking a question
 *   16  the date fields open on the upcoming weekend
 *
 * Every one of these is invisible to a redesign, which is why they are proved
 * by driving the real pages rather than by looking at them. Nothing in here
 * asserts a colour, a size or a class name.
 *
 * Run with the server already up:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/session-memory.spec.mjs
 */

import { chromium } from "playwright-core";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const EXECUTABLE_PATH = "/opt/pw-browsers/chromium";
const SETTLE = 1400;

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, "../src");

let failures = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
    if (detail) for (const line of [].concat(detail).slice(0, 12)) console.log(`            ${line}`);
  }
}

/* ------------------------------------------------------------------ static */

const SOCIAL = [
  "lib/social/",
  "components/social/",
  "app/(app)/around/",
  "app/(app)/u/",
  "app/(app)/post/",
  "app/(app)/stories/",
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}
const files = walk(SRC)
  .map((f) => ({ rel: relative(SRC, f).split("\\").join("/"), src: readFileSync(f, "utf8") }))
  .filter((f) => !SOCIAL.some((s) => f.rel.startsWith(s)));

console.log("\nNo back control reads a framework internal");

/*
 * `history.state.idx` was Next's own index into the entries its router pushed.
 * Next 16 does not write it, so `?? 0` made every back control take the
 * fallback branch and throw away whatever the person was in the middle of.
 * It is a private field of somebody else's library and no control may read it.
 */
const readsIdx = [];
for (const f of files) {
  for (const m of f.src.matchAll(/history\.state[^\n]*\bidx\b/g)) {
    readsIdx.push(`${f.rel}:${f.src.slice(0, m.index).split("\n").length}`);
  }
}
check("no control decides back from history.state.idx", readsIdx.length === 0, readsIdx);

/* Every control that goes back must go through the one shared answer. */
const backControls = files.filter((f) => /router\.back\(\)/.test(f.src));
const unshared = backControls.filter((f) => !/canGoBackInApp/.test(f.src));
check(
  "every back control asks canGoBackInApp()",
  unshared.length === 0,
  unshared.map((f) => f.rel),
);
console.log(`            ${backControls.length} back control(s) checked`);

/* A destructive confirm sheet on a draft delete is the thing item 26 removes. */
const workspace = files.find((f) => f.rel === "app/agent/listings/ListingsWorkspace.tsx");
check("the draft-delete confirm sheet is gone", workspace && !/kind: SheetKind[\s\S]{0,200}"delete"/.test(workspace.src));
check(
  "deleting a draft is deferred, not sent straight away",
  workspace && /UNDO_WINDOW_MS/.test(workspace.src) && /setTimeout/.test(workspace.src),
);

/* ----------------------------------------------------------------- runtime */

const browser = await chromium.launch({ executablePath: EXECUTABLE_PATH });

async function freshContext() {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: "dark",
  });
  await ctx.addInitScript(() => {
    try {
      window.localStorage.setItem("nf_theme", "dark");
    } catch {
      /* storage can be unavailable */
    }
  });
  return ctx;
}

const HUNT = "/search?q=Lagos&beds=2&sort=price-asc&verified=1";

try {
  /* --------------------------------------- 21 and 22: back keeps the hunt */
  console.log("\nBack from a listing, 390px");
  {
    const ctx = await freshContext();
    const page = await ctx.newPage();
    await page.goto(BASE_URL + HUNT, { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(SETTLE);

    const countBefore = await page.getAttribute('[data-testid="results-count"]', "data-count");

    /* Scroll to the bottom of whatever the page actually is, then back off a
       little, so the target is real on any catalogue size. */
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    const left = await page.evaluate(() => Math.round(window.scrollY));
    check("the results page is long enough to scroll", left > 100, [`scrollY ${left}`]);

    await page.locator('a[href^="/listing/"]').first().click();
    await page.waitForTimeout(SETTLE + 400);
    check("a listing opened", new URL(page.url()).pathname.startsWith("/listing/"));

    /* The IN-APP back control, not the browser's. This is the one that was
       broken: the browser's own back always worked, which is why nobody saw
       it. */
    const back = page.locator('[aria-label="Back"]').first();
    check("the listing carries an in-app back control", (await back.count()) > 0);
    await back.click();
    await page.waitForTimeout(SETTLE + 600);

    const url = new URL(page.url());
    check(
      "in-app back returns to the search, not to /home",
      url.pathname === "/search",
      [`landed on ${url.pathname}${url.search}`],
    );
    check(
      "every filter came back with it",
      url.searchParams.get("q") === "Lagos" &&
        url.searchParams.get("beds") === "2" &&
        url.searchParams.get("sort") === "price-asc" &&
        url.searchParams.get("verified") === "1",
      [url.search],
    );
    const countAfter = await page.getAttribute('[data-testid="results-count"]', "data-count");
    check("the same results are on screen", countAfter === countBefore, [
      `before ${countBefore}, after ${countAfter}`,
    ]);

    const landed = await page.evaluate(() => Math.round(window.scrollY));
    check(
      "the scroll position came back too",
      Math.abs(landed - left) <= 40,
      [`left at ${left}, returned to ${landed}`],
    );
    await ctx.close();
  }

  /* ------------------------------ 21: a fresh tab still refuses to go back */
  console.log("\nA deep link with nothing behind it");
  {
    const ctx = await freshContext();
    const page = await ctx.newPage();
    await page.goto(BASE_URL + "/wallet", { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(SETTLE);
    const canGoBack = await page.evaluate(() =>
      window.navigation ? window.navigation.canGoBack : null,
    );
    check("the browser agrees there is nothing of ours behind", canGoBack === false, [
      `navigation.canGoBack = ${canGoBack}`,
    ]);
    const back = page.locator('[aria-label="Back"]').first();
    if (await back.count()) {
      await back.click();
      await page.waitForTimeout(SETTLE);
      const path = new URL(page.url()).pathname;
      check("back falls through to the fallback rather than leaving the app", path === "/home", [
        `landed on ${path}`,
      ]);
    } else {
      check("the wallet carries a back control", false);
    }
    await ctx.close();
  }

  /* ------------------------------------------- 23: list or map is remembered */
  console.log("\nThe chosen view");
  {
    const ctx = await freshContext();
    const page = await ctx.newPage();
    await page.goto(BASE_URL + "/search", { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(SETTLE);

    await page.locator('[data-testid="view-map"]').click();
    await page.waitForTimeout(SETTLE);
    check("choosing map writes view=map into the address", page.url().includes("view=map"));

    /* A BARE /search in a new tab of the same session. This is the only case
       the memory exists for. */
    const second = await ctx.newPage();
    await second.goto(BASE_URL + "/search", { waitUntil: "load", timeout: 45000 });
    await second.waitForTimeout(SETTLE);
    const mapRemembered = await second
      .locator('[data-testid="view-map"][aria-current="true"]')
      .count();
    check("a bare /search comes back on the map", mapRemembered > 0);

    /* And switching back must stick, which is what makes the cookie safe: the
       List link states view=list rather than leaving it out as a default. */
    await second.locator('[data-testid="view-list"]').click();
    await second.waitForTimeout(SETTLE);
    check("choosing list states it in the address", second.url().includes("view=list"), [
      second.url(),
    ]);
    const third = await ctx.newPage();
    await third.goto(BASE_URL + "/search", { waitUntil: "load", timeout: 45000 });
    await third.waitForTimeout(SETTLE);
    const listRemembered = await third
      .locator('[data-testid="view-list"][aria-current="true"]')
      .count();
    check("a bare /search now comes back on the list", listRemembered > 0);
    await ctx.close();
  }

  /* -------------------------------------- 24 and 25: recents come back */
  console.log("\nRecent searches and recently viewed");
  {
    const ctx = await freshContext();
    const page = await ctx.newPage();

    /* Nothing to offer on a first visit, and nothing rendered for it. */
    await page.goto(BASE_URL + "/search", { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(SETTLE);
    check(
      "a first visit shows no recents row at all",
      (await page.locator('[data-testid="recent-strip"]').count()) === 0,
    );

    await page.goto(BASE_URL + HUNT, { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(SETTLE);
    await page.goto(BASE_URL + "/search?q=Abuja", { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(SETTLE);

    const chips = page.locator('[data-testid="recent-search"]');
    const chipCount = await chips.count();
    check("earlier hunts are offered back as chips", chipCount >= 1, [`${chipCount} chip(s)`]);
    const labels = await chips.allInnerTexts();
    check(
      "a chip describes the hunt it will re-run",
      labels.some((l) => /Lagos/.test(l) && /beds/.test(l)),
      labels,
    );

    /* Tapping one must land on exactly the hunt it described. */
    const target = chips.filter({ hasText: "Lagos" }).first();
    await target.click();
    await page.waitForTimeout(SETTLE);
    const back = new URL(page.url());
    check(
      "tapping a recent chip re-runs that exact hunt",
      back.pathname === "/search" &&
        back.searchParams.get("q") === "Lagos" &&
        back.searchParams.get("beds") === "2",
      [back.search],
    );

    /* Recently viewed is recorded on the listing, whatever route reached it. */
    await page.goto(BASE_URL + "/listing/seed-1", { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(SETTLE);
    await page.goto(BASE_URL + "/search", { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(SETTLE);
    const viewed = page.locator('[data-testid="recent-listing"]');
    check("a place that was opened is offered back", (await viewed.count()) >= 1);
    const href = await viewed.first().getAttribute("href");
    check("and its chip links to that place", href === "/listing/seed-1", [String(href)]);

    /* Clearing means cleared, and it survives a reload. */
    await page.locator('[data-testid="recent-strip"] button').first().click();
    await page.waitForTimeout(300);
    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(SETTLE);
    check(
      "clearing recent searches sticks",
      (await page.locator('[data-testid="recent-search"]').count()) === 0,
    );
    await ctx.close();
  }

  /* ---------------------------------------------- 26: undo, not a question */
  console.log("\nUnsave offers undo instead of asking");
  {
    const ctx = await freshContext();
    const page = await ctx.newPage();
    await page.goto(BASE_URL + "/listing/seed-1", { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(SETTLE);
    const heart = page.locator('[aria-label="Save this listing"]').first();
    if (await heart.count()) {
      await heart.click();
      await page.waitForTimeout(700);
    }
    await page.goto(BASE_URL + "/saved", { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(SETTLE);

    const savedHeart = page.locator('[data-testid="saved-heart"]').first();
    if ((await savedHeart.count()) > 0) {
      await savedHeart.click();
      await page.waitForTimeout(900);
      check(
        "unsaving asks nothing and offers undo in the card's own slot",
        (await page.locator('[data-testid="undo-chip"]').count()) > 0,
      );
      check(
        "no dialogue was opened to do it",
        (await page.locator('[role="dialog"]').count()) === 0,
      );
    } else {
      /* Saving needs a session the sandbox cannot reach, so this half is
         reported rather than silently skipped. */
      console.log("  ....    no saved card to unsave in this environment, static half stands");
    }
    await ctx.close();
  }

  /* ------------------------------------- 16: the dates open on the weekend */
  console.log("\nThe date fields on arrival");
  {
    const ctx = await freshContext();
    const page = await ctx.newPage();
    await page.goto(BASE_URL + "/listing/seed-1", { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(SETTLE);

    const panel = page.locator('[data-testid="reserve-panel"]').first();
    const checkIn = await panel.locator('input[name="checkIn"]').inputValue();
    const checkOut = await panel.locator('input[name="checkOut"]').inputValue();
    check("check-in opens filled in", /^\d{4}-\d{2}-\d{2}$/.test(checkIn), [checkIn]);
    check("check-out opens filled in", /^\d{4}-\d{2}-\d{2}$/.test(checkOut), [checkOut]);

    const dayOfWeek = (iso) => new Date(`${iso}T12:00:00Z`).getUTCDay();
    check("check-in is a Friday", dayOfWeek(checkIn) === 5, [`${checkIn} is day ${dayOfWeek(checkIn)}`]);
    check("check-out is a Sunday", dayOfWeek(checkOut) === 0, [
      `${checkOut} is day ${dayOfWeek(checkOut)}`,
    ]);
    check(
      "it is in the future, not today",
      Date.parse(`${checkIn}T00:00:00Z`) > Date.now(),
      [checkIn],
    );
    check(
      "which means a total is on screen before the guest touches anything",
      (await panel.getByText(/total/i).count()) > 0,
    );
    check(
      "and the sticky bar quotes the same stay",
      (await page.locator('[data-testid="sticky-total"]').count()) > 0,
    );
    await ctx.close();
  }
} finally {
  await browser.close();
}

console.log("");
if (failures > 0) {
  console.log(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log("All session memory checks passed.");
