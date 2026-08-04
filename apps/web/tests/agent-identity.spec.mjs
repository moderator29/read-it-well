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
 * This sandbox cannot reach the Supabase host, so every route here resolves to
 * the visitor state, which is exactly the state that used to lie. The
 * signed-in half is held by the type system rather than by this script:
 * `AgentProfile | null` reaches the card from all ten pages, so a page that
 * forgot to pass the real agent could not compile away the distinction.
 */

import { chromium } from "playwright-core";

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

async function walk(colorScheme) {
  console.log(`\n================ ${colorScheme} ================`);
  const context = await browser.newContext({
    colorScheme,
    viewport: { width: 390, height: 844 },
  });
  await context.addInitScript((mode) => {
    try {
      window.localStorage.setItem("nf_theme", mode);
    } catch {
      /* storage unavailable, the page falls back to the dark default */
    }
  }, colorScheme === "light" ? "light" : "dark");

  const page = await context.newPage();

  try {
    // ------------------------------------------- the ten agent destinations
    for (const route of AGENT_ROUTES) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: "load" });
      await page.waitForTimeout(WAIT);
      const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
      check(`${route} names no fabricated agent`, !FABRICATION.test(body));
      check(`${route} uses no forbidden word`, !FORBIDDEN.test(body));
      check(
        `${route} claims no verified standing for a visitor`,
        !/Verified Agent/i.test(body),
      );
    }

    // The identity card is behind the drawer at phone width, so open it once
    // and read what it actually says about who is here.
    await page.goto(`${BASE_URL}/agent/dashboard`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    const drawerOpener = page.locator("header button").first();
    await drawerOpener.click();
    await page.waitForTimeout(600);
    const drawer = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    check("the identity card states the absence plainly", /Not signed in as an agent/i.test(drawer));
    check("it offers the way in", /Sign in/i.test(drawer));
    check("it still names nobody", !FABRICATION.test(drawer));
    check(
      "the absence is a sentence, not an empty line",
      !/Not signed in as an agent\s*Verified/i.test(drawer),
    );

    // -------------------------------------------------- /agents/status
    await page.goto(`${BASE_URL}/agents/status`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    const status = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    check("the status page invents no application", !FABRICATION.test(status));
    check("it does not tell a stranger they are approved", !/\bApproved\b/.test(status));
    check("it uses no forbidden word", !FORBIDDEN.test(status));
    check(
      "it says what is actually true and offers a way on",
      /not open here yet|Sign in to see your application|No application on file/i.test(status),
    );
    const onward = await page.locator('main a[href="/sign-in"], main a[href="/agents/apply"], main a[href="/home"]').count();
    check("the state is not a dead end", onward > 0);

    check(
      "no horizontal overflow at 390px",
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    );
  } catch (error) {
    failures += 1;
    console.log(`  FAILED  threw: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await context.close();
  }
}

await walk("dark");
await walk("light");
await browser.close();

console.log(
  failures === 0
    ? "\nagent identity: all checks passed"
    : `\nagent identity: ${failures} failed`,
);
process.exit(failures === 0 ? 0 : 1);
