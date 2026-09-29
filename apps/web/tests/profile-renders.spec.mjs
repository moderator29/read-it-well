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
 * trigger is a state we cannot always reach: it is a claim about what the code
 * says, and the code is where the bug was. The browser half then asserts the
 * sign-in wall for a stranger (since 23 September), renders the same two
 * client components across the same server/client boundary in the preview
 * harness (`/preview/session-b/profile`), and, signed in as the QA member,
 * opens the real /profile (SKIP without QA_MEMBER_EMAIL / QA_MEMBER_PASSWORD),
 * which is the render that actually failed.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/profile-renders.spec.mjs
 */

import { chromium } from "playwright-core";
import { expectSignInWall, onSignInDoor, openPreview, qaContext, signedOutContext, signInAsQa } from "./_gate.mjs";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

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
/* Only the predicate is needed. The list of client files was computed here too
   and never read, because the sweep below deliberately runs the other way: it
   starts from the SERVER files, for the reason the next comment gives. */
const isClient = (f) => /^\s*["']use client["']/m.test(source.get(f) ?? "");

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

/*
 * WHO RECEIVES IT. A function handed from one server component to another is
 * legal (nothing is serialised), and the admin desks do it on purpose
 * (`SeriesChart yLabel`, `ListingReview statusLabel`, ...). What throws is the
 * hand-over to a "use client" component. So each file is parsed (with the
 * TypeScript compiler rather than a regex, because a prop can follow nested
 * JSX in an earlier prop, and a name can be a string prop in one function and
 * a local function in another), every function-valued prop is resolved to the
 * element it sits on, that element's import is followed to its file, and only
 * a client file, or one that cannot be resolved, counts. Unit tests are not
 * server components and are left out.
 */
const require = createRequire(import.meta.url);
const ts = require("typescript");

function resolveImport(fromFile, spec) {
  const base = spec.startsWith("@/")
    ? join(SRC, spec.slice(2))
    : spec.startsWith(".")
      ? join(dirname(fromFile), spec)
      : null;
  if (!base) return null;
  for (const candidate of [base, `${base}.tsx`, `${base}.ts`, join(base, "index.tsx"), join(base, "index.ts")]) {
    if (source.has(candidate)) return candidate;
  }
  return null;
}

/** The nearest enclosing function-like node's own function declarations. */
function functionsInScope(node, sf) {
  const names = new Set();
  for (let at = node; at; at = at.parent) {
    const body = at.body ?? (ts.isSourceFile(at) ? at : null);
    const statements = body && body.statements ? body.statements : ts.isSourceFile(at) ? at.statements : null;
    if (!statements) continue;
    for (const st of statements) {
      if (ts.isFunctionDeclaration(st) && st.name) names.add(st.name.text);
      if (ts.isVariableStatement(st)) {
        for (const d of st.declarationList.declarations) {
          if (ts.isIdentifier(d.name) && d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))) {
            names.add(d.name.text);
          }
        }
      }
    }
  }
  void sf;
  return names;
}

for (const file of serverFiles) {
  if (/\.test\.tsx$/.test(file)) continue;
  const text = source.get(file) ?? "";
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  const imports = new Map();
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st) && st.importClause && ts.isStringLiteral(st.moduleSpecifier)) {
      const from = st.moduleSpecifier.text;
      if (st.importClause.name) imports.set(st.importClause.name.text, from);
      const bindings = st.importClause.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) for (const el of bindings.elements) imports.set(el.name.text, from);
    }
  }
  const topLevel = new Set(
    sf.statements.flatMap((st) =>
      ts.isFunctionDeclaration(st) && st.name
        ? [st.name.text]
        : ts.isVariableStatement(st)
          ? st.declarationList.declarations.filter((d) => ts.isIdentifier(d.name)).map((d) => d.name.text)
          : [],
    ),
  );

  const receiverIsClient = (tagName) => {
    const name = tagName.split(".")[0];
    if (/^[a-z]/.test(name)) return false; // an intrinsic element: the prop never crosses into React state
    if (topLevel.has(name) && !imports.has(name)) return false; // declared in this server file
    const from = imports.get(name);
    if (!from) return true;
    const target = resolveImport(file, from);
    if (target !== null) return isClient(target);
    return true; // a package component (next/link and the like) is conservatively a client one
  };

  const visit = (node) => {
    if (ts.isJsxAttribute(node) && node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression) {
      const expr = node.initializer.expression;
      const isArrow = ts.isArrowFunction(expr) || ts.isFunctionExpression(expr);
      const isLocalFn = ts.isIdentifier(expr) && !imports.has(expr.text) && functionsInScope(node, sf).has(expr.text);
      if (isArrow || isLocalFn) {
        const opening = node.parent.parent;
        const tag = opening.tagName.getText(sf);
        if (receiverIsClient(tag)) {
          const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
          offences.push(`${file.replace(SRC, "src")}:${line}: <${tag} ${node.name.getText(sf)}=${isArrow ? "{(...) => ...}" : `{${expr.text}}`}>`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
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
/* The body's counts moved into the belongings rows: AccountBody hands the
   locale to `rowValue`, and `belongings.ts` formats each count itself. */
const belongings = source.get(join(SRC, "app/(app)/profile/belongings.ts")) ?? "";
check(
  "and both client halves format for themselves",
  /formatNumber\(value, locale\)/.test(hero) &&
    /rowValue\([^)]*locale\)/.test(body) &&
    /formatNumber\(value, locale\)/.test(belongings),
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

/** A load that must not be the 500, nor the error screen. */
async function rendersWithoutTheError(tab, path, label) {
  const res = await tab.goto(`${BASE_URL}${path}`, { waitUntil: "load" });
  await tab.waitForTimeout(1200);
  const status = res?.status() ?? 0;
  check(`${label}: it does not answer 500`, status !== 500, [`${status} ${tab.url()}`]);
  /* The visible text, not `content()`: the page's RSC payload carries the
     error boundary's own copy as data on every route, rendered or not. */
  check(`${label}: and nothing on it says the screen did not load`, !/did not load/i.test(await tab.locator("body").innerText()));
  return status;
}

try {
  console.log("\nWhat a signed-out visitor gets");
  await expectSignInWall(check, "/profile", BASE_URL);
  {
    const context = await signedOutContext(browser, { viewport: { width: 390, height: 844 } }, BASE_URL);
    const tab = await context.newPage();
    await rendersWithoutTheError(tab, "/profile", "signed out");
    check("signed out: the browser lands on the sign-in door", onSignInDoor(tab), [tab.url()]);
    await context.close();
  }

  console.log("\nThe two client halves across the boundary (preview harness)");
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const tab = await context.newPage();
    if (await openPreview(tab, "/preview/session-b/profile", check, { base: BASE_URL })) {
      check("the account hero rendered", (await tab.locator('[data-testid="account-hero"]').count()) === 1);
      check("and the body under it", (await tab.locator('[data-testid="account-tab-account"]').count()) === 1);
      check("nothing on it says the screen did not load", !/did not load/i.test(await tab.locator("body").innerText()));
    }
    await context.close();
  }

  console.log("\nThe real /profile, signed in as the QA member");
  const state = await signInAsQa(browser, { base: BASE_URL });
  if (state) {
    const context = await qaContext(browser, state, { viewport: { width: 390, height: 844 } });
    const tab = await context.newPage();
    const status = await rendersWithoutTheError(tab, "/profile", "signed in");
    check("signed in: it answers 200", status === 200, [`${status}`]);
    check("signed in: the account hero rendered", (await tab.locator('[data-testid="account-hero"]').count()) === 1);
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
