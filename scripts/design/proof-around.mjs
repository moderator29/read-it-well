/*
 * `/around` IS THE FEED, AND IT HAD NO PROOF AT ALL.
 *
 * `GOVERNING-feed-plus-bloom.png` draws the location chip, the story rings, the
 * For you / Following capsule, the cards and the plus that blooms.
 * `around/page.tsx` names that image in its own first docblock. The sweep
 * register assigned it to `/u/[handle]` instead, which is a person's profile
 * and draws none of those five things, so F4's flagship deliverable was
 * credited to a page it does not govern and `/around` was never shot.
 *
 * FOUR GUARDS, each paid for by a real failure on this build: the HTTP status,
 * WHERE THE BROWSER LANDED (verify-shots.mjs once wrote five PNGs of the
 * sign-in screen under five other route names), the `[data-nf-not-found]`
 * marker (a layout notFound() answers 200 with the not-found body), and
 * `behavior: "instant"` on the scroll (a smooth scroll never advances without
 * a compositor).
 *
 * AND IT SAYS WHAT IT CANNOT SHOW. The five anatomy parts are asked for by
 * selector and reported present or absent, so a picture of an empty feed is not
 * filed as a picture of the feed.
 */
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.PROOF_BASE ?? "http://127.0.0.1:3971";
const OUT = process.env.PROOF_OUT ?? "docs/design/proofs/prove";
const ROUTE = "/around";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
});

const results = {};
for (const [name, viewport, theme] of [
  ["around-390-dark", { width: 390, height: 844 }, "dark"],
  ["around-390-light", { width: 390, height: 844 }, "light"],
  ["around-1536-dark", { width: 1536, height: 1024 }, "dark"],
]) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2, colorScheme: theme });
  await page.addInitScript((t) => {
    try {
      window.localStorage.setItem("nf_theme", t);
    } catch {
      /* the attribute below still lands */
    }
  }, theme);
  const response = await page.goto(`${BASE}${ROUTE}`, { waitUntil: "networkidle", timeout: 60_000 });
  const status = response?.status() ?? 0;
  if (status < 200 || status >= 300) throw new Error(`REFUSING ${name}: server answered ${status}`);
  const landed = new URL(page.url()).pathname.replace(/\/$/, "") || "/";
  if (landed !== ROUTE) throw new Error(`REFUSING ${name}: browser ended at ${landed}`);
  if (await page.locator("[data-nf-not-found]").count())
    throw new Error(`REFUSING ${name}: this is the not-found body served at 200`);
  await page.evaluate((t) => {
    if (t === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
  }, theme);
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
  await page.waitForTimeout(900);

  /* The governing image's five parts, asked for rather than assumed. */
  const anatomy = await page.evaluate(() => {
    const has = (sel) => document.querySelectorAll(sel).length;
    return {
      locationChip: has("[class*=location-chip], [class*=LocationChip], .nf-feed-place"),
      storyRings: has("[class*=story-ring], [class*=StoryRing]"),
      forYouFollowing: has(".nf-feed-seg__link, [class*=feed-seg]"),
      cards: has(".nf-post, [class*=post-card], article"),
      plusThatBlooms: has("[class*=fab], [class*=Fab]"),
      bodyChars: (document.body.innerText || "").replace(/\s+/g, " ").trim().length,
      firstWords: (document.body.innerText || "").replace(/\s+/g, " ").trim().slice(0, 120),
    };
  });
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });
  results[name] = { status, landed, ...anatomy };
  console.log(name, JSON.stringify(anatomy));
  await page.close();
}
await browser.close();
writeFileSync(join(OUT, "around-anatomy.json"), JSON.stringify(results, null, 2) + "\n");
