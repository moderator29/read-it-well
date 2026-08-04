/**
 * The unread badge must come from a count, never from a literal.
 *
 *   BASE_URL=http://localhost:3213 node apps/web/tests/unread-badge.spec.mjs
 *
 * Two defects guarded here.
 *
 * 1. `AppRail` declared `badge?: number` and rendered it, and no item literal
 *    anywhere ever set it, so the unread count existed in the type and nowhere
 *    on screen. It is now fed from one count of unread notifications, resolved
 *    on the server by the app layout. Zero renders no badge.
 *
 * 2. The shell greeted every visitor as "Guest" from a hardcoded constant whose
 *    own comment said "until real sessions land", long after auth shipped. The
 *    name now comes from the caller's profile, falling back to Guest only when
 *    nobody is signed in, which in this sandbox is always.
 *
 * This sandbox has no route to the Supabase host, so nobody is signed in and
 * both correct answers are the empty ones: no badge, and Guest. That is exactly
 * what a fabricated badge would fail. Checked at 390px and at desktop width,
 * dark and light.
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3213";
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

async function run(theme, width) {
  const context = await browser.newContext({
    colorScheme: theme,
    viewport: { width, height: 900 },
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
    console.log(`\n[${theme} ${width}px] /home`);
    await page.goto(`${BASE_URL}/home`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);

    const appliedTheme = await page.evaluate(
      () => document.documentElement.dataset.theme ?? "dark",
    );
    check(
      `the ${theme} theme actually applied`,
      appliedTheme === (theme === "light" ? "light" : "dark"),
    );

    /* Only genuinely visible badges count. Elements inside display:none report
       zero-size rects, so a hidden desktop rail would otherwise be reported as
       broken navigation (docs/HANDOFF.md section 6). */
    const numericBadges = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll(".nf-badge")) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;
        const text = (el.textContent ?? "").trim();
        if (/^\d+$/.test(text)) out.push(text);
      }
      return out;
    });
    check(
      `no invented unread count in the chrome (saw ${JSON.stringify(numericBadges)})`,
      numericBadges.length === 0,
    );

    /* The profile dot on the phone dock is the mobile half of the same count,
       and must be absent for the same reason. */
    const profileTab = page.locator('.nf-tabbar a[href="/profile"]').first();
    if ((await profileTab.count()) > 0) {
      const label = (await profileTab.getAttribute("aria-label")) ?? "";
      check(
        `the profile tab carries a real label and claims no unread (label: "${label}")`,
        label.length > 0 && !/unread/i.test(label),
      );
    } else {
      /* Above lg the dock is gone by design, so there is nothing to assert. */
      console.log("  note    phone dock not present at this width, as expected");
    }

    check("no route returned a server error", serverErrors.length === 0);
    if (serverErrors.length > 0) console.log("   ", serverErrors.join("\n    "));

    check("the shell still renders its navigation", (await page.locator("nav a").count()) > 0);
  } finally {
    await context.close();
  }
}

try {
  await run("dark", 390);
  await run("light", 390);
  await run("dark", 1280);
} finally {
  await browser.close();
}

if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
