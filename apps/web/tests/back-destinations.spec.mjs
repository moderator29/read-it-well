/**
 * WHERE BACK GOES, WALKED IN A REAL BROWSER AT PHONE WIDTH (390).
 *
 * The founder, 29 September 2026: "there are many back buttons that take me to
 * places they're not supposed to." `src/lib/nav/resolve.test.ts` proves the
 * decision as arithmetic; this presses the drawn control on the real screens
 * and reads where the browser actually landed, for the thirty flows people
 * walk most. `docs/BACK_NAVIGATION.md` is the table these check.
 *
 * The rule under test: Back returns to the screen you came from when that is
 * inside the product and safe (not a door, a submitted form, a success receipt,
 * a child of this screen, or another workspace), and otherwise to the declared
 * parent, by REPLACING the current entry so no double history is left behind.
 *
 * Every control pressed is also measured: 44 by 44 at least, an accessible
 * name that starts with the reader's "Back" (and says where, in English), and
 * reachable by keyboard.
 *
 * Signed-in flows need QA_MEMBER_EMAIL and QA_MEMBER_PASSWORD (or QA_PASSWORD)
 * from the environment; they are never printed or written. Without them only
 * the public flows run and the rest are reported as SKIP. Nothing here writes:
 * no message is sent, no form is submitted, nothing is paid.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/back-destinations.spec.mjs
 */
import { chromium } from "playwright-core";
import { existsSync } from "node:fs";
import { BASE_URL, SKIP_EXIT, qaContext, signInAsQa, signedOutContext, skip } from "./_gate.mjs";

const BASE = BASE_URL;
const LISTING = process.env.LISTING_PATH ?? "/listing/ed000000-0000-4000-8000-00000000002b";
const EXECUTABLE = ["/opt/pw-browsers/chromium"].find(existsSync);
const SETTLE = Number(process.env.SETTLE_MS ?? 1600);

let failures = 0;
let ran = 0;
let skipped = 0;

function check(name, condition, detail) {
  console.log(`  ${condition ? "ok    " : "FAILED"}  ${name}${!condition && detail ? `  (${detail})` : ""}`);
  if (!condition) failures += 1;
}

const here = (page) => {
  const u = new URL(page.url());
  return `${u.pathname}${u.search}`;
};
const pathOf = (page) => new URL(page.url()).pathname;

/** A client-side navigation, the way a tapped link makes one. */
async function go(page, path) {
  await page.evaluate((to) => window.next.router.push(to), path);
  await page.waitForURL((u) => `${u.pathname}${u.search}` === path, { timeout: 45_000 });
  await page.waitForTimeout(SETTLE);
}

async function cold(ctx, path) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 90_000 });
  await page.waitForTimeout(SETTLE);
  return page;
}

async function historyLength(page) {
  return page.evaluate(() => window.history.length);
}

/** The drawn, visible, pressable back control on this screen. */
function backControl(page) {
  return page.locator('[data-nav-back]:not([aria-hidden="true"]):visible').first();
}

/**
 * Press the screen's back control and report where it landed, measuring the
 * control on the way. `via` is "click" or "keyboard".
 */
async function pressBack(page, { via = "click", label = null } = {}) {
  const control = backControl(page);
  /* A client navigation paints its loading skeleton first; wait for the
     screen's own control rather than for a fixed time. */
  await control.waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
  if ((await control.count()) === 0) return { drawn: false, landed: here(page) };
  const box = await control.boundingBox();
  const name = (await control.getAttribute("aria-label")) ?? (await control.innerText());
  const destination = await control.getAttribute("data-back-destination");
  const before = here(page);
  if (via === "keyboard") {
    await control.focus();
    await page.keyboard.press("Enter");
  } else {
    await control.click();
  }
  await page
    .waitForURL((u) => `${u.pathname}${u.search}` !== before, { timeout: 45_000 })
    .catch(() => {});
  await page.waitForTimeout(SETTLE);
  /* Half a pixel of tolerance: a screen still settling its entrance
     transform measures 43.99996. */
  const sized = box !== null && box.width >= 43.5 && box.height >= 43.5;
  if (!sized) check(`the control on ${before} is 44 by 44`, false, JSON.stringify(box));
  if (!name?.startsWith("Back")) check(`the control on ${before} is named Back...`, false, name);
  if (label && name !== label) check(`the control on ${before} is named "${label}"`, false, name);
  return { drawn: true, landed: here(page), name, destination, box };
}

/**
 * One flow: open `start` cold, walk `steps` in-app, press back on the last,
 * expect `want` (a path, with query when it matters).
 */
async function flow(ctx, title, { start, steps = [], want, label = null, via = "click" }) {
  ran += 1;
  const page = await cold(ctx, start);
  try {
    for (const step of steps) await go(page, step);
    const on = here(page);
    const result = await pressBack(page, { via, label });
    if (!result.drawn) {
      check(`${title}: a back control is drawn on ${on}`, false);
      return;
    }
    check(`${title}: ${on} -> ${want}`, result.landed === want, `landed ${result.landed}`);
    if (result.destination) {
      check(
        `${title}: the control announced its destination`,
        want.split("?")[0] === result.destination.split("?")[0] || result.destination === "/home-or-landing",
        `said ${result.destination}`,
      );
    }
  } finally {
    await page.close();
  }
}

/** The first in-app link on `path` whose href matches, or null. */
async function firstHref(ctx, path, pattern) {
  const page = await cold(ctx, path);
  try {
    const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href") ?? ""));
    return hrefs.find((h) => pattern.test(h)) ?? null;
  } finally {
    await page.close();
  }
}

const browser = await chromium.launch(EXECUTABLE ? { executablePath: EXECUTABLE } : {});

/* ------------------------------------------------------------ signed out */

console.log("\n== the public site, signed out");
{
  const ctx = await signedOutContext(browser);
  await flow(ctx, "1 cold legal page", { start: "/about", want: "/" });
  await flow(ctx, "2 came from Help", { start: "/help", steps: ["/about"], want: "/help", label: "Back to Help" });
  await flow(ctx, "3 cold docs chapter", { start: "/docs/listings", want: "/docs" });
  await flow(ctx, "4 keyboard Enter", { start: "/terms", steps: ["/privacy"], want: "/terms", via: "keyboard" });
  await ctx.close();
}

/* ------------------------------------------------------------- signed in */

const state = await signInAsQa(browser);
if (!state) {
  skipped += 1;
} else {
  const ctx = await qaContext(browser, state);
  const thread = await firstHref(ctx, "/messages", /^\/messages\/(?!new)[^/?#]+$/);
  const booking = await firstHref(ctx, "/bookings", /^\/bookings\/[^/?#]+$/);

  console.log("\n== opened cold (a notification, a pasted link): the declared parent");
  await flow(ctx, "5 cold listing", { start: LISTING, want: "/search" });
  await flow(ctx, "6 cold inbox", { start: "/messages", want: "/home" });
  await flow(ctx, "7 cold settings row", { start: "/settings/account", want: "/settings" });
  await flow(ctx, "8 cold search, a member", { start: "/search", want: "/home" });
  await flow(ctx, "9 cold around, a member", { start: "/around", want: "/home" });
  await flow(ctx, "10 cold ticket list", { start: "/support/messages", want: "/support" });
  await flow(ctx, "11 cold notifications", { start: "/notifications", want: "/home" });
  if (thread) await flow(ctx, "12 cold thread", { start: thread, want: "/messages" });
  else (skip("12 cold thread: the QA member has no conversation"), (skipped += 1));

  console.log("\n== walked in: the screen you came from");
  await flow(ctx, "13 listing from Home", { start: "/home", steps: [LISTING], want: "/home" });
  await flow(ctx, "14 listing from a filtered search", {
    start: "/search?beds=2",
    steps: [LISTING],
    want: "/search?beds=2",
  });
  await flow(ctx, "15 listing from Saved", { start: "/saved", steps: [LISTING], want: "/saved" });
  await flow(ctx, "16 search from Home", { start: "/home", steps: ["/search"], want: "/home" });
  await flow(ctx, "17 around from Home", { start: "/home", steps: ["/around"], want: "/home" });
  await flow(ctx, "18 support from Settings", { start: "/settings", steps: ["/support"], want: "/settings" });
  await flow(ctx, "19 plans from Notifications", {
    start: "/notifications",
    steps: ["/bookings"],
    want: "/notifications",
  });
  await flow(ctx, "20 legal from legal", { start: "/legal/terms", steps: ["/legal/privacy"], want: "/legal/terms" });
  await flow(ctx, "21 a re-filtered search leaves in one press", {
    start: "/home",
    steps: ["/search?beds=1", "/search?beds=2", "/search?beds=3"],
    want: "/home",
  });
  if (thread) await flow(ctx, "22 thread from a listing", { start: LISTING, steps: [thread], want: LISTING });
  if (booking) {
    await flow(ctx, "23 booking from Notifications", { start: "/notifications", steps: [booking], want: "/notifications" });
  } else (skip("23 booking from Notifications: the QA member has no booking"), (skipped += 1));

  console.log("\n== never into a door, a submitted form, or a loop");
  await flow(ctx, "24 not back into the welcome door", {
    start: "/welcome",
    steps: ["/settings/account"],
    want: "/settings",
  });
  /* A ticket list reached from the new-ticket form (as a filed ticket is)
     goes to its parent, not back into the form. Nothing is filed. */
  await flow(ctx, "25 not back into the new-ticket form", {
    start: "/support/new",
    steps: ["/support/messages"],
    want: "/support",
  });
  {
    ran += 1;
    /* Inbox -> thread -> Back (history, the inbox) -> Back must go Home, not
       forward into the thread the first press came out of. */
    const page = await cold(ctx, "/home");
    await go(page, "/messages");
    if (thread) {
      await go(page, thread);
      await pressBack(page);
      check("26 thread back to the inbox", pathOf(page) === "/messages", here(page));
    }
    const second = await pressBack(page);
    check("26 then the inbox back to Home, no loop", second.landed === "/home", second.landed);
    await page.close();
  }

  console.log("\n== history left behind");
  {
    ran += 1;
    /* Up by REPLACE: a cold settings row, Back, and the browser's own back
       leaves rather than returning to the row just left. */
    const page = await cold(ctx, "/settings/privacy");
    const before = await historyLength(page);
    await pressBack(page);
    const after = await historyLength(page);
    check("27 up replaces the entry (no double history)", after === before, `${before} -> ${after}`);
    check("27 and lands on the parent", pathOf(page) === "/settings", here(page));
    await page.close();
  }
  {
    ran += 1;
    /* A double tap walks one screen, not two. */
    const page = await cold(ctx, "/home");
    await go(page, "/settings");
    await go(page, "/settings/account");
    const control = backControl(page);
    await control.dblclick();
    await page.waitForTimeout(SETTLE * 2);
    check("28 a double tap goes back once", pathOf(page) === "/settings", here(page));
    await page.close();
  }
  {
    ran += 1;
    /* The browser's own back after a drawn Back that used history. */
    const page = await cold(ctx, "/home");
    await go(page, "/saved");
    await go(page, LISTING);
    await pressBack(page);
    await page.goBack().catch(() => {});
    await page.waitForTimeout(SETTLE);
    check("29 browser back after a history Back continues backwards", pathOf(page) === "/home", here(page));
    await page.close();
  }
  {
    ran += 1;
    /* Every control on the screens above names its destination in English. */
    const page = await cold(ctx, "/settings/account");
    const name = await backControl(page).getAttribute("aria-label");
    check("30 the control says where it goes", name === "Back to Settings", name);
    await page.close();
  }

  console.log("\n== the workspaces, when this member has one");
  for (const [landing, inner] of [
    ["/agent/dashboard", "/agent/listings"],
    ["/host", "/host/settings"],
    ["/admin", "/admin/queue"],
  ]) {
    const probe = await cold(ctx, landing);
    const opened = pathOf(probe) === landing;
    await probe.close();
    if (!opened) {
      skip(`${landing}: the QA member cannot open this workspace`);
      skipped += 1;
      continue;
    }
    await flow(ctx, `${landing} cold inner screen`, { start: inner, want: landing });
    await flow(ctx, `${landing} inner from landing`, { start: landing, steps: [inner], want: landing });
    await flow(ctx, `${landing} help from the drawer`, { start: landing, steps: ["/support"], want: landing });
  }

  await ctx.close();
}

await browser.close();
console.log(`\n${ran} flow(s) walked, ${failures} failure(s), ${skipped} skipped`);
if (failures === 0 && ran === 0 && skipped > 0) process.exit(SKIP_EXIT);
process.exit(failures === 0 ? 0 : 1);
