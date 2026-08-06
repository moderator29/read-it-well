/**
 * The top of a person's page, rebuilt against the owner's reference.
 *
 * Self-contained node script, no runner and no config. Run with the app
 * already serving:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/social-profile-header.spec.mjs
 *
 * WHAT THIS PROVES, AND WHAT IT CANNOT.
 *
 * This sandbox has no route to the Supabase host by organisation proxy policy.
 * Every server read on `/u/[handle]` therefore fails and the route renders its
 * unconfigured notice, so a browser here CANNOT be pointed at a real profile
 * and this file does not pretend otherwise. It is deliberately in two halves.
 *
 * The SOURCE half reads `ProfileHeader.tsx` and proves the things that decide
 * whether the screen matches the reference at all: that the bands appear in the
 * order the reference draws them, that pronouns and the moderator badge are
 * each gated on a real column rather than defaulted, that Followers and
 * Following are links to routes that exist on disk while Posts is not a link at
 * all, and that every word the header says has a key in all four locales. Those
 * are structural facts, they hold whether or not a row can be read, and a
 * screenshot could not tell you any of them.
 *
 * The BROWSER half drives `/u/[handle]` at 390px in dark and in light and
 * proves what is true of the route regardless of the data behind it: it answers
 * 200 rather than 404 for any handle, nothing on the walk returns 5xx, the
 * chosen theme actually took, there is no horizontal scroll, and the state that
 * does render is the designed one rather than a stack trace.
 *
 * The found-state header was verified by hand, against a temporary route that
 * mounted it with a fixture, at 390px in dark, light and Yoruba. That route was
 * removed before this file was written; what it showed is in the session report
 * and is not asserted here, because an assertion nobody can re-run is worse
 * than an honest gap.
 */

import { chromium } from "playwright-core";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO = path.join(ROOT, "../..");
const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");

let failures = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}${detail ? `\n          ${detail}` : ""}`);
  }
}

const header = read("src/components/social/profile/ProfileHeader.tsx");
const back = read("src/components/social/profile/BackChevron.tsx");
const tabs = read("src/components/social/profile/ProfileTabs.tsx");
const route = read("src/app/(app)/u/[handle]/page.tsx");

/* Comments stripped, for the checks that must not be satisfied - or tripped -
   by prose ABOUT the code. The header's own docstring names "she/her" as the
   example of a pronoun it must never invent, and a naive scan for that string
   would read the explanation as the offence. */
const headerCode = header.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/* ------------------------------------------------------------ the order */

console.log("\n[source] the bands, in the order the reference draws them");

/*
 * Ten marks, read in the order they appear in the file. JSX renders in source
 * order, so an index comparison is a real assertion about the rendered page
 * rather than a proxy for one: move the counts above the bio and this fails.
 */
const BANDS = [
  ["the banner", "nf-social-cover"],
  ["a back control on it", "<BackChevron"],
  ["the avatar, overlapping", "nf-social-avatar--ring"],
  ["the actions beside it", "nf-social-identity__actions"],
  ["the name and its badge", "nf-social-nameline"],
  ["the handle line", "nf-social-handle"],
  ["the bio", "nf-social-bio"],
  ["the meta row", "nf-social-meta"],
  ["the counts", "nf-social-counts"],
];

let previous = -1;
let orderHolds = true;
const seen = [];
for (const [label, mark] of BANDS) {
  const at = header.indexOf(mark);
  seen.push(`${label}: ${at}`);
  if (at < 0 || at < previous) orderHolds = false;
  previous = at;
}
check("banner, back, avatar, actions, name, handle, bio, meta, counts", orderHolds, seen.join("\n          "));

/* ------------------------------------------------------- the back control */

console.log("\n[source] back is a labelled pill, and it follows real history");

check(
  "the profile asks for the labelled form",
  /<BackChevron[\s\S]{0,120}?labelled/.test(headerCode),
);
check(
  "which draws the word beside the chevron rather than only in aria-label",
  /labelled \? <span>\{label\}<\/span> : null/.test(back),
);
check(
  "and it still follows real history rather than always pushing a fallback",
  /canGoBackInApp\(\)\) router\.back\(\)/.test(back),
);

/* ---------------------------------------------------------- what is gated */

console.log("\n[source] nothing is invented when the record is empty");

check(
  "pronouns render only when the person set them",
  /\{profile\.pronouns \? \(/.test(header),
  "the pronouns block is not gated on profile.pronouns",
);
check(
  "and there is no default pronoun anywhere in the rendered header",
  !/she\/her|he\/him|they\/them/i.test(headerCode),
);
check(
  "the role badge renders only when a moderator row exists",
  /const mod = moderatorOf\[0\];/.test(header) && /\{mod \? \(/.test(header),
);
check(
  "the badge names the place it is a badge FOR, never a bare rank",
  /moderatorOf\.replace\("\{place\}", mod\.name\)/.test(header),
);
check(
  "the agent trust band is absent on somebody who is not an agent",
  /\{trust \? \(/.test(header),
);
check(
  "the counts are read off the row, never added up here",
  /profile\.followerCount/.test(header) &&
    /profile\.followingCount/.test(header) &&
    /profile\.postCount/.test(header) &&
    !/\.length\}/.test(header),
);

/* ------------------------------------------------- links versus dead ends */

console.log("\n[source] a count is a link only where a list exists");

const followers = "src/app/(app)/u/[handle]/followers/page.tsx";
const following = "src/app/(app)/u/[handle]/following/page.tsx";
check(`the followers list is a real route (${followers})`, existsSync(path.join(ROOT, followers)));
check(`the following list is a real route (${following})`, existsSync(path.join(ROOT, following)));
check(
  "Followers points at it",
  /<Link href=\{`\/u\/\$\{profile\.handle\}\/followers`\}/.test(header),
);
check(
  "Following points at it",
  /<Link href=\{`\/u\/\$\{profile\.handle\}\/following`\}/.test(header),
);
check(
  "there is no /u/[handle]/posts route to point at",
  !existsSync(path.join(ROOT, "src/app/(app)/u/[handle]/posts/page.tsx")),
);
check(
  "so Posts is plain text, not a link that goes nowhere",
  /<span className="nf-social-count nf-social-count--static">/.test(header),
);
check(
  "and its expanded hit area is dropped with it",
  /\.nf-social-count--static::before \{\s*content: none;/.test(read("src/app/social-feed.css")),
);

/* --------------------------------------------------------------- the tabs */

console.log("\n[source] the tab row");

check(
  "the labels come from the dictionary, not from a constant in the source",
  /labels\[LABEL_KEY\[key\]\]/.test(tabs) && !/TAB_LABEL/.test(tabs),
);
check(
  "a new tab cannot ship without a word in all four languages",
  /satisfies Record<TabKey, keyof TabLabels>/.test(tabs),
);
check(
  "the live one is filled",
  /\.nf-social-tabs \.nf-social-tab\[aria-selected="true"\] \{[^}]*background: var\(--nf-brand-primary\)/.test(
    read("src/app/social-feed.css"),
  ),
);
/*
 * The 44px floor has to be delivered by a pseudo element. The runtime sweep in
 * `icons-and-targets.spec` measures the element and its ::before/::after and
 * nothing else, so a child span expanding a target is a target that spec cannot
 * see. `Switch` sets the same precedent and says the same thing.
 */
check(
  "and the 44px target is a pseudo element, which is the only kind that is measurable",
  /\.nf-social-tabs \.nf-social-tab::before \{\s*content: "";/.test(read("src/app/social-feed.css")),
);

/* ----------------------------------------------------------- four locales */

console.log("\n[i18n] every word the header says, in all four");

function sectionKeys(locale) {
  const src = readFileSync(path.join(REPO, `packages/i18n/src/locales/${locale}.ts`), "utf8");
  const start = src.indexOf("  socialProfile: {");
  if (start < 0) return null;
  const end = src.indexOf("\n  },", start);
  return new Set([...src.slice(start, end).matchAll(/^\s{4}(\w+):/gm)].map((m) => m[1]));
}

const en = sectionKeys("en");
check("en carries a socialProfile section", en !== null && en.size > 0);
for (const locale of ["yo", "ha", "ig"]) {
  const keys = sectionKeys(locale);
  const missing = en ? [...en].filter((k) => !keys?.has(k)) : ["en is missing"];
  check(`${locale} has all ${en?.size ?? 0} of them`, missing.length === 0, missing.join(", "));
}
check(
  "the header reads them rather than holding English literals",
  /const copy = t\.socialProfile;/.test(header),
);
check(
  "the page resolves the dictionary once and hands it down",
  /const t = getDictionary\(locale\);/.test(route) && /t=\{t\}/.test(route),
);
check(
  "and the joined month is formatted in the reader's language",
  /monthYear\(view\.profile\.claimedAt, locale\)/.test(route) &&
    /intlTag\[locale\]/.test(read("src/lib/social/profile-tabs-queries.ts")),
);

/* ------------------------------------------------------------- the browser */

const HANDLE = "aduke_from_yaba";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function run(theme) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: theme,
  });
  /* Only a stored choice moves the theme. The operating system never does. */
  await context.addInitScript((choice) => {
    try {
      window.localStorage.setItem("nf_theme", choice);
    } catch (error) {
      void error;
    }
  }, theme);
  const page = await context.newPage();

  const serverErrors = [];
  page.on("response", (r) => {
    if (r.status() >= 500) serverErrors.push(`${r.status()} ${r.url()}`);
  });

  try {
    console.log(`\n[${theme} 390px] /u/${HANDLE}`);
    const response = await page.goto(`${BASE_URL}/u/${HANDLE}`, {
      waitUntil: "load",
      timeout: 60000,
    });
    await page.waitForTimeout(900);

    check("a handle nobody holds answers 200, never a 404", response?.status() === 200);
    check(
      "the chosen theme actually took",
      (await page.evaluate(() => document.documentElement.dataset.theme ?? "dark")) === theme,
    );

    const text = await page.evaluate(() => document.body.innerText);
    const mounted = (await page.getByTestId("profile-header").count()) === 1;

    /*
     * Both branches are named out loud, so a green run can never be mistaken
     * for a run that had a real profile behind it. In this sandbox it is always
     * the second.
     */
    console.log(`          (${mounted ? "a profile rendered" : "no route to Supabase, so the designed notice"})`);

    if (mounted) {
      check("the back control carries its word", (await page.getByTestId("profile-back").innerText()).length > 0);
      check("the handle line is there", (await page.getByTestId("profile-handle-line").count()) === 1);
      check("three counts", (await page.getByTestId("profile-counts").count()) === 1);
      check("the tab row has exactly one live tab", (await page.locator('.nf-social-tabs [role="tab"][aria-selected="true"]').count()) === 1);
    } else {
      check(
        "the unreadable state is a designed page, not a crash",
        /switch on shortly|Nothing to show|not a handle/i.test(text),
        text.slice(0, 200),
      );
      check("and it carries a way onward", (await page.locator('a[href="/home"]').count()) >= 1);
    }

    check(
      "no horizontal scroll at 390px",
      (await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )) === 0,
    );
    /* Zero em dashes anywhere in the product's copy, in every language. */
    /* Escaped, so this file stays clean of the character it is looking for.
       Same form the other social specs use. */
    const emDashes = (text.match(/\u2014/g) ?? []).length;
    check(`no em dashes in the copy (${emDashes} found)`, emDashes === 0);
    check("no route returned a server error", serverErrors.length === 0, serverErrors.join("\n"));
  } finally {
    await context.close();
  }
}

await run("dark");
await run("light");
await browser.close();

console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
