/**
 * Less data, when the reader asks for it or the link cannot carry it.
 *
 * Item 37 of docs/POLISH_PASS.md, inbox item 246. Measured in bytes off the
 * wire, twice, with and without the signal, because the only honest unit for
 * this item is the number a reader is paying for.
 *
 * The number that made this urgent, measured before anything was changed, at
 * 390px, with an EMPTY catalogue and therefore not one listing photograph:
 * /home was 3,676KB, of which 3,520KB was imagery. Two raw files out of
 * /public are nearly all of it, `vallo-city.png` at 2,149KB and
 * `vallo-bg.png` at 1,343KB. That is background artwork, it is canonical, and
 * it stays. Whether somebody on a 2g link is sent three and a half megabytes
 * of scenery before they can read a price is a different question.
 *
 * Both halves of the signal are checked, and they are not the same mechanism:
 *
 *   The `Save-Data: on` header reaches the server before a byte is rendered.
 *   The connection reading reaches the client before first paint.
 *
 * Either way a background image on an element that is never painted is never
 * fetched, which is why this can be measured as bytes rather than as opacity.
 *
 * Run with the server already up:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/save-data.spec.mjs
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const EXECUTABLE_PATH = "/opt/pw-browsers/chromium";

/*
 * The heavy artwork this rule set exists for.
 *
 * IT IS EMPTY, AND THAT IS THE CURRENT TRUTH RATHER THAN A DISABLED TEST.
 * This was `["vallo-city.png", "vallo-bg.png"]`, 2,149KB and 1,343KB, fetched
 * on every page. Both were RentMe-era renders and both were deleted with the
 * rest of that art set on 15 September 2026, so the spec was asserting that two
 * files which no longer exist are served.
 *
 * The data-saver rules are deliberately kept, because supplied artwork is
 * coming back into the same slots and this is what stops it being sent to
 * somebody on a 2g link before they can read a price. **Put the filenames back
 * in this array when that artwork lands** and the assertions below start
 * meaning something again.
 *
 * Until then the checks that depend on heavy artwork are skipped explicitly and
 * announced, rather than passing vacuously or being deleted. A test that quietly
 * asserts nothing is worse than one that says it is waiting.
 */
const HEAVY = [];

let failures = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
    if (detail) for (const line of [].concat(detail).slice(0, 10)) console.log(`            ${line}`);
  }
}

const browser = await chromium.launch({ executablePath: EXECUTABLE_PATH });

/**
 * Load a route and weigh what came down.
 *
 * `signal` is "header" for the Chromium data-saver header, "connection" for a
 * browser reporting a 2g link, or null for an ordinary visit.
 */
async function weigh(route, signal) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: "dark",
    ...(signal === "header" ? { extraHTTPHeaders: { "Save-Data": "on" } } : {}),
  });
  if (signal === "connection") {
    /* What a phone on a 2g link reports. The real object is read-only and
       partly absent in a desktop Chromium, so it is defined outright. */
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "connection", {
        configurable: true,
        value: { saveData: false, effectiveType: "2g", rtt: 1400, downlink: 0.1 },
      });
    });
  }
  const page = await context.newPage();

  let imageBytes = 0;
  const heavy = [];
  page.on("response", (res) => {
    const url = res.url();
    if (res.request().resourceType() === "image") {
      imageBytes += Number(res.headers()["content-length"] ?? 0);
    }
    for (const name of HEAVY) if (url.includes(name)) heavy.push(name);
  });

  await page.goto(BASE_URL + route, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1200);

  const flag = await page.evaluate(() => document.documentElement.dataset.saveData ?? null);
  const motion = await page.evaluate(() => {
    const el = document.querySelector(".nf-ambient");
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      artwork: cs.backgroundImage,
      blooms: [...el.querySelectorAll("span")].every((s) => getComputedStyle(s).display === "none"),
      grain: document.querySelector(".nf-grain")
        ? getComputedStyle(document.querySelector(".nf-grain")).display
        : "absent",
    };
  });

  await context.close();
  return { imageBytes, heavy: [...new Set(heavy)], flag, motion };
}

try {
  console.log("\nAn ordinary visit to /home");
  const plain = await weigh("/home", null);
  check("the flag is not set", plain.flag === null, [`data-save-data: ${plain.flag}`]);
  if (HEAVY.length === 0) {
    console.log("  skipped the artwork checks: no heavy artwork ships today. See HEAVY above.");
  } else {
    check(
      "the artwork is served, because this is the designed product",
      plain.heavy.length === HEAVY.length,
      [`fetched: ${plain.heavy.join(", ") || "nothing"}`],
    );
  }
  console.log(`          ${Math.round(plain.imageBytes / 1024)}KB of imagery`);

  for (const [signal, label] of [
    ["header", "Save-Data: on, the header a Chromium browser sends"],
    ["connection", "navigator.connection reporting a 2g link"],
  ]) {
    console.log(`\n${label}`);
    const light = await weigh("/home", signal);

    check("the flag is set", light.flag === "on", [`data-save-data: ${light.flag}`]);
    check("neither heavy artwork is fetched at all", light.heavy.length === 0, [
      `fetched: ${light.heavy.join(", ")}`,
    ]);
    check("the canvas paints no background image", light.motion?.artwork === "none", [
      `background-image: ${light.motion?.artwork}`,
    ]);
    check("the drifting blooms are gone", light.motion?.blooms === true);
    check("the film grain is gone", light.motion?.grain === "none", [
      `.nf-grain display: ${light.motion?.grain}`,
    ]);

    const saved = plain.imageBytes - light.imageBytes;
    check(
      "the page is dramatically lighter, not marginally",
      light.imageBytes < plain.imageBytes * 0.2,
      [
        `${Math.round(plain.imageBytes / 1024)}KB to ${Math.round(light.imageBytes / 1024)}KB`,
      ],
    );
    console.log(
      `          ${Math.round(light.imageBytes / 1024)}KB of imagery, ${Math.round(saved / 1024)}KB saved`,
    );
  }

  /*
   * The product is still the product. A lighter render, not a lesser one: the
   * screen still has its heading, its city, its actions and its colour.
   */
  console.log("\nStill the product");
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: "dark",
    extraHTTPHeaders: { "Save-Data": "on" },
  });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/home`, { waitUntil: "load", timeout: 45000 });
  await page.waitForTimeout(900);
  const intact = await page.evaluate(() => {
    const canvas = getComputedStyle(document.body).backgroundColor;
    return {
      headings: document.querySelectorAll("h1, h2").length,
      links: document.querySelectorAll("main a[href]").length,
      dock: document.querySelector(".nf-dockrow") !== null,
      canvas,
      transparent: canvas === "rgba(0, 0, 0, 0)",
    };
  });
  check("the headings are all still there", intact.headings >= 2, [`${intact.headings} found`]);
  check("so is everything you can go to", intact.links >= 8, [`${intact.links} links`]);
  check("and the navigation", intact.dock === true);
  await context.close();
} finally {
  await browser.close();
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
