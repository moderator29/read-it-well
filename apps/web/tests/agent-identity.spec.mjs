/**
 * No workspace invents a person.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/agent-identity.spec.mjs
 *
 * DEAD_ENDS M10. Every agent route rendered its identity card from a seed
 * object called "Demo Agent": status APPROVED, verified true, reference
 * NF-AGT-00042. So a stranger who opened one of the ten agent destinations was
 * addressed by name as an approved, verified agent, and `/agents/status`
 * showed them an approved application carrying a reference number support
 * would then be asked about. That is two owner rules broken on one screen:
 * rule 13 puts the word "demo" out of bounds in UI copy outright, and rule 22
 * says every state is designed, including the signed-out one.
 *
 * The trap in fixing it is swinging the lie the other way. A card that used to
 * invent a name must not now render an empty one, and a workspace opened by a
 * genuinely signed-in agent must not tell them they are not signed in. So this
 * checks both directions: the fabricated identity is gone from every surface,
 * AND what replaced it is a designed absence with a way in, not a blank.
 *
 * WHAT CHANGED ON 23 SEPTEMBER. A stranger can no longer open any agent
 * route: the proxy sends each one to the sign-in door (`src/proxy.ts`), so
 * the visitor state this spec used to read no longer exists. Whoever reaches
 * an `/agent` route IS signed in, and a member with no agent profile is now
 * told "You are not listing yet" with "Apply to list" to `/profile/setup`
 * (`components/agent/agent-doors.ts`, UX-11), not "Not signed in as an agent".
 * So the spec now reads three things:
 *
 *   signed out    every agent route, and `/agents/status` (now a redirect to
 *                 `/profile/application`), answers the wall;
 *   preview       the same ten destinations in the preview harness
 *                 (`/preview/f5/agent-*`), which render the real AgentShell
 *                 and pages with a fixture agent: no fabricated identity, no
 *                 forbidden word, the identity card on screen in the drawer,
 *                 and Back from a deep link stays inside the app;
 *   signed in     as the QA member (who is not an agent), the real routes:
 *                 no fabrication, no claimed verified standing, and the card
 *                 states the absence with the way in. Needs QA_MEMBER_EMAIL /
 *                 QA_MEMBER_PASSWORD; SKIP without them.
 */

import { chromium } from "playwright-core";
import { expectSignInWall, openPreview, qaContext, signInAsQa } from "./_gate.mjs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const WAIT = 1300;

/** Every agent destination that renders the workspace chrome. */
const AGENT_ROUTES = [
  "/agent/dashboard",
  "/agent/analytics",
  "/agent/verification",
  "/agent/bookings",
  "/agent/messages",
  "/agent/reviews",
  "/agent/earnings",
  "/agent/settings",
  "/agent/listings",
  "/agent/list",
];

/** Words that must never appear in UI copy. Owner rule 13. */
const FORBIDDEN = /\b(demo|sample|preview|not live)\b/i;

/** The fabricated identity, in every form it took. */
const FABRICATION = /Demo Agent|NF-AGT-00042/i;

let failures = 0;
function check(name, condition) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
  }
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

/** `/agent/<x>` has its harness twin at `/preview/f5/agent-<x>`. */
const previewOf = (route) => `/preview/f5/agent-${route.split("/")[2]}`;

async function themed(colorScheme, state) {
  const options = { colorScheme, viewport: { width: 390, height: 844 } };
  const context = state ? await qaContext(browser, state, options) : await browser.newContext(options);
  await context.addInitScript((mode) => {
    try {
      window.localStorage.setItem("nf_theme", mode);
    } catch {
      /* storage unavailable, the page falls back to the dark default */
    }
  }, colorScheme === "light" ? "light" : "dark");
  return context;
}

async function readBody(page, path) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "load" });
  await page.waitForTimeout(WAIT);
  return (await page.locator("body").innerText()).replace(/\s+/g, " ");
}

/** Open the drawer by its label (not "the first header button", which is Back). */
async function openDrawer(page) {
  await page.locator('header button[aria-label="Open menu"]').click();
  await page.waitForTimeout(700);
}

async function walkPreview(colorScheme) {
  console.log(`\n================ preview, ${colorScheme} ================`);
  const context = await themed(colorScheme, null);
  const page = await context.newPage();
  try {
    if (!(await openPreview(page, previewOf("/agent/dashboard"), check))) return;
    for (const route of AGENT_ROUTES) {
      const path = previewOf(route);
      const body = await readBody(page, path);
      check(`${path} names no fabricated agent`, !FABRICATION.test(body));
      check(`${path} uses no forbidden word`, !FORBIDDEN.test(body));
    }

    await page.goto(`${BASE_URL}${previewOf("/agent/dashboard")}`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    await openDrawer(page);
    const dialog = page.locator('[role="dialog"]').first();
    check("the drawer is actually on screen", await dialog.isVisible());
    const drawer = (await dialog.innerText()).replace(/\s+/g, " ");
    check("the identity card names the fixture agent, not an invented one", /Tunde Adebayo/.test(drawer));
    check("it still names nobody fabricated", !FABRICATION.test(drawer));

    // The way back must never land on a blank page. Opened in a fresh tab
    // there is nothing of ours behind this route, so Back has to fall through
    // to the app rather than call history.back() into whatever came before.
    const fresh = await context.newPage();
    await fresh.goto(`${BASE_URL}${previewOf("/agent/dashboard")}`, { waitUntil: "load" });
    await fresh.waitForTimeout(WAIT);
    await fresh.locator('header button[aria-label="Back"]').click();
    await fresh.waitForTimeout(1200);
    check(
      `Back from a deep link stays inside the app (${fresh.url().replace(BASE_URL, "")})`,
      fresh.url().startsWith(BASE_URL),
    );
    check("no horizontal overflow at 390px", await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  } catch (error) {
    failures += 1;
    console.log(`  FAILED  threw: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await context.close();
  }
}

async function walkSignedIn(colorScheme, state) {
  console.log(`\n================ signed in (QA member), ${colorScheme} ================`);
  const context = await themed(colorScheme, state);
  const page = await context.newPage();
  try {
    for (const route of AGENT_ROUTES) {
      const body = await readBody(page, route);
      check(`${route} names no fabricated agent`, !FABRICATION.test(body));
      check(`${route} uses no forbidden word`, !FORBIDDEN.test(body));
      check(`${route} claims no verified standing for a member who is not an agent`, !/Verified Agent/i.test(body));
    }
    await page.goto(`${BASE_URL}/agent/dashboard`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    await openDrawer(page);
    const card = page.locator('[role="dialog"]').locator("text=You are not listing yet").first();
    check("the identity card is actually on screen", await card.isVisible());
    const drawer = (await page.locator('[role="dialog"]').first().innerText()).replace(/\s+/g, " ");
    check("it offers the way in", /Apply to list/i.test(drawer));
    check(
      "the way in is the workspace chooser",
      (await page.locator('[role="dialog"] a[href="/profile/setup"]').count()) > 0,
    );
    check("it still names nobody", !FABRICATION.test(drawer));
  } catch (error) {
    failures += 1;
    console.log(`  FAILED  threw: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await context.close();
  }
}

// ---------------------------------------------------------------- signed out
console.log("signed out");
for (const route of AGENT_ROUTES) await expectSignInWall(check, route);
{
  const res = await fetch(`${BASE_URL}/agents/status`, { redirect: "manual" });
  const to = new URL(res.headers.get("location") ?? "/", BASE_URL).pathname;
  check(`/agents/status now forwards to /profile/application (${res.status} ${to})`, res.status >= 300 && res.status < 400 && to === "/profile/application");
  await expectSignInWall(check, "/profile/application");
}

await walkPreview("dark");
await walkPreview("light");

const state = await signInAsQa(browser);
if (state) {
  await walkSignedIn("dark", state);
  await walkSignedIn("light", state);
}
await browser.close();

console.log(
  failures === 0
    ? "\nagent identity: all checks passed"
    : `\nagent identity: ${failures} failed`,
);
process.exit(failures === 0 ? 0 : 1);
