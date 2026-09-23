// Lead verification harness: screenshot routes at the canonical phone frame.
//
// Usage: node scripts/verify-shots.mjs [--light] [--base http://localhost:3210] route [route...]
// Writes PNGs to scripts/.shots/<route-slug>-<dark|light>.png at 390x844.
// Chromium lives at /opt/pw-browsers/chromium in this environment; dark is the
// platform default so dark shots are the default here too.
//
// Why this writes localStorage rather than only setting Playwright's
// colorScheme: this product deliberately ignores the operating system. The
// before-paint script in app/layout.tsx moves the theme only for an explicit
// stored choice ("light", or "system" when the OS agrees), so a browser context
// created with colorScheme "light" and nothing in storage renders DARK.
//
// That is not hypothetical. Every `--light` shot taken before this fix came back
// byte-identical to its dark twin, which means the "look at it in both themes"
// ritual had been checking dark twice for everyone since the theme default
// changed. The assertion below is the part that matters: the harness now refuses
// to write a file it cannot prove is the theme that was asked for, so this can
// never fail silently again.

import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const light = args.includes("--light");
const baseIdx = args.indexOf("--base");
const base = baseIdx >= 0 ? args[baseIdx + 1] : "http://localhost:3210";
const routes = args.filter(
  (a, i) => !a.startsWith("--") && (baseIdx < 0 || i !== baseIdx + 1),
);

if (routes.length === 0) {
  console.error("No routes given.");
  process.exit(1);
}

const theme = light ? "light" : "dark";

// Resolved from this file, never from the caller's cwd. Running the harness from
// apps/web (which is where the specs are served from, so it is the natural place
// to run it) used to create a second, untracked apps/web/scripts/.shots that the
// root .gitignore does not cover, and those PNGs then showed up as changes to
// commit. One output directory, wherever you run this from.
const outDir = join(dirname(fileURLToPath(import.meta.url)), ".shots");
mkdirSync(outDir, { recursive: true });

/*
 * THE BLUR FLAGS, AND WHY THIS HARNESS WAS LYING TO EVERY WORKER.
 *
 * Headless Chromium in this container has no GPU, and `backdrop-filter` is
 * silently DROPPED rather than approximated: it does not warn, it does not
 * fall back, it simply paints nothing. Every `.nf-glass` surface in this
 * product is built on that property, so every proof this harness has ever
 * written showed the glass as a flat low-alpha wash with the page legible
 * straight through it. Workers judged glass depth, the dock capsule, the lit
 * edge and a pinned bar's separation from the page against pictures that did
 * not contain the material they were judging, and at least three phantom
 * faults ("text painted over text under a sticky bar") were nearly filed off
 * these files.
 *
 * SwiftShader is a software rasteriser, so the effect is composited on the
 * CPU and the shot is what a phone would actually draw. It costs seconds per
 * page and buys the only thing a proof is for.
 */
const LAUNCH_ARGS = ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"];

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: LAUNCH_ARGS,
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  colorScheme: theme,
  deviceScaleFactor: 2,
});

// Runs before any page script on every navigation, so the before-paint reader in
// app/layout.tsx sees the choice a real visitor would have stored by using the
// toggle. No flash, no OS dependency.
await context.addInitScript((choice) => {
  try {
    window.localStorage.setItem("nf_theme", choice);
  } catch {
    /* storage can be unavailable; the assertion below will catch the result */
  }
}, theme);

let failures = 0;

for (const route of routes) {
  const page = await context.newPage();
  const url = base + (route.startsWith("/") ? route : "/" + route);
  try {
    const response = await page.goto(url, { waitUntil: "load", timeout: 45000 });

    /*
     * THE FOURTH CHECK, AND IT IS THE MOST EMBARRASSING ONE IN THIS FILE.
     *
     * This harness never looked at the HTTP status. When the preview routes
     * were 404ing under `next start`, because the harness layout gated on
     * NODE_ENV and Turbopack inlines that at build time, it wrote four PNGs of
     * the 404 PAGE and reported them as verified shots. And it was right to,
     * by its own rules: the 404 page sets `data-theme` from the same inline
     * script, loads the same stylesheet, and has no `Reveal` bands to get
     * stuck, so all three assertions below pass on it perfectly. A worker
     * nearly filed those as proof that a surface had been swept.
     *
     * That is the fifth distinct way this machine has produced a confident
     * lie in one day, and it is the worst of them, because the other four
     * produced a shot that LOOKED wrong. This one produces a shot that looks
     * like a tidy empty screen.
     *
     * A status check is one line and it goes FIRST, before any assertion that
     * could be satisfied by an error page. Anything that is not a 2xx is not a
     * surface, whatever it renders.
     */
    const status = response?.status() ?? 0;
    if (status < 200 || status > 299) {
      console.error(
        `FAIL ${route}: the server answered ${status || "nothing"}, so this is an error page and not the surface. No file written.`,
      );
      failures += 1;
      await page.close();
      continue;
    }

    /*
     * AND THE STATUS CHECK ABOVE IS NOT ENOUGH, WHICH IS THE WHOLE TRAP.
     *
     * `notFound()` called from a layout during streaming answers HTTP 200 with
     * the not-found BODY. That was hit three times independently while the
     * preview harness was shut, and the runs between them wrote eight PNGs of the
     * "This page has checked out" screen. Every assertion in this file passed
     * on every one of them, because that page is a real page of ours: same
     * inline theme script, same stylesheet, no Reveal bands to get stuck.
     *
     * `app/not-found.tsx` carries `data-nf-not-found` for exactly this. An
     * attribute on the page rather than a class name sniffed from the outside,
     * because a class gets renamed by somebody who has never read this file.
     */
    const isNotFound = await page.evaluate(
      () => document.querySelector("[data-nf-not-found]") !== null,
    );
    if (isNotFound) {
      console.error(
        `FAIL ${route}: the server answered ${status} but served the not-found page. That is a route that does not exist, or a gate that refused, and it is not a surface. No file written.`,
      );
      failures += 1;
      await page.close();
      continue;
    }

    /*
     * THE FIFTH CHECK, AND IT IS THE FOURTH ONE'S TWIN.
     *
     * The status check above refuses an error page and the marker check
     * refuses a not-found body served on a 200. Neither of them looks at
     * WHERE THE BROWSER ENDED UP, and a redirect is neither of those things:
     * it is a 200, with a real page of ours, that is simply not the page that
     * was asked for.
     *
     * Measured on a production server at 6c621e3, with Supabase configured so
     * the gate in `proxy.ts` is live. Every product route answers 307 to
     * `/sign-in` for a visitor with no session. Asked for `/notifications`,
     * `/saved/searches`, `/profile/setup`, `/legal/privacy` and `/legal/terms`,
     * this harness followed all five redirects and wrote five PNGs of the SIGN
     * IN SCREEN under those five names. Every assertion in this file passed on
     * every one of them, because the sign-in screen is a real page of ours:
     * right theme, stylesheets loaded, no stuck Reveal band, 200, no
     * not-found marker. Three of them were byte identical to each other.
     *
     * That is the same failure as the 404 shots the check below this one
     * exists for, arriving by a different door, and it is worse in one way:
     * a picture of the sign-in screen looks like a screen somebody designed,
     * so it survives a human glance at the file as well as the machine's.
     *
     * A proof of a gated route needs a session. It cannot be taken by asking
     * politely and photographing the refusal.
     */
    const landed = new URL(page.url()).pathname.replace(/\/+$/, "") || "/";
    const asked = (route.startsWith("/") ? route : `/${route}`).split("?")[0].replace(/\/+$/, "") || "/";
    if (landed !== asked) {
      console.error(
        `FAIL ${route}: the server answered ${status} but the browser ended on ${landed}. That is a redirect, almost always the signed-in gate, and a picture of where you were sent is not a proof of where you asked to go. No file written.`,
      );
      failures += 1;
      await page.close();
      continue;
    }

    await page.waitForTimeout(2500);

    // Prove the shot is worth looking at before writing a file that claims it
    // is. Three more checks after the status one above, and every one of them
    // exists because it once let a useless screenshot
    // through and be treated as verification.
    const state = await page.evaluate(() => ({
      theme: document.documentElement.dataset.theme ?? "dark",
      // A stale server can serve a page whose stylesheet 404s from a build that
      // has been replaced underneath it. The screenshot then comes back
      // completely unstyled, and the theme assertion still passes because the
      // attribute is set by an inline script that needs no CSS at all. Two
      // light shots went through exactly that way before this line existed.
      sheets: document.styleSheets.length,
      /*
       * A THIRD CHECK, EARNED THE HARD WAY.
       *
       * Everything below the fold in this product is wrapped in `Reveal`,
       * which fades a block in from an IntersectionObserver in an effect. An
       * effect only runs once React has hydrated, and hydration has failed
       * silently on this machine three separate ways in one day: no
       * `backdrop-filter` without SwiftShader, a Content Security Policy that
       * refused the dev server's own script chunks, and a scroll prime that
       * did nothing because the page sets smooth scrolling and a smooth scroll
       * is an animation that never advances without a compositor.
       *
       * Every one produced the same picture, so two fixes went in before
       * anybody found the third. This harness shoots the viewport only, so a
       * band below the fold is not its problem, but a band ON SCREEN sitting
       * at opacity zero means hydration has not finished and the shot is of a
       * page nobody will ever see. It is counted here rather than reasoned
       * about, because reasoning about it is what cost the day.
       */
      stuckReveals: Array.from(document.querySelectorAll(".nf-reveal")).filter((el) => {
        const box = el.getBoundingClientRect();
        const onScreen = box.top < window.innerHeight && box.bottom > 0;
        return onScreen && Number(getComputedStyle(el).opacity) < 0.5;
      }).length,
    }));

    if (state.theme !== theme) {
      failures += 1;
      console.error(
        `FAILED ${route}: asked for ${theme}, the page rendered ${state.theme}. No file written.`,
      );
      continue;
    }
    if (state.sheets === 0) {
      failures += 1;
      console.error(
        `FAILED ${route}: the page loaded no stylesheet, so the shot would be unstyled. Usually a server running against a build that has been replaced. No file written.`,
      );
      continue;
    }
    if (state.stuckReveals > 0) {
      failures += 1;
      console.error(
        `FAILED ${route}: ${state.stuckReveals} Reveal band(s) are on screen and still invisible, so React has not hydrated and this shot is of a page nobody meets. No file written.`,
      );
      continue;
    }

    const slug = route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "root";
    const file = join(outDir, `${slug}-${theme}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log("shot", route, `(${theme})`, "->", file);
  } catch (err) {
    failures += 1;
    console.error("FAILED", route, String(err).split("\n")[0]);
  } finally {
    await page.close();
  }
}

await browser.close();

if (failures > 0) {
  console.error(`${failures} route(s) produced no screenshot.`);
  process.exit(1);
}
