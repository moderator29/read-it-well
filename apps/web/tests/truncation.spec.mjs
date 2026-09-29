/**
 * No sentence is ever truncated.
 *
 * Item 7 of docs/POLISH_PASS.md, and the item itself says how to prove it: a
 * name or a handle in a tight row is fine, a sentence is not. "Places on R..."
 * is the failure. So the question is never "how many `truncate` classes are
 * there", it is "what is actually clipping, and what is it clipping".
 *
 * Three checks, in the browser, at 320, 390, 768 and 1280, over forty routes.
 *
 *  1. NOTHING IS CLIPPING NOW. Straightforward, and it passes today.
 *
 *  2. NO SENTENCE SITS UNDER A SINGLE-LINE TRUNCATION. A sentence that happens
 *     to fit today is still the wrong control: the first longer one clips, and
 *     nobody sees it happen. Two things are excepted by name below and both
 *     are excerpts by design rather than copy we wrote to fit.
 *
 *  3. EVERY TRUNCATING BOX SURVIVES A LONG NAME. This is the one that earns
 *     its keep while the catalogue is empty. Checks 1 and 2 can only see the
 *     text on the screen, and with no listings, no agents and no members, most
 *     of the truncating rows on this platform are showing nothing at all. So
 *     each one is filled with a genuinely long Nigerian name, and the layout is
 *     re-measured: the box must not push past its container and the page must
 *     not gain a horizontal scrollbar. A row that only holds because it is
 *     empty is a row that breaks on the first real listing.
 *
 * The text is put back immediately and nothing is written anywhere. This is a
 * measurement of the boxes, not a seeded catalogue.
 *
 * WHICH PAGES. Since 23 September every product route answers a signed-out
 * visitor with the sign-in wall (asserted for each below). The sweep reads the
 * public pages directly and each product screen through its preview-harness
 * twin (the real components in the real AppShell with fixture rows, so the
 * truncating rows have real names and titles in them for once), and, signed
 * in as the QA member, the real product routes (SKIP without QA_MEMBER_EMAIL /
 * QA_MEMBER_PASSWORD). `/wallet`, `/agents` and `/agents/apply` are redirects
 * now and are not swept as pages of their own.
 *
 * Run with the server already up:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/truncation.spec.mjs
 */

import { chromium } from "playwright-core";
import { expectSignInWall, qaContext, signInAsQa, skip } from "./_gate.mjs";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const EXECUTABLE_PATH = "/opt/pw-browsers/chromium";
const SRC = join(dirname(fileURLToPath(import.meta.url)), "../src");

let failures = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
    if (detail) for (const line of [].concat(detail).slice(0, 14)) console.log(`            ${line}`);
  }
}

const PUBLIC_ROUTES = [
  "/", "/help", "/contact", "/about", "/careers", "/safety", "/standards", "/cancellations",
  "/docs", "/privacy", "/terms",
];

/** Each gated product route with its preview-harness twin (null: none). */
const PRODUCT = [
  ["/home", "/preview/session-b/sweep-home/home"],
  ["/search", "/preview/session-b/sweep-home/search"],
  ["/search?view=map", null],
  ["/listing/lekki-palm-grove", "/preview/f3/listing"],
  ["/saved", "/preview/f3/saved"],
  ["/messages", "/preview/f5/inbox"],
  ["/notifications", "/preview/f4/notifications"],
  ["/profile", "/preview/session-b/profile"],
  ["/settings", "/preview/session-b/sweep-settings?v=hub"],
  ["/settings/notifications", "/preview/session-b/sweep-settings?v=notifications"],
  ["/bookings", "/preview/f3/bookings"],
  ["/search?market=rent", null],
  ["/assistant", "/preview/f1/assistant"],
  ["/styleguide", null],
  ["/agent/dashboard", "/preview/f5/agent-dashboard"],
  ["/agent/bookings", "/preview/f5/agent-bookings"],
  ["/agent/listings", "/preview/f5/agent-listings"],
  ["/agent/calendar", "/preview/o3/agent-calendar"],
  ["/agent/earnings", "/preview/f5/agent-earnings"],
  ["/admin", "/preview/f5/admin-overview"],
  ["/admin/support", null],
  ["/around", "/preview/session-b/feed"],
  ["/u", null],
  ["/stories", null],
  /* The in-app copies of the legal pages sit inside the platform; the public
     /privacy and /terms above are the ones a stranger reads. */
  ["/legal/privacy", null],
  ["/legal/terms", null],
];
const ROUTES = [...PUBLIC_ROUTES, ...PRODUCT.map(([, twin]) => twin).filter(Boolean)];

const WIDTHS = [320, 390, 768, 1280];

/*
 * A long real-shaped Nigerian name. Two given names, a hyphenated surname, no
 * spaces to break on in the longest run. If a row can hold this it can hold a
 * listing title or a member's name.
 */
const LONG = "Adebayo-Oluwaseun Chukwuemeka Ogundimu-Adeyemi";

/*
 * The justification the item asks for, written out rather than assumed.
 *
 * Both entries are somebody else's words shown as an excerpt, which is what
 * makes a list a list: an inbox row cannot carry a whole conversation, and a
 * guest message panel cannot carry a whole message. Everything else that
 * clips on this platform is copy WE wrote, and copy we wrote should fit the
 * box we put it in.
 */
const SENTENCE_ALLOWED = [
  /* The last message in a conversation, in the inbox list (as it was drawn). */
  "leading-relaxed",
  /* The same excerpt as the inbox row draws it now (`Inbox.tsx`). */
  "nf-body-sm mt-3xs block truncate",
  /* The guest message preview in the agent workspace. */
  "text-[var(--nf-content-muted)]",
];

/* A button label is a label. It sets nowrap so it stays on one line, which is
   what a button does; whether it FITS is check 1's business, not check 2's. */
const SENTENCE_SKIP_TAGS = ["button", "a", "summary"];

const SWEEP = ({ long, allowed, skipTags }) => {
  const doc = document.documentElement;

  const truncating = (el) => {
    const cs = getComputedStyle(el);
    if (cs.textOverflow === "ellipsis" && cs.overflow !== "visible") return "ellipsis";
    if (cs.webkitLineClamp && cs.webkitLineClamp !== "none") return `clamp-${cs.webkitLineClamp}`;
    if (cs.whiteSpace.startsWith("nowrap") && cs.overflow === "hidden") return "nowrap";
    return null;
  };

  /* A screen reader label is a one-pixel box on purpose. It reports as clipped
     because it IS clipped, and that is the entire technique. */
  /* `sm:sr-only` and the like are the same technique at a breakpoint: hidden
     on purpose when their responsive class applies and the box is 1px. */
  const visuallyHidden = (el) =>
    el.classList.contains("sr-only") ||
    el.closest(".sr-only") !== null ||
    ([...el.classList].some((c) => /(^|:)sr-only$/.test(c)) && el.getBoundingClientRect().width <= 1);

  /* The whole text is one hover or long-press away: the element, or the
     link or button it sits in, carries it as its title. That is the "proper
     ellipsis with the full text available" the polish pass asks for; a
     sentence under a one-line ellipsis still fails check 2 regardless. */
  const titled = (el) => {
    const text = (el.textContent || "").trim().replace(/\s+/g, " ");
    const holder = el.closest("[title]");
    return Boolean(holder && text && holder.getAttribute("title").includes(text));
  };

  const clipped = [];
  const sentences = [];
  const targets = [];

  for (const el of document.querySelectorAll("*")) {
    if (visuallyHidden(el)) continue;
    const kind = truncating(el);
    if (!kind) continue;
    const text = (el.textContent || "").trim().replace(/\s+/g, " ");
    if (!text) continue;
    const cls = typeof el.className === "string" ? el.className : "";

    /* 1. Clipping right now. */
    if (kind.startsWith("clamp")) {
      const line = parseFloat(getComputedStyle(el).lineHeight) || 20;
      /* A clamp inside a region a collapsed disclosure owns is an excerpt with
         its "Read more" beside it (ListingAbout): the rest is one tap away and
         announced as such, which is the item's own "or an expand". */
      const region = el.closest("[id]");
      const expandable =
        region !== null &&
        document.querySelector(`[aria-controls="${CSS.escape(region.id)}"][aria-expanded="false"]`) !== null;
      if (el.scrollHeight > el.clientHeight + line * 0.5 && !expandable && !titled(el) && !allowed.some((a) => cls.includes(a))) {
        clipped.push(`${kind} "${text.slice(0, 46)}" .${cls.slice(0, 44)}`);
      }
    } else if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth) {
      if (!allowed.some((a) => cls.includes(a)) && !titled(el)) {
        clipped.push(`${kind} ${el.clientWidth}/${el.scrollWidth} "${text.slice(0, 46)}" .${cls.slice(0, 44)}`);
      }
    }

    /* 2. A sentence under a single-line truncation. */
    if (kind !== "ellipsis" && kind !== "nowrap") {
      /* A clamp is a paragraph control. Two or three lines of a description is
         a designed excerpt, not a swallowed sentence. */
    } else if (
      !allowed.some((a) => cls.includes(a)) &&
      !skipTags.includes(el.tagName.toLowerCase()) &&
      el.closest("button, a, summary") === null &&
      (/[.!?]\s+\S/.test(text) || text.split(" ").length >= 8)
    ) {
      sentences.push(`${kind} "${text.slice(0, 60)}" .${cls.slice(0, 44)}`);
    }

    /*
     * 3. Collect the leaves for the stress pass.
     *
     * Not buttons. `.nf-btn` sets nowrap and hidden so a label stays on one
     * line, and a button's label is copy we wrote and translated, never a name
     * somebody typed. Filling one with a 46 character name measures a case
     * that cannot happen: it reported the primary button on /around bursting
     * 164px out of its box at 320px, when the four strings that button ever
     * holds are "Pick your places", "Yan àwọn ibi rẹ", "Zaɓi wuraren ka" and
     * "Họrọ ebe gị". Whether a real label fits is check 1's business, and
     * check 1 runs in every locale the i18n spec covers.
     */
    if (el.children.length === 0 && !cls.includes("nf-btn")) {
      targets.push({ el, was: el.textContent, cls, text });
    }
  }

  /* Stress. Fill every truncating leaf with a long name at once, because that
     is the honest case: a list of listings is not one long title among short
     ones. */
  const scrollBefore = doc.scrollWidth;
  for (const t of targets) t.el.textContent = long;
  const scrollAfter = doc.scrollWidth;
  const burst = [];
  for (const t of targets) {
    const parent = t.el.parentElement;
    if (!parent) continue;
    const r = t.el.getBoundingClientRect();
    const p = parent.getBoundingClientRect();
    /* 1.5px of slack for sub-pixel layout. */
    if (r.right > p.right + 1.5 || r.left < p.left - 1.5) {
      burst.push(`"${t.text.slice(0, 30)}" .${t.cls.slice(0, 44)} ${Math.round(r.right - p.right)}px past its box`);
    }
  }
  for (const t of targets) t.el.textContent = t.was;

  return {
    clipped,
    sentences,
    burst,
    count: targets.length,
    grewSideways: scrollAfter > doc.clientWidth + 1 && scrollBefore <= doc.clientWidth + 1,
    scroll: `${scrollBefore} to ${scrollAfter}, viewport ${doc.clientWidth}`,
  };
};

const browser = await chromium.launch({ executablePath: EXECUTABLE_PATH });
let reached = 0;

console.log("\nSigned out, every product route is behind the wall");
for (const [route] of PRODUCT) await expectSignInWall(check, route, BASE_URL);
console.log("\nThe QA session, for the real routes");
const qaState = await signInAsQa(browser, { base: BASE_URL });
const passes = [["public pages and harness twins", ROUTES, null]];
if (qaState) passes.push(["the real routes, signed in", PRODUCT.map(([route]) => route), qaState]);

try {
  for (const [which, routes, state] of passes)
  for (const width of WIDTHS) {
    console.log(`\n${width}px: ${which}`);
    const options = { viewport: { width, height: 900 }, colorScheme: "dark" };
    const context = state ? await qaContext(browser, state, options) : await browser.newContext(options);
    await context.addInitScript(() => {
      try {
        window.localStorage.setItem("nf_theme", "dark");
      } catch {
        /* storage can be unavailable */
      }
    });

    const clipped = [];
    const sentences = [];
    const burst = [];
    const sideways = [];

    for (const route of routes) {
      const page = await context.newPage();
      try {
        const response = await page.goto(BASE_URL + route, { waitUntil: "load", timeout: 45000 });
        if (route.startsWith("/preview/") && response?.status() === 404) {
          skip(`${route}: the preview harness is closed on this server (VALLO_PREVIEW_HARNESS=1)`);
          continue;
        }
        await page.waitForTimeout(700);
        const res = await page.evaluate(SWEEP, {
          long: LONG,
          allowed: SENTENCE_ALLOWED,
          skipTags: SENTENCE_SKIP_TAGS,
        });
        reached += res.count;
        for (const c of res.clipped) clipped.push(`${route} ${c}`);
        for (const s of res.sentences) sentences.push(`${route} ${s}`);
        for (const b of res.burst) burst.push(`${route} ${b}`);
        if (res.grewSideways) sideways.push(`${route} ${res.scroll}`);
      } catch (err) {
        failures += 1;
        console.log(`  FAILED  ${route} ${String(err).split("\n")[0]}`);
      } finally {
        await page.close();
      }
    }

    check("nothing is clipping", clipped.length === 0, clipped);
    check("no sentence sits under a single-line truncation", sentences.length === 0, sentences);
    check("every truncating box holds a long Nigerian name", burst.length === 0, burst);
    check("a long name never gives the page a sideways scroll", sideways.length === 0, sideways);

    await context.close();
  }
} finally {
  await browser.close();
}

/*
 * Coverage, stated rather than implied.
 *
 * The database is empty, so a truncating row that only exists once there is a
 * listing, an agent or a member cannot be reached from a browser at all. This
 * prints how much of the source the sweep actually touched, so nobody reads a
 * green run as "all 76 sites are proved". They are not. The ones behind real
 * inventory are still unproved and will stay that way until somebody signs up.
 */
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(full)) out.push(full);
  }
  return out;
}
let sites = 0;
const files = new Set();
for (const file of walk(SRC)) {
  const src = readFileSync(file, "utf8");
  const hits = src.match(/\btruncate\b|line-clamp-\d/g);
  if (hits) {
    sites += hits.length;
    files.add(relative(SRC, file).split("\\").join("/"));
  }
}
console.log(`\nCoverage`);
console.log(`  ${sites} truncation sites in ${files.size} files`);
console.log(`  ${reached} truncating elements reached in the browser, across ${ROUTES.length} routes at ${WIDTHS.length} widths`);
console.log(`  The rest sit behind inventory that does not exist yet. They are NOT proved.`);

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
