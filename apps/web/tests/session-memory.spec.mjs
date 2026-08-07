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
 * Three of the six runtime sections need a listing to exist, as does the
 * recently-viewed half of a fourth, and the catalogue of twenty-three invented
 * places was removed on purpose. On an empty shelf those parts say out loud
 * that they are skipping and why, rather than waiting thirty seconds on a card
 * that is never coming. See tests/_catalogue.mjs. The static scan, the fallback
 * back control, the remembered view and recent searches need nothing on the
 * shelf and are asserted on every run.
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
/*
 * COMMENTS ARE NOT CODE, and this spec learned that the hard way: its first
 * run failed on three files whose only offence was a doc comment explaining
 * the very bug it was checking for. A scan that cannot tell an explanation
 * from an instance punishes documenting the fix, which is exactly backwards.
 * Comments are blanked rather than deleted so line numbers still line up.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, lead) => lead + " ".repeat(m.length - lead.length));
}

const files = walk(SRC)
  .map((f) => ({
    rel: relative(SRC, f).split("\\").join("/"),
    src: readFileSync(f, "utf8"),
    code: stripComments(readFileSync(f, "utf8")),
  }))
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
  for (const m of f.code.matchAll(/history\.state[^\n]*\bidx\b/g)) {
    readsIdx.push(`${f.rel}:${f.code.slice(0, m.index).split("\n").length}`);
  }
}
check("no control decides back from history.state.idx", readsIdx.length === 0, readsIdx);

/* Every control that goes back must go through the one shared answer. */
const backControls = files.filter((f) => /router\.back\(\)/.test(f.code));
const unshared = backControls.filter((f) => !/canGoBackInApp/.test(f.code));
check(
  "every back control asks canGoBackInApp()",
  unshared.length === 0,
  unshared.map((f) => f.rel),
);
console.log(`            ${backControls.length} back control(s) checked`);

/*
 * A destructive confirm sheet on a draft delete is the thing item 26 removes.
 *
 * THIS CHECK USED TO PASS, AND IT WAS LYING.
 *
 * It matched `kind: SheetKind[\s\S]{0,200}"delete"`, which is a window of two
 * hundred characters after one particular declaration. `ListingsWorkspace.tsx`
 * has since grown a long doc comment between `type SheetState = { kind:
 * SheetKind; ... }` and anything mentioning delete, so `"delete"` fell outside
 * the window, the regex stopped matching, and the negation turned that into a
 * green. The sheet had not moved: `type SheetKind = "submit" | "unpublish" |
 * "delete"` is on line 55, an `onAction("delete", listing)` button on line 332,
 * and `ConfirmSheet` still runs the delete branch.
 *
 * So the suite was reporting a destructive dialog as removed while it was fully
 * present, which is worse than either a red or no check at all: a red is a
 * question and a false green is an answer nobody will revisit.
 *
 * It now asserts on the union type itself, which is where the vocabulary is
 * declared and which cannot drift out of a character window. That makes it RED,
 * correctly: item 26 wants undo in place of the dialog, the unsave half is
 * genuinely built (`SavedBoard.tsx`, `data-testid="undo-chip"`), and the draft
 * delete half is not in the code. Fix the product, not this line.
 */
const workspace = files.find((f) => f.rel === "app/agent/listings/ListingsWorkspace.tsx");
check(
  "the draft-delete confirm sheet is gone",
  Boolean(workspace) && !/type SheetKind\s*=[^\n]*"delete"/.test(workspace.src),
);
/*
 * DELIBERATELY REPORTED, NOT WEAKENED.
 *
 * This asserts a deferred delete with an undo window, and neither
 * `UNDO_WINDOW_MS` nor a `setTimeout` exists anywhere in the repository any
 * more: `ListingsWorkspace.run()` calls `deleteListing` inside a transition
 * and closes. So the check is red because the BEHAVIOUR went, not because the
 * spec drifted, and that is the one case where the right move is to leave the
 * red standing.
 *
 * Rewriting it to match what the code does now would launder a lost feature
 * into a passing suite, which is the failure mode every other change in this
 * sweep exists to avoid. Restoring the undo window is a real piece of work on
 * somebody's list; until it is done this stays red and says why.
 */
check(
  "deleting a draft is deferred, not sent straight away",
  workspace && /UNDO_WINDOW_MS/.test(workspace.src) && /setTimeout/.test(workspace.src),
  "UNDO_WINDOW_MS is gone from the repo: the undo window was removed, not renamed",
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
  /*
   * A LABELLED BLOCK so the empty-catalogue guard below can leave this section
   * without leaving the spec. The sections after it do not need a listing and
   * must still run, so `process.exit` here would silence checks that are
   * perfectly capable of answering.
   */
  backFromListing: {
    const ctx = await freshContext();
    const page = await ctx.newPage();
    await page.goto(BASE_URL + HUNT, { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(SETTLE);

    /*
     * NOTHING ON THE SHELF MEANS NOTHING TO COME BACK FROM.
     *
     * The catalogue of twenty-three invented places was removed on purpose, and
     * every check in this block starts by opening one of them: without a result
     * card there is no listing to open, so there is no journey back from it and
     * no scroll position to restore. See tests/_catalogue.mjs. Until this guard
     * existed the spec waited the full thirty seconds for a link that was never
     * going to appear and then died with a stack trace, which reads as a broken
     * suite rather than as an unrun one.
     *
     * The scroll check goes with the rest of the block rather than staying
     * behind it, because "the results page is long enough to scroll" is the
     * setup for the restoration assertion and not a claim in its own right. An
     * empty state that happens to be taller than the viewport would tick it
     * green while proving nothing at all about item 22.
     */
    if ((await page.locator('a[href^="/listing/"]').count()) === 0) {
      console.log("  skip    catalogue is empty, so there is no listing to open and come back from");
      console.log("  note    run against a deployment with real inventory to exercise this");
      await ctx.close();
      break backFromListing;
    }

    const countBefore = await page.getAttribute('[data-testid="results-count"]', "data-count");

    /*
     * SCROLLED WITH A REAL WHEEL, not `window.scrollTo`.
     *
     * Only a scroll a person performed is remembered, because a layout clamp
     * during a navigation also fires a scroll event and was overwriting the
     * stored position with a much smaller one. `page.evaluate(scrollTo)` is
     * indistinguishable from that clamp and would test the wrong thing.
     */
    await page.mouse.move(195, 500);
    for (let i = 0; i < 6; i += 1) {
      await page.mouse.wheel(0, 220);
      await page.waitForTimeout(90);
    }
    await page.waitForTimeout(500);
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
    /*
     * `seed-1` was one of the twenty-three invented places, so on an empty
     * catalogue this navigation lands on a page with no listing behind it,
     * nothing is recorded as viewed, and item 25 has nothing to answer with.
     * The gallery is the same tell the other specs use for that. See
     * tests/_catalogue.mjs.
     *
     * Item 24 above and the clearing check below are NOT skipped with it: a
     * recent search is a record of a query, not of a result, so it is made and
     * remembered whether or not anything came back.
     */
    const opened = (await page.locator('[data-testid="listing-gallery"]').count()) > 0;
    await page.goto(BASE_URL + "/search", { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(SETTLE);
    if (opened) {
      const viewed = page.locator('[data-testid="recent-listing"]');
      check("a place that was opened is offered back", (await viewed.count()) >= 1);
      const href = await viewed.first().getAttribute("href");
      check("and its chip links to that place", href === "/listing/seed-1", [String(href)]);
    } else {
      console.log("  skip    catalogue is empty, so there is no place that could have been opened");
      console.log("  note    run against a deployment with real inventory to exercise this");
    }

    /* Clearing means cleared, and it survives a reload. */
    await page.locator('[data-testid="recent-strip"] button').first().click();
    await page.waitForTimeout(300);
    /* `domcontentloaded`, not `load`: listing photography is served from an
       upstream the sandbox cannot reach, so `load` waits on images that will
       never arrive. That is the environment, not the product. */
    await page.reload({ waitUntil: "domcontentloaded" });
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
      /*
       * Two different reasons land here and both are stated rather than
       * silently passed over. With the catalogue empty there is no place to
       * save in the first place, and even with inventory the save itself needs
       * a session the sandbox cannot reach. Either way the assertion did not
       * run, and an unrun assertion that prints nothing is the one outcome
       * worse than a red. See tests/_catalogue.mjs.
       */
      console.log("  skip    no saved card to unsave, so undo has nothing to offer");
      console.log("  note    run against a deployment with real inventory, signed in, to exercise this");
    }
    await ctx.close();
  }

  /* ------------------------------------- 16: the dates open on the weekend */
  console.log("\nThe date fields on arrival");
  dateFields: {
    const ctx = await freshContext();
    const page = await ctx.newPage();
    await page.goto(BASE_URL + "/listing/seed-1", { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(SETTLE);

    const panel = page.locator('[data-testid="reserve-panel"]').first();
    /*
     * The weekend defaults are computed and shown by the reserve panel, which
     * only exists on a listing, and `seed-1` was one of the twenty-three
     * invented places that were removed on purpose. Reading `inputValue()`
     * from a panel that is not there waits the full timeout and then throws,
     * so the absence is answered before it is read. See tests/_catalogue.mjs.
     */
    if ((await panel.count()) === 0) {
      console.log("  skip    catalogue is empty, so there is no reserve panel to open on a weekend");
      console.log("  note    run against a deployment with real inventory to exercise this");
      await ctx.close();
      break dateFields;
    }

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
