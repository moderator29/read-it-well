/**
 * Nobody sees inside the platform without an account.
 *
 * Run this against a server started WITH Supabase configured, because the
 * middleware is a deliberate pass-through when it is not, and that is the trap
 * this spec exists to stop anybody falling into. Every other browser spec on
 * this platform runs in a sandbox that cannot reach Supabase, so every product
 * route renders signed-out there and the lock is invisible. Reading the source
 * and seeing a list of segments is not the same as watching a request bounce.
 *
 * The key does not have to be a real one. The middleware needs two things: the
 * public config to be present, so it arms itself, and `getUser()` to come back
 * without a user, which is exactly what an anonymous visitor produces.
 *
 *   NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co \
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=anything \
 *   npx next start -p 3211
 *   BASE_URL=http://localhost:3211 node apps/web/tests/gate.spec.mjs
 *
 * The two lists below are the whole product decision, written down. Adding a
 * route to the app and not to one of them makes this spec fail, which is the
 * point: a new screen has to be classified before it can ship.
 */

import { chromium } from "playwright-core";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3211";
const EXECUTABLE_PATH = "/opt/pw-browsers/chromium";
const APP = join(dirname(fileURLToPath(import.meta.url)), "../src/app");

let failures = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
    if (detail) for (const line of [].concat(detail).slice(0, 20)) console.log(`            ${line}`);
  }
}

/**
 * Open to anybody, and each one has a reason.
 *
 * The landing page and the documentation, because that is what the owner asked
 * for. The auth screens, because a lock with no door is a wall. Privacy and
 * terms, because a privacy policy nobody can read without an account is not a
 * privacy policy. Help and contact, because the person who most needs to reach
 * us is the one who cannot get in. The trust surfaces, because what happens to
 * somebody's money is not a thing to find out after committing to it. The
 * offline shell, because it is served when there is no network at all.
 */
const PUBLIC = [
  "/",
  "/docs",
  "/about",
  "/careers",
  "/contact",
  "/help",
  "/safety",
  "/standards",
  "/cancellations",
  "/privacy",
  "/terms",
  "/agents",
  "/offline",
  "/sign-in",
  "/sign-up",
  "/sign-up/email",
  "/sign-up/verify",
  "/sign-in/email",
  /* Where every confirmation link lands. It MUST be reachable without a
     session: a session is the thing it is about to create. */
  "/auth/callback",
  "/forgot-password",
  "/reset-password",
];

/** Inside. Every one of these must bounce an anonymous visitor to sign-in. */
const PRODUCT = [
  "/home",
  "/search",
  "/search?view=map",
  "/listing/anything",
  "/saved",
  "/messages",
  "/notifications",
  "/profile",
  "/settings",
  "/wallet",
  "/bookings",
  "/checkout/anything",
  "/rent",
  "/assistant",
  "/around",
  "/u",
  "/u/somebody",
  "/post/anything",
  "/stories",
  "/legal/privacy",
  "/legal/terms",
  "/welcome",
  "/admin",
  "/admin/support",
  "/agent/dashboard",
  "/agent/listings",
  "/agent/bookings",
  "/agents/apply",
  "/agents/status",
  "/styleguide",
];

const browser = await chromium.launch({ executablePath: EXECUTABLE_PATH });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });

try {
  /* If the gate is not armed the whole run is meaningless, so it is the first
     thing checked and it stops rather than reporting thirty false passes. */
  const probe = await context.request.get(`${BASE_URL}/home`, { maxRedirects: 0 });
  if (probe.status() !== 307 && probe.status() !== 302) {
    console.log("\n  ABORTED: /home did not redirect, so the middleware is not armed.");
    console.log("  Start the server with NEXT_PUBLIC_SUPABASE_URL and");
    console.log("  NEXT_PUBLIC_SUPABASE_ANON_KEY set. Without them the guard is a");
    console.log("  pass-through by design and this spec proves nothing.");
    await browser.close();
    process.exit(1);
  }

  console.log("\nThe product, signed out");
  const leaked = [];
  for (const path of PRODUCT) {
    const res = await context.request.get(BASE_URL + path, { maxRedirects: 0 });
    const location = res.headers()["location"] ?? "";
    const bounced = (res.status() === 307 || res.status() === 302) && location.includes("/sign-in");
    if (!bounced) leaked.push(`${path} answered ${res.status()} ${location}`);
  }
  check(`all ${PRODUCT.length} product routes bounce to sign-in`, leaked.length === 0, leaked);

  console.log("\nThe way back in");
  const back = await context.request.get(`${BASE_URL}/listing/lekki`, { maxRedirects: 0 });
  const target = back.headers()["location"] ?? "";
  check(
    "the address somebody wanted is carried on the redirect",
    target.includes("next=%2Flisting%2Flekki"),
    [target],
  );
  check("and the reason is stated", target.includes("notice=sign-in-required"), [target]);

  console.log("\nThe public site, signed out");
  const blocked = [];
  for (const path of PUBLIC) {
    const res = await context.request.get(BASE_URL + path, { maxRedirects: 0 });
    const location = res.headers()["location"] ?? "";
    if (location.includes("/sign-in")) blocked.push(`${path} was sent to sign-in`);
    if (res.status() >= 500) blocked.push(`${path} answered ${res.status()}`);
  }
  check(`all ${PUBLIC.length} public routes stay open`, blocked.length === 0, blocked);

  /* ------------------------------------------- nothing is left unclassified */

  /*
   * Every route in the app is in one of the two lists above.
   *
   * This is the check that survives the next person. A screen added without a
   * decision about who may see it is the way a product quietly reopens, and
   * "we forgot" is how every one of those happens.
   */
  console.log("\nEvery route is classified");
  const segments = new Set();
  const walk = (dir, prefix = "") => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (!statSync(full).isDirectory()) continue;
      /* A route group in brackets is not a URL segment. */
      const next = entry.startsWith("(") ? prefix : `${prefix}/${entry}`;
      if (readdirSync(full).includes("page.tsx")) {
        segments.add((next.split("/")[1] ?? "").replace(/[[\]]/g, ""));
      }
      walk(full, next);
    }
  };
  walk(APP);
  segments.delete("");

  const known = new Set(
    [...PUBLIC, ...PRODUCT].map((p) => (p.split("?")[0] ?? "").split("/")[1] ?? ""),
  );
  const unclassified = [...segments].filter((s) => s.length > 0 && !known.has(s));
  check("no route segment is missing from both lists", unclassified.length === 0, unclassified);

  /* And the guard itself still exists in the shape this spec assumes. */
  const middleware = readFileSync(join(APP, "../middleware.ts"), "utf8");
  check(
    "the guard runs in middleware, not on the pages",
    /PRODUCT_SEGMENTS/.test(middleware) && /NextResponse\.redirect/.test(middleware),
  );
} finally {
  await context.close();
  await browser.close();
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
