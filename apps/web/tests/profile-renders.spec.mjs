/**
 * The profile page, and the one mistake that made it answer 500 to everybody
 * who was actually signed in.
 *
 * The owner signed up, tapped the profile icon, and got "That screen did not
 * load", reference 130530488. The same from the avatar in the corner and from
 * the dashboard link. Every database probe of every query on that page came
 * back clean under the caller's own RLS, the postgres error log held nothing
 * from the minute it happened, and the Supabase api log was all 200s. Which was
 * the answer: nothing was wrong in the database, so it had to be a throw during
 * render.
 *
 * It was this line, in a server component:
 *
 *     const formatCount = (value: number) => formatNumber(value, locale);
 *     <AccountHero formatCount={formatCount} />        // "use client"
 *
 * A function cannot cross the server/client boundary. React refuses it while
 * serialising the props and throws "Functions cannot be passed directly to
 * Client Components", the page answers 500, and there is no database anywhere
 * near it.
 *
 * WHY NOTHING CAUGHT IT. The signed-out branch of that page returns before
 * either client component is ever constructed, and this sandbox has no route to
 * Supabase, so every spec that has ever opened /profile was signed out. The
 * whole signed-in half of the page had never been rendered by anything.
 *
 * So this reads the source, which is the honest thing to do for a defect whose
 * trigger is a state we cannot reach: it is not a claim about what the browser
 * did, it is a claim about what the code says, and the code is where the bug
 * was. The browser half below is only what a signed-out visitor can prove.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/profile-renders.spec.mjs
 */

import { chromium } from "playwright-core";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
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
    if (detail) for (const line of [].concat(detail).slice(0, 12)) console.log(`            ${line}`);
  }
}

/** Every .tsx and .ts under src, so the sweep below misses nothing. */
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

const files = walk(SRC);
const source = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));
const isClient = (f) => /^\s*["']use client["']/m.test(source.get(f) ?? "");
const clientFiles = files.filter(isClient);

/* --------------------------------------------------- the defect, everywhere */

console.log("\nNo function crosses into a client component");

/*
 * Two halves, because either one alone is a guess.
 *
 * The declaration half: a client component that TYPES a prop as a function is
 * only wrong if a server component passes one, so `onClick: () => void` on a
 * component that only its client parent renders is completely fine and is most
 * of this list. What is never fine is a SERVER file handing one over.
 *
 * So the sweep goes the other way: find the server files, find what they render,
 * and look for a prop whose value is a function. A server ACTION is the one
 * legal exception, and it is legal precisely because "use server" marks it as a
 * reference rather than a closure.
 */
const serverFiles = files.filter((f) => !isClient(f) && /\.tsx$/.test(f));
const offences = [];

for (const file of serverFiles) {
  const text = source.get(file) ?? "";

  // Local arrow or function declarations in this file, which are the only
  // things that could be closed over and handed down.
  const locals = new Set();
  for (const m of text.matchAll(/\bconst\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::[^=]+)?=>/g)) {
    locals.add(m[1]);
  }
  for (const m of text.matchAll(/\bfunction\s+(\w+)\s*\(/g)) locals.add(m[1]);

  // A JSX prop whose value is a bare identifier, and that identifier is one of
  // the local functions above.
  for (const m of text.matchAll(/\s(\w+)=\{(\w+)\}/g)) {
    if (locals.has(m[2])) offences.push(`${file.replace(SRC, "src")}: ${m[1]}={${m[2]}}`);
  }
  // Or an inline arrow, which cannot be anything but a closure.
  for (const m of text.matchAll(/\s(\w+)=\{\s*(?:async\s*)?\([^)]*\)\s*=>/g)) {
    offences.push(`${file.replace(SRC, "src")}: ${m[1]}={(...) => ...}`);
  }
}

check(
  "no server component hands a function down as a prop",
  offences.length === 0,
  offences.length ? offences : undefined,
);

/* ------------------------------------------------------- the page in question */

console.log("\nThe profile page specifically");

const page = source.get(join(SRC, "app/(app)/profile/page.tsx")) ?? "";
const hero = source.get(join(SRC, "app/(app)/profile/AccountHero.tsx")) ?? "";
const body = source.get(join(SRC, "app/(app)/profile/AccountBody.tsx")) ?? "";

check("the page still exists", page.length > 0);
check(
  "it passes a locale, which is a string, rather than a formatter",
  /locale=\{locale\}/.test(page) && !/formatCount=/.test(page),
);
check(
  "and both client halves format for themselves",
  /formatNumber\(value, locale\)/.test(hero) && /formatNumber\(value, locale\)/.test(body),
);
/*
 * Read the code, not the prose.
 *
 * Both files carry a long comment quoting the old signature verbatim, because
 * the reason it was wrong is worth keeping next to the thing that replaced it.
 * A grep over the raw text matches that comment and calls the fix a failure,
 * which is the check being wrong rather than the product. So the comments come
 * out first and the assertion is made against what actually compiles.
 */
const decommented = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

check(
  "neither still declares a function-typed formatting prop",
  !/formatCount\s*:\s*\(/.test(decommented(hero)) &&
    !/formatCount\s*:\s*\(/.test(decommented(body)),
);

/* ------------------------------------------------- what a browser can prove */

const browser = await chromium.launch({ executablePath: EXECUTABLE_PATH });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });

try {
  console.log("\nWhat a signed-out visitor gets");
  const tab = await context.newPage();
  const res = await tab.goto(`${BASE_URL}/profile`, { waitUntil: "load" });
  const status = res?.status() ?? 0;

  /* Signed out, the gate is the correct answer and so is the page. Either is a
     pass; a 500 is not. */
  check("it does not answer 500", status !== 500, [`${status} ${tab.url()}`]);
  check(
    "and nothing on it says the screen did not load",
    !/did not load/i.test(await tab.content()),
  );
} finally {
  await context.close();
  await browser.close();
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
