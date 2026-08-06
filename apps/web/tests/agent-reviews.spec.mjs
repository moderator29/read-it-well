/**
 * The host reviews console, and the answer a host can now give.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/agent-reviews.spec.mjs
 *
 * Guests could review a completed stay, the rating went onto the public listing
 * page, and the host had no way to answer it anywhere on the platform.
 * /agent/reviews was an eleven-line coming-soon stub, and the new-review
 * notification sent the host to the public listing page, which is the one place
 * they could do nothing about it.
 *
 * The write path is public.review_responses: one answer per review, owned by
 * the agent whose listing was reviewed, with the review itself still final. The
 * RLS behind it is proven against live Postgres rather than through a browser
 * (a stranger's insert refused 42501, agent_id stamped from the caller and not
 * from the payload, the guest notified by trigger, anon able to read the
 * answer, the review still unwritable). This spec covers the half a browser
 * can: the route is real, it is reachable, and it renders in both themes at
 * 390px.
 *
 * This sandbox has no route to the Supabase host, so nobody is an approved
 * agent here and the console renders its signed-out pitch.
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const WAIT = 1200;

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

async function run(theme) {
  const context = await browser.newContext({
    colorScheme: theme,
    viewport: { width: 390, height: 844 },
  });
  await context.addInitScript((t) => {
    try {
      window.localStorage.setItem("nf_theme", t);
    } catch (e) {
      void e;
    }
  }, theme);
  const page = await context.newPage();

  const serverErrors = [];
  page.on("response", (r) => {
    if (r.status() >= 500 && !r.url().includes("/_next/image")) {
      serverErrors.push(`${r.status()} ${r.url()}`);
    }
  });

  try {
    for (const path of ["/agent/reviews", "/agent/reviews?filter=all"]) {
      console.log(`\n[${theme}] ${path}`);
      await page.goto(`${BASE_URL}${path}`, { waitUntil: "load" });
      await page.waitForTimeout(WAIT);

      const appliedTheme = await page.evaluate(
        () => document.documentElement.dataset.theme ?? "dark",
      );
      check(
        `the ${theme} theme actually applied`,
        appliedTheme === (theme === "light" ? "light" : "dark"),
      );

      const text = await page.locator("body").innerText();
      check("the route renders", text.trim().length > 0);
      check("no route returned a server error", serverErrors.length === 0);
      if (serverErrors.length > 0) console.log("   ", serverErrors.join("\n    "));

      check(
        "the route is not a coming-soon placeholder",
        !/coming soon|being built|not ready yet/i.test(text),
      );
      check("the surface offers a way onward", (await page.locator("a[href]").count()) > 0);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      check(`no horizontal scroll at 390px (${overflow}px)`, overflow <= 1);
    }
  } finally {
    await context.close();
  }
}

try {
  await run("dark");
  await run("light");
} finally {
  await browser.close();
}

if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
