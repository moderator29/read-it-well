/**
 * C16. THE HOST WORKSPACE ANSWERS, on the pattern of the agent specs.
 *
 * Every host route answers a designed state and offers a way back:
 *   0. signed out, each gated route redirects to /sign-in with `next` and the
 *      notice (the proxy's wall); /host/apply draws its own signed-out door;
 *   1. through the preview harness (`/preview/f5/host-landing`), the host
 *      desk draws a heading, a main landmark and no sideways scroll at 390;
 *   2. signed in as the QA member (not a host), each route answers a page,
 *      never a 500, with at least one link out, and no sideways scroll. Needs
 *      QA_MEMBER_EMAIL / QA_MEMBER_PASSWORD; SKIP without them.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/host.spec.mjs
 */
import { chromium } from "playwright-core";
import { existsSync } from "node:fs";
import { expectSignInWall, openPreview, overflowOf, qaContext, signInAsQa, skip } from "./_gate.mjs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const EXECUTABLE = process.env.CHROMIUM_PATH ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);

export const HOST_ROUTES = [
  "/host",
  "/host/arrival",
  "/host/assistant",
  "/host/bookings",
  "/host/calendar",
  "/host/decide",
  "/host/earnings",
  "/host/earnings/statement",
  "/host/notifications",
  "/host/photos",
  "/host/reservations",
  "/host/reviews",
  "/host/rooms",
  "/host/settings",
  "/host/start",
  "/host/transfer",
];

const failures = [];
function check(label, condition) {
  console.log(`  ${condition ? "ok  " : "FAIL"}  ${label}`);
  if (!condition) failures.push(label);
}

const browser = await chromium.launch({ executablePath: EXECUTABLE });
try {
  console.log("signed out");
  /* The wall is the proxy's, and the proxy lets everything through when the
     build has no Supabase anon key (isSupabaseConfigured). A CI run without
     the NEXT_PUBLIC_SUPABASE_ANON_KEY repository variable has no wall to
     test, so it says so instead of reporting a wall that cannot exist. */
  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    for (const route of HOST_ROUTES) await expectSignInWall(check, route);
  } else {
    skip("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set, so the proxy has no sign-in wall to test");
  }
  const apply = await fetch(`${BASE_URL}/host/apply`, { redirect: "manual" });
  check(`signed out, /host/apply answers its own door (${apply.status})`, apply.status === 200 || apply.status === 307);

  console.log("host desk (preview harness)");
  const context = await browser.newContext({ colorScheme: "dark", viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  if (await openPreview(page, "/preview/f5/host-landing", check)) {
    check("a main landmark", (await page.locator("main, [role=main]").count()) > 0);
    check("a heading", (await page.locator("h1, h2").count()) > 0);
    check("no sideways scroll at 390", (await overflowOf(page)) <= 1);
  }
  await context.close();

  console.log("signed in as the QA member");
  const state = await signInAsQa(browser);
  if (state) {
    const ctx = await qaContext(browser, state);
    const p = await ctx.newPage();
    for (const route of HOST_ROUTES) {
      const res = await p.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded", timeout: 90_000 }).catch(() => null);
      const status = res?.status() ?? 0;
      await p.waitForTimeout(600);
      check(`${route} answers a page, not a server error (${status})`, status > 0 && status < 500);
      check(`${route} offers a way back (a link out)`, (await p.locator("a[href]").count()) > 0);
      check(`${route} does not scroll sideways at 390`, (await overflowOf(p)) <= 1);
    }
    await ctx.close();
  } else {
    skip("signed-in host routes");
  }
} finally {
  await browser.close();
}

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s)`);
  process.exit(1);
}
console.log("\nhost: every route answers.");
